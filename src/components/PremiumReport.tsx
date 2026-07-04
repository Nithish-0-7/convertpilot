import { useState } from "react";
import { motion } from "framer-motion";
import { pdf } from "@react-pdf/renderer";
import type { Analysis } from "../lib/gemini";
import { PremiumReportPdfDocument } from "./PremiumReportPdf";
import {
  Sparkles,
  Wand2,
  MessageSquareText,
  ShieldCheck,
  TrendingUp,
  Smartphone,
  Search,
  Accessibility,
  ListChecks,
  DollarSign,
  Download,
  Loader2,
} from "lucide-react";

/**
 * components/PremiumReport.tsx
 *
 * Renders the `premium` section that now comes back on the SAME
 * analysis response from /api/analyze (see lib/gemini.ts / lib/prompt.ts).
 * No separate fetch, no separate report system — this just presents
 * `analysis.premium`.
 *
 * Entitlement (whether the caller is allowed to see this) is decided by
 * the parent (see Results.tsx `isPremium`), not here — this component
 * only cares whether premium data exists on the analysis.
 */

export interface PremiumReportProps {
  analysis: Analysis;
}

function SectionCard({
  icon,
  title,
  children,
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl sm:p-6"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
      />
      <div className="mb-4 flex items-center gap-2.5">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#5B8CFF]/25 bg-gradient-to-br from-[#5B8CFF]/20 to-[#7C5BFF]/10 text-[#A9C2FF] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          {icon}
        </div>
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-white/70">
          {title}
        </h3>
      </div>
      {children}
    </motion.div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-white/65">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#5B8CFF] shadow-[0_0_6px_rgba(91,140,255,0.8)]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function PremiumReport({ analysis }: PremiumReportProps) {
  const { premium } = analysis;
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfError, setPdfError] = useState(false);

  if (!premium) return null;

  const handleDownloadPdf = async () => {
    setPdfError(false);
    setIsGeneratingPdf(true);
    try {
      const blob = await pdf(<PremiumReportPdfDocument analysis={analysis} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "convertpilot-premium-audit.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setPdfError(true);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <section className="mt-16">
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 flex items-center gap-3"
      >
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#5B8CFF]/30 bg-gradient-to-br from-[#5B8CFF]/25 to-[#7C5BFF]/15 text-[#A9C2FF] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
          <Sparkles className="h-4.5 w-4.5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.02em] text-white sm:text-2xl">
            Premium Audit
          </h2>
          <p className="mt-0.5 text-sm text-white/50">
            A deeper, page-specific breakdown grounded in the same audit above.
          </p>
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Hero Rewrite */}
        <SectionCard icon={<Wand2 className="h-4 w-4" />} title="Hero Rewrite" delay={0}>
          <div className="space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/35">
                Current Headline
              </p>
              <p className="mt-1 text-sm leading-relaxed text-white/55 line-through decoration-white/25">
                {premium.heroRewrite.currentHeadline}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/35">
                Suggested Headline
              </p>
              <p className="mt-1 text-[15px] font-semibold leading-snug text-white">
                {premium.heroRewrite.rewrittenHeadline}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/35">
                Suggested Subheadline
              </p>
              <p className="mt-1 text-sm leading-relaxed text-white/75">
                {premium.heroRewrite.rewrittenSubheadline}
              </p>
            </div>
            <div className="border-t border-white/[0.06] pt-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/35">
                Explanation
              </p>
              <p className="mt-1 text-sm leading-relaxed text-white/55">
                {premium.heroRewrite.rationale}
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Trust Improvements */}
        <SectionCard
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Trust Improvements"
          delay={0.05}
        >
          <BulletList items={premium.trustImprovements} />
        </SectionCard>

        {/* Conversion Improvements */}
        <SectionCard
          icon={<TrendingUp className="h-4 w-4" />}
          title="Conversion Improvements"
          delay={0.1}
        >
          <BulletList items={premium.conversionImprovements} />
        </SectionCard>

        {/* Mobile UX Review */}
        <SectionCard
          icon={<Smartphone className="h-4 w-4" />}
          title="Mobile UX Review"
          delay={0.15}
        >
          <p className="text-sm leading-relaxed text-white/65">{premium.mobileUXReview}</p>
        </SectionCard>

        {/* Accessibility Issues */}
        <SectionCard
          icon={<Accessibility className="h-4 w-4" />}
          title="Accessibility Issues"
          delay={0.2}
        >
          <BulletList items={premium.accessibilityIssues} />
        </SectionCard>

        {/* SEO Basics */}
        <SectionCard icon={<Search className="h-4 w-4" />} title="SEO Basics" delay={0.25}>
          <ul className="space-y-3">
            {premium.seoBasics.map((item, i) => (
              <li
                key={i}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <p className="text-sm font-semibold text-white/85">{item.issue}</p>
                <p className="mt-1 text-sm leading-relaxed text-white/50">{item.fix}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* CTA Variations */}
      <div className="mt-4">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#5B8CFF]/25 bg-gradient-to-br from-[#5B8CFF]/20 to-[#7C5BFF]/10 text-[#A9C2FF] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <MessageSquareText className="h-4 w-4" />
          </div>
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-white/70">
            CTA Variations
          </h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {premium.ctaVariations.map((cta, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: 0.05 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl"
            >
              <span className="inline-block rounded-lg border border-[#5B8CFF]/30 bg-[#5B8CFF]/10 px-3 py-1.5 text-sm font-semibold text-white">
                {cta.text}
              </span>
              <p className="mt-2.5 text-sm leading-relaxed text-white/50">{cta.rationale}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Priority Action Plan */}
      <div className="mt-4">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#5B8CFF]/25 bg-gradient-to-br from-[#5B8CFF]/20 to-[#7C5BFF]/10 text-[#A9C2FF] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <ListChecks className="h-4 w-4" />
          </div>
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-white/70">
            Priority Action Plan
          </h3>
        </div>
        <div className="space-y-3">
          {premium.priorityActionPlan
            .slice()
            .sort((a, b) => a.step - b.step)
            .map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: 0.05 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-start gap-4 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl sm:p-5"
              >
                <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#5B8CFF]/30 bg-gradient-to-br from-[#5B8CFF]/25 to-[#7C5BFF]/15 text-sm font-semibold text-[#A9C2FF]">
                  {item.step}
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold tracking-tight text-white">
                    {item.action}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-white/50">
                    {item.expectedImpact}
                  </p>
                </div>
              </motion.div>
            ))}
        </div>
      </div>

      {/* Revenue Opportunity — highlighted */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative mt-6 overflow-hidden rounded-2xl border border-[#3DDC97]/25 bg-gradient-to-b from-[#3DDC97]/[0.08] to-white/[0.015] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_30px_80px_-40px_rgba(61,220,151,0.35)] backdrop-blur-2xl sm:p-8"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full bg-[#3DDC97]/20 blur-3xl"
        />
        <div className="relative flex items-start gap-3">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#3DDC97]/30 bg-gradient-to-br from-[#3DDC97]/25 to-[#3DDC97]/10 text-[#3DDC97] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
            <DollarSign className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">
              Revenue Opportunity
            </h3>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[#3DDC97] sm:text-3xl">
              {premium.revenueOpportunity.estimateRange}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/60">
              {premium.revenueOpportunity.rationale}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Download PDF */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-between"
      >
        <p className="text-xs text-white/40">
          Download this audit as a PDF to share with your team or keep for reference.
        </p>
        <button
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf}
          className="group/pdf relative inline-flex shrink-0 items-center gap-2 overflow-hidden rounded-xl border border-white/[0.1] bg-gradient-to-b from-white/[0.08] to-white/[0.02] px-4 py-2.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition-all duration-300 hover:border-[#5B8CFF]/30 hover:from-white/[0.1] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGeneratingPdf ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#A9C2FF]" />
          ) : (
            <Download className="h-4 w-4 text-[#A9C2FF]" />
          )}
          <span>{isGeneratingPdf ? "Preparing PDF…" : "Download PDF"}</span>
        </button>
        {pdfError && (
          <p className="text-xs text-[#FF5C7A]">Couldn't generate the PDF — please try again.</p>
        )}
      </motion.div>
    </section>
  );
}

export default PremiumReport;
