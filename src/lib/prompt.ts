/**
 * lib/prompt.ts
 *
 * Turns the scraped signals + deterministic score band into a prompt that
 * makes it hard for Gemini to be generic or to hallucinate. Two techniques
 * do most of the work:
 *   1. Grounding — the model is only given real extracted data and is told,
 *      explicitly and repeatedly, that it may not reference anything else.
 *   2. Constraint — the model must pick leaks from a checklist of
 *      *categories present in the data*, not invent categories, and must
 *      justify each leak by pointing at a specific field from the data.
 */

import type { ScrapedSite } from "./scraper";
import type { ScoreBreakdown } from "./scoring";

export const SYSTEM_PROMPT = `You are a senior conversion rate optimization (CRO) auditor.
You audit real websites using ONLY structured data extracted from the page you're given.

Hard rules:
- Never invent statistics, testimonials, competitor names, traffic numbers, or claims that are not present in the EXTRACTED_DATA JSON.
- Every leak you report must be traceable to a specific field in EXTRACTED_DATA. If you reference something (e.g. a headline or CTA), quote it from the data, don't paraphrase into something that sounds better than what's there.
- Do not give generic advice like "improve your CTA" or "build trust" without saying specifically what on THIS page is weak and why, using the data provided.
- If EXTRACTED_DATA is too thin to support a confident claim in some area, say so plainly rather than filling the gap with a generic best practice.
- You will be given a numeric score range (SCORE_RANGE). Your final score MUST fall within that range. This range was computed deterministically from the same data you're looking at — treat it as a hard constraint, not a suggestion.
- Output must be valid JSON matching the provided schema exactly. No markdown, no commentary outside the JSON.`;

export function buildUserPrompt(site: ScrapedSite, score: ScoreBreakdown): string {
  return `EXTRACTED_DATA:
${JSON.stringify(site, null, 2)}

CATEGORY_SCORES (0-100 total, deterministic, for your reference — explains where points were lost):
${JSON.stringify(score.categoryScores, null, 2)}

SCORE_RANGE (your final "score" field MUST be an integer within this inclusive range):
${score.allowedRange[0]} to ${score.allowedRange[1]}

TASK:
Identify the TOP 3 revenue leaks on this page, ranked by likely revenue impact. Each leak must:
- Point at something concrete and specific found in EXTRACTED_DATA (an actual heading, CTA text, missing field, stale footer year, broken link count, etc.)
- Explain the mechanism of revenue loss in one sentence ("impact") — be concrete (e.g. "visitors bounce before finding a reason to trust the checkout" not "hurts conversion")
- Assign severity based on how directly it blocks the primary conversion action (checkout, signup, lead form) vs. secondary polish

Return JSON matching exactly:
{
  "score": <integer within SCORE_RANGE>,
  "leaks": [
    {
      "title": "<short, specific, references the actual page>",
      "teaser": "<1-2 sentences, references specific extracted content, no invented facts>",
      "severity": "High" | "Medium" | "Low",
      "impact": "<one concrete sentence on the revenue mechanism>"
    }
  ]
}

The "leaks" array must have exactly 3 items, ordered by severity/impact descending.`;
}

/** JSON schema passed to Gemini's structured output config (responseSchema). */
export const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "integer" },
    leaks: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          teaser: { type: "string" },
          severity: { type: "string", enum: ["High", "Medium", "Low"] },
          impact: { type: "string" },
        },
        required: ["title", "teaser", "severity", "impact"],
      },
    },
  },
  required: ["score", "leaks"],
} as const;
