/**
 * lib/gemini.ts
 *
 * Wraps the Gemini 2.5 Flash call with:
 *  - structured output (responseSchema) so we don't parse free-text JSON
 *  - low temperature for reproducibility
 *  - zod validation of the response against the exact schema the frontend expects
 *  - hard clamping of the score into the deterministic band as a final safety net
 *    (belt-and-suspenders in case the model ignores the instruction)
 *  - a single retry on validation failure
 */

import { z } from "zod";
import type { ScrapedSite } from "./scraper";
import { computeBaselineScore } from "./scoring";
import { SYSTEM_PROMPT, buildUserPrompt, RESPONSE_SCHEMA } from "./prompt";

const LeakSchema = z.object({
  title: z.string().min(1),
  teaser: z.string().min(1),
  severity: z.enum(["High", "Medium", "Low"]),
  impact: z.string().min(1),
});

const AnalysisSchema = z.object({
  score: z.number().int().min(0).max(100),
  leaks: z.array(LeakSchema).length(3),
});

export type Analysis = z.infer<typeof AnalysisSchema>;

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function analyzeWithGemini(site: ScrapedSite): Promise<Analysis> {
  const scoreBreakdown = computeBaselineScore(site);
  const userPrompt = buildUserPrompt(site, scoreBreakdown);

  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callGemini(userPrompt);
      const parsed = AnalysisSchema.parse(JSON.parse(raw));

      // Final safety net: clamp score into the deterministic band even if
      // the model somehow ignored the instruction.
      const [lo, hi] = scoreBreakdown.allowedRange;
      const clampedScore = Math.min(hi, Math.max(lo, parsed.score));

      return { ...parsed, score: clampedScore };
    } catch (err) {
      lastError = err;
      // brief backoff before retry
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  // Both attempts failed validation/parsing — fall back to a safe,
  // fully-deterministic response rather than surfacing garbage to the user.
  console.error("Gemini analysis failed after retry:", lastError);
  return buildFallbackAnalysis(site, scoreBreakdown.baseline);
}

async function callGemini(userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.3, // low but not zero — some qualitative variance is fine, wild swings aren't
        topP: 0.9,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini response missing text content");
  return text;
}

/**
 * Deterministic fallback if Gemini fails twice. Not as sharp as a real
 * audit, but every leak here is still grounded in real scraped data — never
 * shows the user a broken page or invented content.
 */
function buildFallbackAnalysis(site: ScrapedSite, score: number): Analysis {
  const leaks: Analysis["leaks"] = [];

  if (site.ctas.total === 0 || site.ctas.aboveFold === 0) {
    leaks.push({
      title: "No clear call-to-action above the fold",
      teaser: `We found ${site.ctas.total} CTA element(s) on the page, with ${site.ctas.aboveFold} visible before scrolling.`,
      severity: "High",
      impact: "Visitors leave before seeing a reason to act.",
    });
  }
  if (site.trust.testimonialSignals === 0 && site.trust.trustBadgeKeywords.length === 0) {
    leaks.push({
      title: "No visible trust or credibility signals",
      teaser: "No testimonials, reviews, or trust badges were detected on the page.",
      severity: "Medium",
      impact: "Uncertain visitors hesitate to convert without social proof.",
    });
  }
  if (!site.meta.hasViewportMeta) {
    leaks.push({
      title: "Page is not configured for mobile viewports",
      teaser: "No viewport meta tag was found, which typically causes poor mobile rendering.",
      severity: "High",
      impact: "Mobile visitors — often the majority of traffic — get a broken experience.",
    });
  }
  while (leaks.length < 3) {
    leaks.push({
      title: "Content depth may be insufficient",
      teaser: `The page has approximately ${site.content.wordCount} words of content.`,
      severity: "Low",
      impact: "Thin content can under-inform visitors at the decision stage.",
    });
  }

  return { score, leaks: leaks.slice(0, 3) as Analysis["leaks"] };
}
