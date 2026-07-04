import { createFileRoute } from "@tanstack/react-router";
import { scrapeSite } from "../../lib/scraper";
import { analyzeWithGemini, type Analysis } from "../../lib/gemini";

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

        let site: Awaited<ReturnType<typeof scrapeSite>>;
        try {
          site = await scrapeSite(url, html);
        } catch (err) {
          console.error("scrapeSite failed", err);
          return json({ error: FETCH_ERROR }, RECOVERABLE_ERROR_STATUS);
        }

        // Guard: essentially empty / JS-only pages give the model nothing
        // real to work with — fail recoverably instead of letting it guess.
        if (site.content.wordCount < 20 && site.ctas.total === 0) {
          return json({ error: FETCH_ERROR }, RECOVERABLE_ERROR_STATUS);
        }

        // analyzeWithGemini (lib/gemini.ts) internally:
        //   1. computes the deterministic baseline score via lib/scoring.ts
        //   2. builds the grounded prompt via lib/prompt.ts
        //   3. calls Gemini with structured output, validates, retries,
        //      and clamps the score into the computed band
        let parsed: Analysis | null = null;
        try {
          parsed = await analyzeWithGemini(site);
        } catch (err) {
          console.error("analyzeWithGemini failed", err);
          parsed = null;
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
