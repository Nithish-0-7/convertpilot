/**
 * lib/scraper.ts
 *
 * Extracts structured, revenue-relevant signals from a page instead of
 * dumping raw text at the model. Every field here maps to something an
 * actual CRO/growth auditor would look at. The richer and more concrete
 * this object is, the less Gemini has to "guess" — which is the #1 lever
 * for reducing hallucination and generic advice.
 */

import * as cheerio from "cheerio";

export interface ScrapedSite {
  url: string;
  meta: {
    title: string | null;
    description: string | null;
    hasViewportMeta: boolean;
    hasCanonical: boolean;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
  };
  content: {
    h1: string[];
    h2: string[];
    headingOrderIssues: boolean; // e.g. h1 missing, or h3 before h2
    wordCount: number;
    aboveFoldText: string; // best-effort: first ~600px worth of DOM text
  };
  ctas: {
    total: number;
    aboveFold: number;
    texts: string[]; // deduped, up to 10
    broken: number; // href="", "#", "javascript:void(0)"
    genericCount: number; // "Click here", "Submit", "Learn more" etc.
  };
  forms: {
    total: number;
    fieldsPerForm: number[];
    hasEmailCapture: boolean;
    hasPhoneField: boolean;
    hasMultiStep: boolean; // heuristic: multiple forms or step/progress classes
  };
  trust: {
    testimonialSignals: number; // count of testimonial/review-like blocks
    starRatingMarkup: boolean;
    trustBadgeKeywords: string[]; // e.g. "ssl", "norton", "bbb", "money-back"
    guaranteeLanguage: boolean;
    hasPhysicalAddress: boolean;
    hasPhoneNumber: boolean;
    hasPrivacyOrTermsLink: boolean;
    footerCopyrightYear: number | null; // staleness signal
  };
  pricing: {
    priceMentions: number;
    currencySymbolsFound: string[];
    hasPricingTable: boolean;
    planNames: string[];
  };
  urgencyScarcity: {
    hasCountdown: boolean;
    scarcityPhrases: string[]; // "only X left", "limited time", "sale ends"
  };
  socialProof: {
    customerCountClaims: string[]; // regex matches like "10,000+ customers"
    socialLinks: number;
  };
  technical: {
    externalScriptCount: number;
    totalImages: number;
    imagesMissingAlt: number;
    hasLiveChatWidget: boolean;
    navLinkCount: number; // too many = choice paralysis
  };
}

const GENERIC_CTA_PATTERNS = [
  /^click here$/i,
  /^submit$/i,
  /^learn more$/i,
  /^read more$/i,
  /^go$/i,
  /^ok$/i,
];

const SCARCITY_PATTERNS = [
  /only \d+ (left|remaining)/i,
  /limited time/i,
  /sale ends/i,
  /offer expires/i,
  /while supplies last/i,
  /\d+ (people|users) (viewing|bought|purchased)/i,
];

const TRUST_BADGE_KEYWORDS = [
  "ssl",
  "norton",
  "mcafee",
  "bbb",
  "verified",
  "secure checkout",
  "money-back",
  "money back",
  "satisfaction guarantee",
];

const BROKEN_HREFS = new Set(["", "#", "javascript:void(0)", "javascript:;"]);

export async function scrapeSite(url: string, html: string): Promise<ScrapedSite> {
  const $ = cheerio.load(html);

  // Strip noise that pollutes word counts / text extraction
  $("script, style, noscript, svg").each((_, el) => {
    // keep scripts around for counting, but remove from text extraction pass
  });

  const bodyText = $("body").clone().find("script, style, noscript").remove().end().text();
  const wordCount = bodyText.trim().split(/\s+/).filter(Boolean).length;

  // Above-the-fold approximation: first N text-bearing elements in DOM order
  // (no real viewport without headless browser — this is a deliberate, honest heuristic)
  const foldCandidates: string[] = [];
  $("body")
    .find("h1, h2, p, button, a")
    .slice(0, 12)
    .each((_, el) => {
      const t = $(el).text().trim();
      if (t) foldCandidates.push(t);
    });
  const aboveFoldText = foldCandidates.join(" | ").slice(0, 800);

  // Headings
  const h1 = uniq($("h1").map((_, el) => $(el).text().trim()).get()).filter(Boolean);
  const h2 = uniq($("h2").map((_, el) => $(el).text().trim()).get()).filter(Boolean);
  const headingOrderIssues = h1.length === 0 || h1.length > 1;

  // CTAs: buttons + prominent links (exclude nav/footer to reduce noise)
  const ctaEls = $("button, a").filter((_, el) => {
    const text = $(el).text().trim();
    if (!text || text.length > 60) return false;
    const inNav = $(el).parents("nav, footer").length > 0;
    return !inNav;
  });

  const ctaTexts: string[] = [];
  let broken = 0;
  let genericCount = 0;
  ctaEls.each((i, el) => {
    const text = $(el).text().trim();
    const href = $(el).attr("href");
    if (href !== undefined && BROKEN_HREFS.has(href.trim())) broken++;
    if (GENERIC_CTA_PATTERNS.some((p) => p.test(text))) genericCount++;
    if (text && ctaTexts.length < 10) ctaTexts.push(text);
  });
  const aboveFold = Math.min(ctaEls.length, foldCandidates.filter((t) =>
    ctaTexts.includes(t)
  ).length);

  // Forms
  const forms = $("form");
  const fieldsPerForm: number[] = [];
  let hasEmailCapture = false;
  let hasPhoneField = false;
  forms.each((_, form) => {
    const fields = $(form).find("input, select, textarea");
    fieldsPerForm.push(fields.length);
    fields.each((_, f) => {
      const type = ($(f).attr("type") || "").toLowerCase();
      const name = ($(f).attr("name") || "").toLowerCase();
      if (type === "email" || name.includes("email")) hasEmailCapture = true;
      if (type === "tel" || name.includes("phone")) hasPhoneField = true;
    });
  });
  const hasMultiStep =
    forms.length > 1 || $('[class*="step"], [class*="progress"]').length > 0;

  // Trust
  const testimonialSignals = $(
    '[class*="testimonial"], [class*="review"], blockquote'
  ).length;
  const starRatingMarkup =
    $('[class*="star"], [class*="rating"]').length > 0 ||
    $('[itemprop="ratingValue"]').length > 0;

  const bodyTextLower = bodyText.toLowerCase();
  const trustBadgeKeywords = TRUST_BADGE_KEYWORDS.filter((k) =>
    bodyTextLower.includes(k)
  );
  const guaranteeLanguage = /guarantee|risk-free|no questions asked/i.test(bodyText);
  const hasPhysicalAddress = /\b\d{1,5}\s+\w+\s+(street|st\.|ave|avenue|road|rd\.|blvd)\b/i.test(
    bodyText
  );
  const hasPhoneNumber = /(\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(
    bodyText
  );
  const hasPrivacyOrTermsLink =
    $('a:contains("Privacy")').length > 0 || $('a:contains("Terms")').length > 0;

  const footerText = $("footer").text();
  const yearMatch = footerText.match(/(20\d{2})/);
  const footerCopyrightYear = yearMatch ? parseInt(yearMatch[1], 10) : null;

  // Pricing
  const priceMatches = bodyText.match(/[$€£]\s?\d[\d,.]*/g) || [];
  const currencySymbolsFound = uniq(
    priceMatches.map((m) => m.trim()[0]).filter(Boolean)
  );
  const hasPricingTable =
    $('[class*="pricing"], [class*="plan"]').length > 0 && priceMatches.length > 0;
  const planNames = uniq(
    $('[class*="plan"] h2, [class*="plan"] h3, [class*="pricing"] h2, [class*="pricing"] h3')
      .map((_, el) => $(el).text().trim())
      .get()
  ).slice(0, 6);

  // Urgency/scarcity
  const hasCountdown =
    $('[class*="countdown"], [class*="timer"]').length > 0;
  const scarcityPhrases = uniq(
    SCARCITY_PATTERNS.flatMap((p) => {
      const m = bodyText.match(p);
      return m ? [m[0]] : [];
    })
  );

  // Social proof
  const customerCountClaims = uniq(
    (bodyText.match(/\d[\d,]{2,}\+?\s*(customers|users|businesses|companies|downloads)/gi) || [])
  ).slice(0, 5);
  const socialLinks = $(
    'a[href*="facebook.com"], a[href*="twitter.com"], a[href*="x.com"], a[href*="instagram.com"], a[href*="linkedin.com"], a[href*="tiktok.com"]'
  ).length;

  // Technical
  const externalScriptCount = $("script[src]").filter((_, el) => {
    const src = $(el).attr("src") || "";
    return src.startsWith("http") && !src.includes(new URL(url).hostname);
  }).length;
  const totalImages = $("img").length;
  const imagesMissingAlt = $("img").filter((_, el) => !$(el).attr("alt")?.trim()).length;
  const hasLiveChatWidget =
    /intercom|drift|zendesk|crisp|tawk|livechat/i.test(html);
  const navLinkCount = $("nav a").length;

  return {
    url,
    meta: {
      title: $("title").first().text().trim() || null,
      description: $('meta[name="description"]').attr("content")?.trim() || null,
      hasViewportMeta: $('meta[name="viewport"]').length > 0,
      hasCanonical: $('link[rel="canonical"]').length > 0,
      ogTitle: $('meta[property="og:title"]').attr("content") || null,
      ogDescription: $('meta[property="og:description"]').attr("content") || null,
      ogImage: $('meta[property="og:image"]').attr("content") || null,
    },
    content: {
      h1,
      h2: h2.slice(0, 10),
      headingOrderIssues,
      wordCount,
      aboveFoldText,
    },
    ctas: {
      total: ctaEls.length,
      aboveFold,
      texts: uniq(ctaTexts),
      broken,
      genericCount,
    },
    forms: {
      total: forms.length,
      fieldsPerForm,
      hasEmailCapture,
      hasPhoneField,
      hasMultiStep,
    },
    trust: {
      testimonialSignals,
      starRatingMarkup,
      trustBadgeKeywords,
      guaranteeLanguage,
      hasPhysicalAddress,
      hasPhoneNumber,
      hasPrivacyOrTermsLink,
      footerCopyrightYear,
    },
    pricing: {
      priceMentions: priceMatches.length,
      currencySymbolsFound,
      hasPricingTable,
      planNames,
    },
    urgencyScarcity: {
      hasCountdown,
      scarcityPhrases,
    },
    socialProof: {
      customerCountClaims,
      socialLinks,
    },
    technical: {
      externalScriptCount,
      totalImages,
      imagesMissingAlt,
      hasLiveChatWidget,
      navLinkCount,
    },
  };
}

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)));
}