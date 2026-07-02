import { createFileRoute } from "@tanstack/react-router";
import * as cheerio from "cheerio";

type Leak = {
  title: string;
  teaser: string;
  severity: "High" | "Medium" | "Low";
  impact: string;
};

type Analysis = {
  score: number;
  leaks: Leak[];
};

const GENERIC_ERROR = "Analysis failed. Please try again.";
const FETCH_ERROR = "We couldn't access this website. Please check the URL and try again.";
const INVALID_URL = "Please enter a valid website URL.";
const RECOVERABLE_ERROR_STATUS = 422;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function normalizeUrl(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; AIRevenueAuditBot/1.0; +https://convertpilot.lovable.app)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) return null;
    // Cap payload to keep cheerio + worker CPU within limits (some sites
    // serve multi-MB HTML which can OOM/timeout the worker → CF 502).
    const reader = res.body?.getReader();
    if (!reader) return await res.text();
    const decoder = new TextDecoder();
    const MAX_BYTES = 512 * 1024;
    let received = 0;
    let html = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      html += decoder.decode(value, { stream: true });
      if (received >= MAX_BYTES) {
        try { await reader.cancel(); } catch { /* noop */ }
        break;
      }
    }
    html += decoder.decode();
    return html;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function extractSiteContent(html: string) {
  const $ = cheerio.load(html);
  const title = $("title").first().text().trim();
  const description = ($('meta[name="description"]').attr("content") ?? "").trim();

  const headings: string[] = [];
  $("h1, h2, h3").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t) headings.push(t);
  });

  const ctas = new Set<string>();
  $("button, a[role='button'], .btn, .button, [class*='cta']").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (t && t.length < 80) ctas.add(t);
  });
  $("a").each((_, el) => {
    const t = $(el).text().replace(/\s+/g, " ").trim();
    if (!t || t.length > 60) return;
    if (/(buy|get|start|try|sign|book|shop|order|subscribe|download|demo|free)/i.test(t)) {
      ctas.add(t);
    }
  });

  $("script, style, noscript, svg, nav, footer, header").remove();
  const bodyText = $("body")
    .text()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 6000);

  return {
    title: title.slice(0, 300),
    description: description.slice(0, 400),
    headings: headings.slice(0, 40),
    ctas: Array.from(ctas).slice(0, 30),
    bodyText,
  };
}

function buildPrompt(url: string, site: ReturnType<typeof extractSiteContent>, strict = false) {
  return `You are a brutally honest conversion-rate optimization expert auditing a website for revenue leaks.

Website URL: ${url}
Title: ${site.title || "(none)"}
Meta description: ${site.description || "(none)"}

Headings (in order):
${site.headings.map((h) => `- ${h}`).join("\n") || "(none)"}

CTAs / buttons:
${site.ctas.map((c) => `- ${c}`).join("\n") || "(none)"}

Visible body text (truncated):
${site.bodyText || "(none)"}

Return ONLY a valid JSON object${strict ? " with no prose, no markdown, no code fences" : ""}. It MUST match this exact TypeScript shape:

{
  "score": number,           // integer 0-100, honest Revenue Score
  "leaks": [                 // exactly 3 top revenue leaks, ordered by severity
    {
      "title": string,       // short, punchy (max 50 chars)
      "teaser": string,      // 1 sentence, specific to what you observed (max 180 chars)
      "severity": "High" | "Medium" | "Low",
      "impact": string       // estimated monthly $ range e.g. "~$8,400/mo"
    }
  ]
}

Be specific to the site's actual copy, CTAs, and structure. No generic advice. Output JSON only.`;
}

function tryParseJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function validateAnalysis(data: unknown): Analysis | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const score = Number(d.score);
  if (!Number.isFinite(score)) return null;
  const leaksRaw = d.leaks;
  if (!Array.isArray(leaksRaw) || leaksRaw.length === 0) return null;
  const leaks: Leak[] = [];
  for (const l of leaksRaw.slice(0, 3)) {
    if (!l || typeof l !== "object") return null;
    const li = l as Record<string, unknown>;
    const title = typeof li.title === "string" ? li.title.trim() : "";
    const teaser = typeof li.teaser === "string" ? li.teaser.trim() : "";
    const severityRaw = typeof li.severity === "string" ? li.severity : "";
    const impact = typeof li.impact === "string" ? li.impact.trim() : "";
    if (!title || !teaser || !impact) return null;
    const severity: Leak["severity"] =
      /high/i.test(severityRaw) ? "High" : /low/i.test(severityRaw) ? "Low" : "Medium";
    leaks.push({ title, teaser, severity, impact });
  }
  return { score: Math.max(0, Math.min(100, Math.round(score))), leaks };
}

async function callGemini(prompt: string, apiKey: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
          },
        }),
      },
    );
    if (!res.ok) {
      console.error("Gemini non-ok response", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return text || null;
  } catch (err) {
    console.error("Gemini fetch failed", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export const Route = createFileRoute("/api/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ error: INVALID_URL }, 400);
        }
        const url = normalizeUrl((body as { url?: unknown })?.url);
        if (!url) return json({ error: INVALID_URL }, 400);

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
          console.error("GEMINI_API_KEY not configured");
          return json({ error: GENERIC_ERROR }, RECOVERABLE_ERROR_STATUS);
        }

        const html = await fetchHtml(url);
        if (!html) return json({ error: FETCH_ERROR }, RECOVERABLE_ERROR_STATUS);

        let site: ReturnType<typeof extractSiteContent>;
        try {
          site = extractSiteContent(html);
        } catch (err) {
          console.error("extractSiteContent failed", err);
          return json({ error: FETCH_ERROR }, RECOVERABLE_ERROR_STATUS);
        }

        let text = await callGemini(buildPrompt(url, site, false), apiKey);
        let parsed = text ? validateAnalysis(tryParseJson(text)) : null;

        if (!parsed) {
          text = await callGemini(buildPrompt(url, site, true), apiKey);
          parsed = text ? validateAnalysis(tryParseJson(text)) : null;
        }

        if (!parsed) return json({ error: GENERIC_ERROR }, RECOVERABLE_ERROR_STATUS);

        return json(parsed satisfies Analysis, 200);
        } catch (err) {
          console.error("/api/analyze uncaught error", err);
          return json({ error: GENERIC_ERROR }, RECOVERABLE_ERROR_STATUS);
        }
      },
    },
  },
});