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
 *  - server-side dedup so the 3 "leaks" the frontend renders are always unique
 *    and, where possible, span different issue categories
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
  reason: z.string().min(1),
});

const HeroRewriteSchema = z.object({
  currentHeadline: z.string().min(1),
  rewrittenHeadline: z.string().min(1),
  rewrittenSubheadline: z.string().min(1),
  rationale: z.string().min(1),
});

const CtaVariationSchema = z.object({
  text: z.string().min(1),
  rationale: z.string().min(1),
});

const SeoBasicSchema = z.object({
  issue: z.string().min(1),
  fix: z.string().min(1),
});

const PriorityActionSchema = z.object({
  step: z.number().int().min(1),
  action: z.string().min(1),
  expectedImpact: z.string().min(1),
});

const RevenueOpportunitySchema = z.object({
  estimateRange: z.string().min(1),
  rationale: z.string().min(1),
});

const PremiumSchema = z.object({
  heroRewrite: HeroRewriteSchema,
  ctaVariations: z.array(CtaVariationSchema).length(3),
  trustImprovements: z.array(z.string().min(1)).min(3).max(5),
  conversionImprovements: z.array(z.string().min(1)).min(3).max(5),
  mobileUXReview: z.string().min(1),
  seoBasics: z.array(SeoBasicSchema).length(3),
  accessibilityIssues: z.array(z.string().min(1)).min(3).max(5),
  priorityActionPlan: z.array(PriorityActionSchema).length(5),
  revenueOpportunity: RevenueOpportunitySchema,
});

const AnalysisSchema = z.object({
  score: z.number().int().min(0).max(100),
  estimatedMonthlyLeak: z.string().min(1),
  leaks: z.array(LeakSchema).length(3),
  premium: PremiumSchema,
});

export type Analysis = z.infer<typeof AnalysisSchema>;
type Leak = Analysis["leaks"][number];

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

      // Final safety net: Gemini's structured output enforces an array of
      // exactly 3 leak objects, but says nothing about them being distinct.
      // In practice the model sometimes returns the same leak 3x. Dedup
      // here, backfilling with signal-grounded (not generic) leaks pulled
      // from the scraped page when fewer than 3 unique issues remain.
      const uniqueLeaks = ensureThreeUniqueLeaks(parsed.leaks, site);

      return {
        ...parsed,
        score: clampedScore,
        leaks: uniqueLeaks,
        // Gemini's own estimatedMonthlyLeak was computed against its original
        // 3 leaks, which dedup/backfill may have changed above — recompute
        // from the leaks we're actually shipping so the total always matches.
        estimatedMonthlyLeak: sumImpacts(uniqueLeaks),
      };
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

// ---------------------------------------------------------------------------
// Leak deduplication
//
// The Leak schema (title/teaser/severity/impact/reason) has no explicit "category"
// field and we're not allowed to change the JSON schema, so category is
// inferred from the text via keyword matching. This is used to (a) catch
// near-duplicate leaks that have slightly different wording but describe the
// same underlying issue, and (b) prefer covering distinct issue categories
// across the 3 leaks shown to the user.
// ---------------------------------------------------------------------------

type LeakCategory =
  | "Hero CTA"
  | "Value Proposition"
  | "Trust Signals"
  | "Mobile UX"
  | "SEO"
  | "Accessibility"
  | "Content"
  | "Navigation"
  | "Forms"
  | "Performance"
  | "General";

const CATEGORY_KEYWORDS: Array<[LeakCategory, RegExp]> = [
  ["Hero CTA", /\bcta\b|call[- ]to[- ]action|\bbutton\b/i],
  ["Value Proposition", /headline|value prop|subheadline|proposition/i],
  ["Trust Signals", /trust|testimonial|review|credibil|badge|social proof/i],
  ["Mobile UX", /mobile|viewport|responsive/i],
  ["SEO", /\bseo\b|meta description|title tag|\bh1\b|keyword|\brank(ing)?\b/i],
  ["Accessibility", /accessib|alt[- ]text|alt text|contrast|\baria\b|screen[- ]?reader/i],
  ["Forms", /\bform(s)?\b|email captur|sign[- ]?up|\bcaptur(e|ing)\b|\blead(s)?\b/i],
  ["Navigation", /navigation|\bnav\b|menu/i],
  ["Performance", /performance|page speed|load time|\bspeed\b/i],
  ["Content", /content|word count|copy depth|thin content/i],
];

function categorizeLeak(leak: Pick<Leak, "title" | "teaser" | "reason">): LeakCategory {
  const haystack = `${leak.title} ${leak.teaser} ${leak.reason}`;
  for (const [category, pattern] of CATEGORY_KEYWORDS) {
    if (pattern.test(haystack)) return category;
  }
  return "General";
}

// ---------------------------------------------------------------------------
// Impact math
//
// Individual leak "impact" strings are free-form monetary estimates (e.g.
// "~$4,800/mo" or "~$3.2k/mo"). To produce a trustworthy top-level
// estimatedMonthlyLeak we parse each one back into a number, sum them, and
// re-format — rather than trusting Gemini's own total, which can go stale
// once dedup/backfill swaps leaks in or out.
// ---------------------------------------------------------------------------

function parseImpactAmount(impact: string): number {
  const match = impact.match(/\$([\d,]+(?:\.\d+)?)\s*(k|K)?/);
  if (!match) return 0;
  const raw = parseFloat(match[1].replace(/,/g, ""));
  if (Number.isNaN(raw)) return 0;
  return match[2] ? raw * 1000 : raw;
}

function formatMonthlyAmount(amount: number): string {
  return `~$${Math.round(amount).toLocaleString("en-US")}/mo`;
}

function sumImpacts(leaks: readonly Pick<Leak, "impact">[]): string {
  const total = leaks.reduce((sum, l) => sum + parseImpactAmount(l.impact), 0);
  return formatMonthlyAmount(total);
}

// ---------------------------------------------------------------------------
// Leak ranking
//
// The 3 leaks shown to the user should be the biggest business
// opportunities, not just "first 3 valid findings". Rank by estimated
// monthly revenue impact first, falling back to severity (High > Medium >
// Low) as a tiebreaker when impact amounts are equal or unparseable. This is
// applied both to Gemini's candidates and to the deterministic fallback
// pool, so backfilled/offline leaks follow the same priority.
// ---------------------------------------------------------------------------

const SEVERITY_RANK: Record<Leak["severity"], number> = { High: 3, Medium: 2, Low: 1 };

function compareLeaksByOpportunity(a: Pick<Leak, "impact" | "severity">, b: Pick<Leak, "impact" | "severity">): number {
  const impactDiff = parseImpactAmount(b.impact) - parseImpactAmount(a.impact);
  if (impactDiff !== 0) return impactDiff;
  return SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
}

function normalizeTitle(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Drops exact/near-duplicate leaks by normalized title, and drops leaks that
 * repeat a category already represented (unless the category couldn't be
 * confidently inferred, in which case we fall back to title-only dedup).
 * Preserves the input order — callers are expected to pass candidates
 * pre-sorted by opportunity (see compareLeaksByOpportunity) so the biggest
 * findings win ties for a category slot, not whichever came first from Gemini.
 */
function dedupeLeaks(candidates: readonly Leak[]): Leak[] {
  const seenTitles = new Set<string>();
  const seenCategories = new Set<LeakCategory>();
  const unique: Leak[] = [];

  for (const leak of candidates) {
    const normTitle = normalizeTitle(leak.title);
    if (seenTitles.has(normTitle)) continue;

    const category = categorizeLeak(leak);
    if (category !== "General" && seenCategories.has(category)) continue;

    seenTitles.add(normTitle);
    if (category !== "General") seenCategories.add(category);
    unique.push(leak);
  }

  return unique;
}

/**
 * Deterministic, signal-grounded candidate leaks derived from the actual
 * scraped page — used to backfill when Gemini's 3 leaks collapse to fewer
 * than 3 unique issues after dedup. Every entry reflects the real scraped
 * state (present or absent) rather than a generic placeholder, and each
 * covers a distinct category so it can safely fill a gap.
 */
function buildDeterministicLeakPool(site: ScrapedSite): Leak[] {
  const pool: Leak[] = [];

  // Hero CTA
  {
    const severity = site.ctas.total === 0 || site.ctas.aboveFold === 0 ? "High" : "Low";
    pool.push({
      title:
        site.ctas.total === 0 || site.ctas.aboveFold === 0
          ? "Visitors don't see a clear next step immediately"
          : "Your call-to-action may be underperforming",
      teaser:
        site.ctas.total === 0
          ? "There's no clear call-to-action guiding visitors toward the next step, so even genuinely interested visitors are left unsure what to do — and most will simply leave."
          : site.ctas.aboveFold === 0
            ? "Visitors have to scroll before finding anything to click, so a large share will lose interest and leave before ever seeing your call-to-action."
            : "A call-to-action is in place, but easy-to-overlook wording can quietly cost you conversions from visitors who were ready to act.",
      severity,
      impact: severity === "High" ? "~$6,200/mo" : "~$1,100/mo",
      reason: "Visitors leave before seeing a reason to act.",
    });
  }

  // Trust Signals
  {
    const hasTrustSignals = site.trust.testimonialSignals > 0 || site.trust.trustBadgeKeywords.length > 0;
    const severity = hasTrustSignals ? "Low" : "Medium";
    pool.push({
      title: hasTrustSignals
        ? "Your trust signals may not be getting noticed"
        : "Visitors have no reason to trust you yet",
      teaser: hasTrustSignals
        ? "You have some trust-building elements in place, but if they're buried below the fold or easy to miss, they're not doing their job of reassuring hesitant visitors."
        : "Without reviews, testimonials, or recognizable trust marks, new visitors have nothing to reassure them before handing over their information or money — a common reason they hesitate and leave.",
      severity,
      impact: severity === "Medium" ? "~$3,400/mo" : "~$900/mo",
      reason: "Uncertain visitors hesitate to convert without social proof.",
    });
  }

  // Mobile UX
  {
    const severity = site.meta.hasViewportMeta ? "Low" : "High";
    pool.push({
      title: site.meta.hasViewportMeta
        ? "Your mobile experience may have hidden friction"
        : "Mobile visitors are getting a broken experience",
      teaser: site.meta.hasViewportMeta
        ? "Basic mobile support is in place, but that doesn't guarantee a smooth experience — subtle layout or tap-target issues on phones can quietly chip away at conversions."
        : "The page isn't set up to adapt to phones and tablets, so mobile visitors — often the majority of your traffic — are likely seeing a cramped, hard-to-use layout that pushes them away before they convert.",
      severity,
      impact: severity === "High" ? "~$5,800/mo" : "~$1,000/mo",
      reason: "Mobile visitors — often the majority of traffic — get a degraded experience.",
    });
  }

  // SEO
  {
    const seoIssue = site.meta.description === null || site.content.h1.length !== 1;
    const severity = seoIssue ? "Medium" : "Low";
    pool.push({
      title:
        site.meta.description === null
          ? "You're leaving search traffic on the table"
          : site.content.h1.length !== 1
            ? "Search engines may be confused about what this page is about"
            : "Your search visibility looks solid but hasn't been fully verified",
      teaser:
        site.meta.description === null
          ? "Without a compelling description showing up in search results, fewer people click through to your site in the first place — no matter how good the page itself is."
          : site.content.h1.length !== 1
            ? "When a page's structure doesn't clearly signal what it's about, search engines can struggle to rank it for the right terms, quietly costing you qualified visitors."
            : "The basics that help search engines understand and rank this page appear to be in place.",
      severity,
      impact: severity === "Medium" ? "~$2,200/mo" : "~$700/mo",
      reason: "Search engines may under-rank or misrepresent the page in results.",
    });
  }

  // Accessibility
  {
    const hasAltIssue = site.technical.totalImages > 0 && site.technical.imagesMissingAlt > 0;
    const severity = hasAltIssue ? "Medium" : "Low";
    pool.push({
      title: hasAltIssue ? "Search visibility is being limited" : "Accessibility may have some quiet gaps",
      teaser: hasAltIssue
        ? "Missing image descriptions make it harder for search engines to index your content and for some visitors to understand your page — both of which can quietly reduce qualified traffic and conversions."
        : "No major accessibility gaps were flagged here, though a deeper look could still turn up small barriers that cost you visitors who rely on assistive tools.",
      severity,
      impact: severity === "Medium" ? "~$1,800/mo" : "~$500/mo",
      reason: "Screen-reader and keyboard users may struggle to use the page.",
    });
  }

  // Forms
  {
    const severity = site.forms.total === 0 ? "Medium" : "Low";
    pool.push({
      title:
        site.forms.total > 0 && !site.forms.hasEmailCapture
          ? "Interested visitors have no way to stay in touch"
          : site.forms.total === 0
            ? "You're missing opportunities to capture interested visitors"
            : "Your lead-capture setup may need a closer look",
      teaser:
        site.forms.total > 0 && !site.forms.hasEmailCapture
          ? "Visitors who aren't ready to buy today have no way to leave their email for later, so instead of becoming a future customer, they simply leave and are gone for good."
          : site.forms.total === 0
            ? "Visitors interested in learning more have no simple way to contact you or request information, increasing the chance they'll leave without becoming a lead."
            : "A way to capture leads exists, though how well it turns visitors into contacts wasn't fully verified.",
      severity,
      impact: severity === "Medium" ? "~$2,000/mo" : "~$600/mo",
      reason: "Missed opportunities to capture leads for follow-up.",
    });
  }

  // Content
  pool.push({
    title:
      site.content.wordCount < 150
        ? "Visitors may not have enough information to decide"
        : "Your content depth looks appropriate",
    teaser:
      site.content.wordCount < 150
        ? "When there isn't enough information on the page, visitors who are seriously considering your offer can't get the answers they need to move forward — and many will leave to look elsewhere instead."
        : "The page provides a reasonable amount of context for visitors evaluating your offer.",
    severity: "Low",
    impact: "~$800/mo",
    reason: "Thin content can under-inform visitors at the decision stage.",
  });

  return pool;
}

/**
 * Guarantees exactly 3 unique leaks representing the biggest business
 * opportunities: rank all candidates by estimated revenue impact (then
 * severity) first, dedup, then backfill any remaining slots from the
 * deterministic, scrape-grounded candidate pool — also rank-ordered, so a
 * High-severity/high-impact fallback always beats a Low one, and three
 * Low-severity leaks only ever ship when nothing stronger genuinely exists.
 */
function ensureThreeUniqueLeaks(candidates: readonly Leak[], site: ScrapedSite): Analysis["leaks"] {
  const rankedCandidates = [...candidates].sort(compareLeaksByOpportunity);
  const unique = dedupeLeaks(rankedCandidates);

  if (unique.length >= 3) {
    return unique.slice(0, 3).sort(compareLeaksByOpportunity) as Analysis["leaks"];
  }

  const usedTitles = new Set(unique.map((l) => normalizeTitle(l.title)));
  const usedCategories = new Set(unique.map((l) => categorizeLeak(l)));
  const fallbackPool = buildDeterministicLeakPool(site).sort(compareLeaksByOpportunity);

  // Pass 1: only add fallback candidates that are both a new title and a new category.
  for (const candidate of fallbackPool) {
    if (unique.length >= 3) break;
    const normTitle = normalizeTitle(candidate.title);
    if (usedTitles.has(normTitle)) continue;
    const category = categorizeLeak(candidate);
    if (category !== "General" && usedCategories.has(category)) continue;

    unique.push(candidate);
    usedTitles.add(normTitle);
    if (category !== "General") usedCategories.add(category);
  }

  // Pass 2 (defensive, should rarely trigger given 7 distinct-category
  // fallback candidates): relax the category constraint, still enforcing
  // unique titles, so we never fall short of 3 leaks.
  if (unique.length < 3) {
    for (const candidate of fallbackPool) {
      if (unique.length >= 3) break;
      const normTitle = normalizeTitle(candidate.title);
      if (usedTitles.has(normTitle)) continue;
      unique.push(candidate);
      usedTitles.add(normTitle);
    }
  }

  // Final re-rank: backfilled candidates were appended after whatever
  // Gemini leaks survived dedup, so the list isn't guaranteed to be in
  // opportunity order at this point — sort once more before returning.
  return unique.slice(0, 3).sort(compareLeaksByOpportunity) as Analysis["leaks"];
}

/**
 * Deterministic fallback if Gemini fails twice. Not as sharp as a real
 * audit, but every leak here is still grounded in real scraped data — never
 * shows the user a broken page or invented content, and is always 3 unique,
 * category-diverse issues.
 */
function buildFallbackAnalysis(site: ScrapedSite, score: number): Analysis {
  const leaks = ensureThreeUniqueLeaks([], site);

  const currentHeadline = site.content.h1[0] ?? "(no H1 found on the page)";
  const premium: Analysis["premium"] = {
    heroRewrite: {
      currentHeadline,
      rewrittenHeadline: currentHeadline,
      rewrittenSubheadline:
        "A rewritten subheadline could not be generated automatically — this fell back to the deterministic audit.",
      rationale:
        "Gemini was unavailable for this run, so no AI rewrite was generated. Re-run the audit to get a rewrite.",
    },
    ctaVariations: [
      { text: "Get Started", rationale: "Generic fallback — AI generation unavailable for this run." },
      { text: "Try It Free", rationale: "Generic fallback — AI generation unavailable for this run." },
      { text: "See Pricing", rationale: "Generic fallback — AI generation unavailable for this run." },
    ],
    trustImprovements: [
      site.trust.testimonialSignals === 0
        ? "No testimonials were detected — consider adding customer quotes near the CTA."
        : "Testimonials were detected but their placement/prominence could not be assessed automatically.",
      site.trust.trustBadgeKeywords.length === 0
        ? "No trust badges were detected — consider adding security/payment badges near checkout or signup."
        : "Trust badges were detected; verify they're visible above the fold.",
      site.trust.hasPrivacyOrTermsLink
        ? "Privacy/Terms links are present."
        : "No Privacy Policy or Terms link was detected — add one for baseline trust and compliance.",
    ],
    conversionImprovements: [
      site.ctas.total === 0
        ? "No CTA elements were detected on the page — add a clear primary action."
        : `${site.ctas.total} CTA element(s) detected; ${site.ctas.genericCount} use generic copy.`,
      site.forms.total > 0 && !site.forms.hasEmailCapture
        ? "Forms are present but don't appear to capture email — consider adding email capture."
        : "Form/email capture setup could not be fully assessed automatically.",
      "Re-run the audit for AI-generated, page-specific conversion recommendations.",
    ],
    mobileUXReview: site.meta.hasViewportMeta
      ? "A viewport meta tag was detected, suggesting basic mobile responsiveness is in place. A full AI review was unavailable for this run."
      : "No viewport meta tag was detected, which typically causes poor mobile rendering. A full AI review was unavailable for this run.",
    seoBasics: [
      {
        issue: site.meta.description === null ? "No meta description found." : "Meta description present.",
        fix: site.meta.description === null ? "Add a concise, keyword-relevant meta description." : "Review meta description length and relevance.",
      },
      {
        issue: site.content.h1.length === 1 ? "Exactly one H1 found." : `${site.content.h1.length} H1 tag(s) found.`,
        fix: site.content.h1.length === 1 ? "No action needed." : "Use exactly one H1 per page for SEO clarity.",
      },
      {
        issue: "Full on-page SEO review unavailable for this run.",
        fix: "Re-run the audit for a complete AI-generated SEO review.",
      },
    ],
    accessibilityIssues: [
      site.technical.totalImages > 0 && site.technical.imagesMissingAlt > 0
        ? `${site.technical.imagesMissingAlt} of ${site.technical.totalImages} images are missing alt text.`
        : "No missing alt-text issues detected on images.",
      site.meta.hasViewportMeta
        ? "Viewport meta tag present."
        : "Missing viewport meta tag can also affect accessibility on mobile devices.",
      "Full accessibility review unavailable for this run — re-run the audit for a complete AI-generated review.",
    ],
    priorityActionPlan: [
      { step: 1, action: "Re-run the audit to get an AI-generated priority action plan.", expectedImpact: "Unlocks page-specific recommendations." },
      { step: 2, action: "Address any missing viewport meta tag if flagged above.", expectedImpact: "Improves mobile rendering." },
      { step: 3, action: "Address missing meta description if flagged above.", expectedImpact: "Improves SEO click-through." },
      { step: 4, action: "Add trust signals near the primary CTA if flagged above.", expectedImpact: "Reduces conversion hesitation." },
      { step: 5, action: "Review CTA copy and placement if flagged above.", expectedImpact: "Improves conversion path clarity." },
    ],
    revenueOpportunity: {
      estimateRange: "Unavailable — AI generation failed for this run.",
      rationale: "Re-run the audit to get a revenue opportunity estimate grounded in this page's data.",
    },
  };

  return { score, estimatedMonthlyLeak: sumImpacts(leaks), leaks, premium };
}
