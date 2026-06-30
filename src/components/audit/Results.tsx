import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Lock, ArrowLeft, Sparkles } from "lucide-react";

const LEAKS = [
  {
    title: "Weak Hero CTA",
    teaser: "Your primary call-to-action is easy to miss and unclear.",
    severity: "High",
  },
  {
    title: "Trust Signals Missing",
    teaser: "No visible social proof above the fold.",
    severity: "High",
  },
  {
    title: "Mobile Friction",
    teaser: "Key elements are misaligned on smaller screens.",
    severity: "Medium",
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

function useCountUp(target: number, duration = 1500) {
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
  const size = 240;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = useCountUp(score);
  const color = scoreColor(score);
  const offset = c - (v / 100) * c;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
          style={{ filter: `drop-shadow(0 0 12px ${color}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="text-7xl font-semibold tabular-nums tracking-tight"
          style={{ color }}
        >
          {v}
        </div>
        <div className="text-xs uppercase tracking-[0.2em] text-white/40">Revenue Score</div>
      </div>
    </div>
  );
}

export default function Results({
  url,
  score,
  onReset,
}: {
  url: string;
  score: number;
  onReset: () => void;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const color = scoreColor(score);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pt-12 pb-40">
      <div className="flex items-center justify-between">
        <button
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-xs text-white/50 transition hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> New audit
        </button>
        <div className="text-xs text-white/40">
          Audited <span className="text-white/70">{url.replace(/^https?:\/\//, "")}</span>
        </div>
      </div>

      {/* Score hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="relative mt-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-8 backdrop-blur-xl sm:p-12"
      >
        <div
          className="absolute -top-32 left-1/2 h-64 w-[480px] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: `${color}33` }}
        />
        <div className="relative flex flex-col items-center gap-6 md:flex-row md:items-center md:justify-between md:gap-12">
          <Gauge score={score} />
          <div className="flex-1 text-center md:text-left">
            <div
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
              style={{ borderColor: `${color}55`, color, background: `${color}1A` }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
              {scoreLabel(score)}
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
              You're leaving money on the table.
            </h2>
            <p className="mt-3 max-w-md text-sm text-white/55">
              We found {3 + Math.floor((100 - score) / 10)} issues across your hero, trust signals,
              and mobile experience. The top three are below — the rest are in your unlocked
              report.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Top leaks */}
      <div className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">
            Top Revenue Leaks
          </h3>
          <span className="text-xs text-white/30">Free preview · 3 of 12</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {LEAKS.map((l, i) => (
            <motion.div
              key={l.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl transition hover:border-[#FF5C7A]/30 hover:bg-white/[0.05]"
            >
              <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-[#FF5C7A] to-[#FFB155]" />
              <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#FF5C7A]/30 bg-[#FF5C7A]/10 text-[#FF5C7A]">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold text-white">{l.title}</h4>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#FF5C7A]/80">
                  {l.severity}
                </span>
              </div>
              <p className="mt-1.5 text-sm text-white/55">{l.teaser}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Locked preview */}
      <div className="mt-14">
        <div className="mb-4 flex items-end justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">
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
              transition={{ delay: 0.4 + i * 0.05, duration: 0.45 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{label}</span>
                <Lock className="h-3.5 w-3.5 text-white/30" />
              </div>
              <div className="space-y-2 [filter:blur(6px)]">
                <div className="h-2.5 w-3/4 rounded bg-white/15" />
                <div className="h-2.5 w-full rounded bg-white/10" />
                <div className="h-2.5 w-2/3 rounded bg-white/10" />
                <div className="mt-3 h-16 w-full rounded-lg bg-white/8" />
                <div className="h-2.5 w-1/2 rounded bg-white/10" />
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0A0E14] to-transparent" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Sticky unlock CTA */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sm:px-6 sm:pb-6"
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0A0E14]/80 p-3 pl-5 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(91,140,255,0.4)]">
          <div className="flex items-center gap-3">
            <div className="hidden h-9 w-9 items-center justify-center rounded-lg border border-[#5B8CFF]/30 bg-[#5B8CFF]/10 text-[#5B8CFF] sm:inline-flex">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">Unlock Full Revenue Audit</div>
              <div className="text-xs text-white/50">12 sections · prioritized fix plan · PDF export</div>
            </div>
          </div>
          <button
            onClick={() => showToast("Checkout coming soon")}
            className="group inline-flex items-center gap-2 rounded-xl bg-[#5B8CFF] px-4 py-2.5 text-sm font-semibold text-[#0A0E14] transition hover:bg-[#7AA2FF] active:scale-[0.98] sm:px-5"
          >
            <Lock className="h-4 w-4" />
            Unlock — $19
          </button>
        </div>
      </motion.div>

      {/* Toast */}
      <div className="pointer-events-none fixed inset-x-0 top-6 z-50 flex justify-center">
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-xl"
          >
            {toast}
          </motion.div>
        )}
      </div>
    </section>
  );
}