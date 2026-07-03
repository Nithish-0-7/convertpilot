import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Lock,
  ArrowLeft,
  Sparkles,
  TrendingDown,
  CheckCircle2,
} from "lucide-react";

type LeakItem = {
  title: string;
  teaser: string;
  severity: string;
  impact: string;
};

const DEFAULT_LEAKS: LeakItem[] = [
  {
    title: "Weak Hero CTA",
    teaser: "Your primary call-to-action is easy to miss and unclear about the next step.",
    severity: "High",
    impact: "~$8,400/mo",
  },
  {
    title: "Trust Signals Missing",
    teaser: "No visible social proof, reviews, or recognizable logos above the fold.",
    severity: "High",
    impact: "~$5,200/mo",
  },
  {
    title: "Mobile Friction",
    teaser: "Key tap targets and form fields are misaligned on smaller screens.",
    severity: "Medium",
    impact: "~$3,100/mo",
  },
];

const LOCKED_SECTIONS = [
  "Hero Rewrite",
  "CTA Variants",
  "Trust Improvements",
  "Conversion Improvements",
  "Mobile UX Review",
  "SEO Basics",
  "Accessibility Check",
  "Priority Action Plan",
  "Estimated Revenue Impact",
];

function scoreColor(s: number) {
  if (s <= 40) return "#FF5C7A";
  if (s <= 70) return "#FFB155";
  return "#3DDC97";
}

function scoreLabel(s: number) {
  if (s <= 40) return "Critical — losing revenue daily";
  if (s <= 70) return "Underperforming — meaningful upside";
  return "Solid — minor optimizations available";
}

function useCountUp(target: number, duration = 1600) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

function Gauge({ score }: { score: number }) {
  const size = 260;
  const stroke = 10;
  const r = (size - stroke) / 2 - 6;
  const c = 2 * Math.PI * r;
  const v = useCountUp(score);
  const color = scoreColor(score);
  const offset = c - (v / 100) * c;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {/* halo */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${color}40 0%, transparent 65%)` }}
      />
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.95" />
            <stop offset="100%" stopColor={color} stopOpacity="0.65" />
          </linearGradient>
          <filter id="gaugeGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* tick ring */}
        {Array.from({ length: 60 }).map((_, i) => {
          const a = (i / 60) * Math.PI * 2;
          const inner = r + stroke / 2 + 4;
          const outer = inner + (i % 5 === 0 ? 6 : 3);
          const x1 = size / 2 + Math.cos(a) * inner;
          const y1 = size / 2 + Math.sin(a) * inner;
          const x2 = size / 2 + Math.cos(a) * outer;
          const y2 = size / 2 + Math.sin(a) * outer;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={i % 5 === 0 ? 1.2 : 0.6}
            />
          );
        })}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#gaugeGrad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          filter="url(#gaugeGlow)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[11px] uppercase tracking-[0.24em] text-white/40">
          Revenue Score
        </div>
        <div
          className="mt-1 text-[88px] font-semibold leading-none tabular-nums tracking-[-0.05em]"
          style={{ color, textShadow: `0 0 28px ${color}55` }}
        >
          {v}
        </div>
        <div className="mt-1 text-xs font-medium text-white/40">out of 100</div>
      </div>
    </div>
  );
}

export default function Results({
  url,
  score,
  leaks,
  onReset,
}: {
  url: string;
  score: number;
  leaks?: LeakItem[];
  onReset: () => void;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const color = scoreColor(score);
  const items = leaks && leaks.length > 0 ? leaks : DEFAULT_LEAKS;
  const issues = 3 + Math.floor((100 - score) / 10);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-5 pt-10 pb-44 sm:px-6 sm:pt-12">
      <div className="flex items-center justify-between">
        <button
          onClick={onReset}
          className="group inline-flex items-center gap-1.5 text-xs text-white/50 transition hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          New audit
        </button>
        <div className="text-xs text-white/40">
          Audited{" "}
          <span className="font-medium text-white/75">
            {url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </span>
        </div>
      </div>

      {/* Score hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative mt-8 overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.015] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_30px_80px_-40px_rgba(91,140,255,0.4)] backdrop-blur-2xl sm:p-10"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[640px] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: `${color}33` }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
        />
        <div className="relative flex flex-col items-center gap-8 md:flex-row md:items-center md:justify-between md:gap-12">
          <Gauge score={score} />
          <div className="flex-1 text-center md:text-left">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium backdrop-blur-md"
              style={{ borderColor: `${color}55`, color, background: `${color}1A` }}
            >
              <span
                className="h-1.5 w-1.5 animate-pulse rounded-full"
                style={{ background: color, boxShadow: `0 0 8px ${color}` }}
              />
              {scoreLabel(score)}
            </motion.div>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
              You're leaving money on the table.
            </h2>
            <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-white/55 sm:text-[15px]">
              We found {issues} issues across your hero, trust signals, and mobile experience. The
              top three are below — the rest are in your unlocked report.
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-white/50 md:justify-start">
              <span className="inline-flex items-center gap-1.5">
  <TrendingDown className="h-3.5 w-3.5 text-[#FF5C7A]" />
  Est. monthly leak {leaks?.[0]?.impact ?? "Unknown"}
</span>
              <span className="hidden h-3 w-px bg-white/10 sm:block" />
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#3DDC97]" />
                {issues} actionable fixes
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Top leaks */}
      <div className="mt-14">
        <div className="mb-5 flex items-end justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">
            Top Revenue Leaks
          </h3>
          <span className="text-xs text-white/35">Free preview · 3 of 12</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((l, i) => (
            <motion.div
              key={l.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-[#FF5C7A]/30 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_60px_-30px_rgba(255,92,122,0.4)]"
            >
              <div className="absolute left-0 top-4 h-12 w-[3px] rounded-r-full bg-gradient-to-b from-[#FF5C7A] to-[#FFB155] shadow-[0_0_12px_rgba(255,92,122,0.6)]" />
              <div className="mb-3 flex items-center justify-between">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#FF5C7A]/25 bg-gradient-to-br from-[#FF5C7A]/20 to-[#FFB155]/10 text-[#FF5C7A] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <span className="rounded-full border border-[#FF5C7A]/25 bg-[#FF5C7A]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#FF5C7A]/90">
                  {l.severity}
                </span>
              </div>
              <h4 className="text-[15px] font-semibold tracking-tight text-white">{l.title}</h4>
              <p className="mt-1.5 text-sm leading-relaxed text-white/55">{l.teaser}</p>
              <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-xs">
                <span className="text-white/40">Est. impact</span>
                <span className="font-semibold tabular-nums text-white/80">{l.impact}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Locked preview */}
      <div className="mt-16">
        <div className="mb-5 flex items-end justify-between">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50">
            Full Report Preview
          </h3>
          <span className="inline-flex items-center gap-1.5 text-xs text-white/40">
            <Lock className="h-3 w-3" /> 9 sections locked
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LOCKED_SECTIONS.map((label, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.04, duration: 0.5 }}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl transition-all duration-500 hover:border-white/15"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold tracking-tight text-white/90">{label}</span>
                <Lock className="h-3.5 w-3.5 text-white/30 transition-colors group-hover:text-white/60" />
              </div>
              <div
                className="space-y-2.5 select-none"
                style={{ filter: "blur(7px)", opacity: 0.7 }}
                aria-hidden
              >
                <div className="h-2.5 w-3/4 rounded-full bg-white/20" />
                <div className="h-2.5 w-full rounded-full bg-white/10" />
                <div className="h-2.5 w-2/3 rounded-full bg-white/10" />
                <div className="mt-3 h-20 w-full rounded-lg bg-gradient-to-br from-white/10 to-white/5" />
                <div className="h-2.5 w-1/2 rounded-full bg-white/10" />
                <div className="h-2.5 w-3/5 rounded-full bg-white/10" />
              </div>
              {/* fade */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#07090F] via-[#07090F]/80 to-transparent" />
              {/* lock chip */}
              <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-white/70 backdrop-blur-xl transition-all duration-500 group-hover:border-[#5B8CFF]/40 group-hover:text-white">
                  <Lock className="h-3 w-3" />
                  Unlock to view
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Sticky unlock CTA */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-6 sm:pb-6"
      >
        <div className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/[0.1] bg-[#0B0F18]/85 p-2.5 pl-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_30px_80px_-20px_rgba(91,140,255,0.45)] backdrop-blur-2xl sm:pl-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#5B8CFF]/30 bg-gradient-to-br from-[#5B8CFF]/25 to-[#7C5BFF]/15 text-[#A9C2FF] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] sm:inline-flex">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold sm:text-sm">
                Unlock Full Revenue Audit
              </div>
              <div className="truncate text-[11px] text-white/50 sm:text-xs">
                12 sections · prioritized fix plan · PDF export
              </div>
            </div>
          </div>
          <button
            onClick={() => showToast("Checkout coming soon")}
            className="group/cta relative inline-flex shrink-0 items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-b from-[#7AA2FF] to-[#4F7DF5] px-4 py-2.5 text-sm font-semibold text-[#07090F] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_0_0_1px_rgba(91,140,255,0.4),0_14px_40px_-10px_rgba(91,140,255,0.9)] transition-all duration-300 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_0_0_1px_rgba(91,140,255,0.6),0_18px_50px_-10px_rgba(91,140,255,1)] active:scale-[0.97] sm:px-5"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 transition-all duration-700 group-hover/cta:translate-x-full group-hover/cta:opacity-100" />
            <Lock className="relative h-4 w-4" />
            <span className="relative">Unlock — $19</span>
          </button>
        </div>
      </motion.div>

      {/* Toast */}
      <div className="pointer-events-none fixed inset-x-0 top-6 z-50 flex justify-center">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="rounded-full border border-white/15 bg-white/[0.08] px-4 py-2 text-sm text-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}