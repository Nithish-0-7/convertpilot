/**
 * lib/scoring.ts
 *
 * The #1 cause of "inconsistent scoring" with an LLM-only approach is that
 * the model has no fixed anchor — ask it twice and you get 62 and 81 for
 * the same site. The fix: compute a deterministic baseline score from the
 * scraped signals using fixed rules, then let Gemini adjust it only within
 * a narrow band (+/-8) based on qualitative judgment. This keeps scores
 * stable across runs while still letting the AI use judgment.
 *
 * Weights are intentionally simple and inspectable — tune freely.
 */

import type { ScrapedSite } from "./scraper";

export interface ScoreBreakdown {
  baseline: number; // 0-100, deterministic
  categoryScores: {
    messaging: number; // 0-20
    trust: number; // 0-20
    conversionPath: number; // 0-25
    technical: number; // 0-15
    urgencyAndProof: number; // 0-20
  };
  allowedRange: [number, number]; // baseline +/- band, clamped to [0,100]
}

export function computeBaselineScore(site: ScrapedSite): ScoreBreakdown {
  // --- Messaging clarity (0-20) ---
  let messaging = 20;
  if (site.content.h1.length === 0) messaging -= 10;
  if (site.content.h1.length > 1) messaging -= 5;
  if (site.meta.description === null) messaging -= 4;
  if (site.content.wordCount < 50) messaging -= 6; // likely thin/broken page
  messaging = clamp(messaging, 0, 20);

  // --- Trust (0-20) ---
  let trust = 4; // start low, earn points — most sites under-invest in trust signals
  if (site.trust.testimonialSignals > 0) trust += 4;
  if (site.trust.starRatingMarkup) trust += 2;
  if (site.trust.trustBadgeKeywords.length > 0) trust += 3;
  if (site.trust.guaranteeLanguage) trust += 2;
  if (site.trust.hasPhysicalAddress || site.trust.hasPhoneNumber) trust += 2;
  if (site.trust.hasPrivacyOrTermsLink) trust += 2;
  if (
    site.trust.footerCopyrightYear !== null &&
    site.trust.footerCopyrightYear < new Date().getFullYear() - 1
  ) {
    trust -= 3; // stale footer = neglect signal
  }
  trust = clamp(trust, 0, 20);

  // --- Conversion path: CTAs + forms (0-25) ---
  let conversionPath = 25;
  if (site.ctas.total === 0) conversionPath -= 15;
  if (site.ctas.aboveFold === 0 && site.ctas.total > 0) conversionPath -= 6;
  if (site.ctas.broken > 0) conversionPath -= Math.min(8, site.ctas.broken * 2);
  if (site.ctas.genericCount > 0) {
    conversionPath -= Math.min(6, site.ctas.genericCount * 1.5);
  }
  if (site.forms.total > 0 && !site.forms.hasEmailCapture) conversionPath -= 3;
  conversionPath = clamp(conversionPath, 0, 25);

  // --- Technical / accessibility (0-15) ---
  let technical = 15;
  if (!site.meta.hasViewportMeta) technical -= 6; // not mobile-optimized
  if (site.technical.imagesMissingAlt > 0 && site.technical.totalImages > 0) {
    const ratio = site.technical.imagesMissingAlt / site.technical.totalImages;
    technical -= Math.round(ratio * 5);
  }
  if (site.technical.externalScriptCount > 10) technical -= 3; // likely bloated/slow
  if (site.technical.navLinkCount > 12) technical -= 2; // choice paralysis
  technical = clamp(technical, 0, 15);

  // --- Urgency & social proof (0-20) ---
  let urgencyAndProof = 6; // baseline; most sites don't use these well
  if (site.socialProof.customerCountClaims.length > 0) urgencyAndProof += 5;
  if (site.socialProof.socialLinks > 0) urgencyAndProof += 2;
  if (site.urgencyScarcity.hasCountdown) urgencyAndProof += 4;
  if (site.urgencyScarcity.scarcityPhrases.length > 0) urgencyAndProof += 3;
  urgencyAndProof = clamp(urgencyAndProof, 0, 20);

  const baseline = clamp(
    messaging + trust + conversionPath + technical + urgencyAndProof,
    0,
    100
  );

  const band = 8;
  const allowedRange: [number, number] = [
    clamp(baseline - band, 0, 100),
    clamp(baseline + band, 0, 100),
  ];

  return {
    baseline,
    categoryScores: { messaging, trust, conversionPath, technical, urgencyAndProof },
    allowedRange,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
