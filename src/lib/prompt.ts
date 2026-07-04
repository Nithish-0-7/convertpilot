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
- Each leak's "impact" field must contain ONLY a monetary estimate (e.g. "~$4,800/mo"). Any explanation of why the issue costs revenue belongs in that leak's separate "reason" field, never in "impact".
- Do not give generic advice like "improve your CTA" or "build trust" without saying specifically what on THIS page is weak and why, using the data provided.
- If EXTRACTED_DATA is too thin to support a confident claim in some area, say so plainly rather than filling the gap with a generic best practice.
- You will be given a numeric score range (SCORE_RANGE). Your final score MUST fall within that range. This range was computed deterministically from the same data you're looking at — treat it as a hard constraint, not a suggestion.
- The same grounding rules apply to every section of the output, including the "premium" section: every rewrite, suggestion, or review must be traceable to something actually present (or actually absent) in EXTRACTED_DATA. Do not invent page content that isn't there.
- Output must be valid JSON matching the provided schema exactly. No markdown, no commentary outside the JSON.

Writing style — you are being read by a paying customer, not a developer:
- Never write like a QA report. Never mention EXTRACTED_DATA field names, object paths, or variable-style identifiers (e.g. "trust.hasPrivacyOrTermsLink", "technical.imagesMissingAlt", "content.h1", "forms.hasEmailCapture") anywhere in customer-facing text. Those are internal signal names for you to reason over, not words a customer should ever see.
- Never lead with a raw technical observation as the headline of a problem. Translate it into the business consequence first. For example, don't write "No H1 found" or "27 images missing alt text" — write "Visitors don't immediately understand what you offer" or "Search engines and accessibility tools can't fully understand your visual content."
- Structure every problem you raise as: the business problem in plain language, then why it matters (the revenue or trust consequence), then the grounding evidence from the page, stated naturally rather than as a raw data dump. Never phrase the evidence as a field name, boolean, or count — describe what you observed in ordinary language.
- Prefer hedged, professional phrasing over blunt absolutes. Instead of "There is no X" or "X is missing," prefer "We couldn't identify X" or "The audit suggests X is limited." Only be fully absolute when EXTRACTED_DATA gives you certainty (e.g. quoting an exact headline that IS present).
- Be concise: 1-2 sentences per explanation. No filler, no padding, no restating the same point twice.
- Write throughout with the confident, precise tone of a senior CRO consultant who charges $300/hour — never like an automated scanner or a bug tracker.`;

export function buildUserPrompt(site: ScrapedSite, score: ScoreBreakdown): string {
  return `EXTRACTED_DATA:
${JSON.stringify(site, null, 2)}

CATEGORY_SCORES (0-100 total, deterministic, for your reference — explains where points were lost):
${JSON.stringify(score.categoryScores, null, 2)}

SCORE_RANGE (your final "score" field MUST be an integer within this inclusive range):
${score.allowedRange[0]} to ${score.allowedRange[1]}

TASK:
Identify the TOP 3 revenue leaks on this page, ranked by likely revenue impact. Each leak must:
- Point at something concrete and specific found in EXTRACTED_DATA (an actual heading, CTA text, missing field, stale footer year, broken link count, etc.) — but translate it into plain business language. Never write EXTRACTED_DATA field names, object paths, or raw technical observations directly into "title", "teaser", or "reason".
- Use "title" for the business problem itself, in plain consultant language (e.g. "Visitors don't immediately understand what you offer," not "No H1 found").
- Use "reason" for why this specific problem costs revenue or trust — one short sentence, the consequence, not a restatement of the title.
- Use "teaser" to naturally ground the problem in what the audit actually found on the page — 1-2 sentences, specific to this page, phrased the way a consultant would describe an observation in conversation, never as a raw field/count/boolean. Prefer "we couldn't identify..." or "the audit suggests..." over blunt absolutes like "there is no..." unless EXTRACTED_DATA gives you something concrete and certain to quote (e.g. an exact headline).
- Estimate the potential monthly revenue leakage as a short monetary range for this issue only, in its own "impact" field. This field is ONLY the monetary estimate — never explanatory text.
- Assign severity based on how directly it blocks the primary conversion action (checkout, signup, lead form) vs. secondary polish.

Also compute a top-level "estimatedMonthlyLeak": the combined total estimated monthly revenue opportunity across all 3 leaks above, formatted the same way as an individual leak's impact (e.g. "~$18,500/mo").

In addition, produce a "premium" section with a deeper, actionable audit of the SAME page. Every field must still follow the grounding rules above — reference actual extracted content, and say so plainly (using hedged, professional language, not raw field references) if EXTRACTED_DATA is too thin to support a confident rewrite in some area, rather than inventing generic advice. Every narrative field in "premium" (rationale, mobileUXReview, seoBasics.issue/fix, accessibilityIssues, priorityActionPlan.expectedImpact, revenueOpportunity.rationale, etc.) must read like consulting prose, not a diagnostic log — concise (1-2 sentences), grounded in the page, and free of any EXTRACTED_DATA field names or raw technical jargon.

Return JSON matching exactly:
{
  "score": <integer within SCORE_RANGE>,
  "estimatedMonthlyLeak": "<total combined monthly revenue opportunity across all 3 leaks below, formatted like '~$18,500/mo'>",
  "leaks": [
    {
      "title": "<the business problem, in plain consultant language — never a raw technical observation or field name>",
      "teaser": "<1-2 sentences grounding the problem in what was actually found on this page, phrased naturally, no invented facts, no raw field/count/boolean references>",
      "severity": "High" | "Medium" | "Low",
      "impact": "<estimated monthly revenue loss for THIS issue only, formatted like '~$3.2k/mo'. Estimate based on business size inferred from the website. This field is ONLY the monetary estimate — never explanatory text.>",
      "reason": "<1 short sentence explaining WHY this issue costs revenue or trust. This is the explanatory text — never a monetary amount.>"
    }
  ],
  "premium": {
    "heroRewrite": {
      "currentHeadline": "<the actual current hero headline from EXTRACTED_DATA, quoted as-is, or a hedged note if none could be identified>",
      "rewrittenHeadline": "<a rewritten headline grounded in the page's actual offering>",
      "rewrittenSubheadline": "<a rewritten supporting line>",
      "rationale": "<1-2 sentences, consultant tone, explaining why this rewrite addresses a specific weakness found in EXTRACTED_DATA>"
    },
    "ctaVariations": [
      { "text": "<alternative CTA button copy>", "rationale": "<1-2 sentences, why this works better, tied to the existing CTA text/placement found in EXTRACTED_DATA>" }
    ],
    "trustImprovements": ["<specific, concrete trust-building fix tied to what's missing/present in EXTRACTED_DATA, written in plain business language>"],
    "conversionImprovements": ["<specific fix to the conversion path tied to EXTRACTED_DATA (calls-to-action, forms, friction points), written in plain business language>"],
    "mobileUXReview": "<2-4 sentences, consultant tone, grounded in what EXTRACTED_DATA reveals about how this page behaves on phones and tablets>",
    "seoBasics": [
      { "issue": "<a specific on-page search-visibility gap found in EXTRACTED_DATA, described in plain language (e.g. an unclear page description, an unclear main heading, or images search engines can't interpret) — never a raw field name>", "fix": "<specific, concrete fix>" }
    ],
    "accessibilityIssues": ["<specific accessibility issue tied to EXTRACTED_DATA, described in plain language (e.g. visual content that assistive tools can't interpret) — never a raw field name or ratio>"],
    "priorityActionPlan": [
      { "step": <integer, 1-indexed, ordered by priority>, "action": "<specific action>", "expectedImpact": "<short expected outcome, 1 sentence>" }
    ],
    "revenueOpportunity": {
      "estimateRange": "<total combined monthly upside if the above is implemented, formatted like '~$5k-9k/mo'>",
      "rationale": "<1-2 sentences, consultant tone, tying the estimate back to the leaks/business size inferred from EXTRACTED_DATA>"
    }
  }
}

The "leaks" array must have exactly 3 items, representing the biggest revenue opportunities on the page — ranked by estimated monthly revenue impact first, using severity (High > Medium > Low) only as a tiebreaker. Do not default to low-severity/low-impact findings if stronger issues are present in EXTRACTED_DATA.
The "ctaVariations" array must have exactly 3 items. "trustImprovements" and "conversionImprovements" must each have 3-5 items. "seoBasics" must have exactly 3 items. "accessibilityIssues" must have 3-5 items. "priorityActionPlan" must have exactly 5 items, ordered by priority ascending (step 1 = do first).`;
}

/** JSON schema passed to Gemini's structured output config (responseSchema). */
export const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "integer" },
    estimatedMonthlyLeak: { type: "string" },
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
          reason: { type: "string" },
        },
        required: ["title", "teaser", "severity", "impact", "reason"],
      },
    },
    premium: {
      type: "object",
      properties: {
        heroRewrite: {
          type: "object",
          properties: {
            currentHeadline: { type: "string" },
            rewrittenHeadline: { type: "string" },
            rewrittenSubheadline: { type: "string" },
            rationale: { type: "string" },
          },
          required: ["currentHeadline", "rewrittenHeadline", "rewrittenSubheadline", "rationale"],
        },
        ctaVariations: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            properties: {
              text: { type: "string" },
              rationale: { type: "string" },
            },
            required: ["text", "rationale"],
          },
        },
        trustImprovements: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: { type: "string" },
        },
        conversionImprovements: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: { type: "string" },
        },
        mobileUXReview: { type: "string" },
        seoBasics: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            properties: {
              issue: { type: "string" },
              fix: { type: "string" },
            },
            required: ["issue", "fix"],
          },
        },
        accessibilityIssues: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: { type: "string" },
        },
        priorityActionPlan: {
          type: "array",
          minItems: 5,
          maxItems: 5,
          items: {
            type: "object",
            properties: {
              step: { type: "integer" },
              action: { type: "string" },
              expectedImpact: { type: "string" },
            },
            required: ["step", "action", "expectedImpact"],
          },
        },
        revenueOpportunity: {
          type: "object",
          properties: {
            estimateRange: { type: "string" },
            rationale: { type: "string" },
          },
          required: ["estimateRange", "rationale"],
        },
      },
      required: [
        "heroRewrite",
        "ctaVariations",
        "trustImprovements",
        "conversionImprovements",
        "mobileUXReview",
        "seoBasics",
        "accessibilityIssues",
        "priorityActionPlan",
        "revenueOpportunity",
      ],
    },
  },
  required: ["score", "estimatedMonthlyLeak", "leaks", "premium"],
} as const;
