import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Search,
  Gauge,
  Unlock,
  AlertCircle,
  Star,
} from "lucide-react";

const TESTIMONIALS = [
  { q: "Found $43k/yr in leaks we'd missed for two years.", a: "Maya R., Head of Growth" },
  { q: "Brutal, specific, and right. We shipped fixes the same day.", a: "Daniel K., Founder" },
  { q: "Cheaper than one hour with our agency. Sharper too.", a: "Priya S., DTC Operator" },
];

const STEPS = [
  { icon: Search, label: "Analyze", desc: "We scan your live site like a skeptical buyer would." },
  { icon: Gauge, label: "Score", desc: "Get a 0–100 Revenue Score in under sixty seconds." },
  { icon: Unlock, label: "Unlock", desc: "See every leak with a prioritized fix plan." },
];

function isValidUrl(v: string) {
  return /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i.test(v.trim());
}

export default function Landing({ onAnalyze }: { onAnalyze: (url: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tIndex, setTIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTIndex((i) => (i + 1) % TESTIMONIALS.length), 4500);
    return () => clearInterval(id);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = value.trim();
    if (!v) return setError("Please enter a valid URL");
    if (!isValidUrl(v)) return setError("That doesn't look like a valid URL");
    setError(null);
    onAnalyze(v.startsWith("http") ? v : `https://${v}`);
  };

  return (
    <section className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center px-5 pt-16 pb-24 sm:px-6 sm:pt-28">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-white/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl"
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3DDC97] opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#3DDC97]" />
        </span>
        Powered by Claude · 10,000+ sites audited
      </motion.div>

      <h1 className="max-w-4xl text-balance text-center text-[2.5rem] font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl md:text-[5rem]">
        Your website is quietly{" "}
        <span className="relative inline-block">
          <span className="bg-gradient-to-br from-[#A9C2FF] via-[#7C5BFF] to-[#FF5C7A] bg-clip-text text-transparent">
            bleeding revenue.
          </span>
          <span
            aria-hidden
            className="absolute inset-x-0 -bottom-1 h-px bg-gradient-to-r from-transparent via-[#7C5BFF]/50 to-transparent"
          />
        </span>
      </h1>
      <p className="mt-6 max-w-xl text-balance text-center text-base leading-relaxed text-white/55 sm:mt-7 sm:text-lg">
        Most sites lose 20–40% of revenue to small, fixable issues. Get a brutally honest AI audit
        in under 60 seconds — no fluff, no signup.
      </p>

      <form onSubmit={submit} className="mt-9 w-full max-w-2xl sm:mt-11">
        <div
          className={`group relative flex items-center gap-2 rounded-2xl border bg-white/[0.04] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_20px_60px_-30px_rgba(91,140,255,0.5)] backdrop-blur-xl transition-all duration-300 ${
            error
              ? "border-red-500/60"
              : "border-white/10 focus-within:border-[#5B8CFF]/50 focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_4px_rgba(91,140,255,0.08),0_20px_60px_-20px_rgba(91,140,255,0.55)]"
          }`}
        >
          <div className="select-none pl-3 pr-1 text-sm text-white/35">https://</div>
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            placeholder="yourstore.com"
            className="min-w-0 flex-1 bg-transparent py-3 text-[15px] text-white placeholder:text-white/25 focus:outline-none sm:text-base"
            aria-label="Website URL"
          />
          <button
            type="submit"
            className="group/btn relative inline-flex shrink-0 items-center gap-1.5 overflow-hidden rounded-xl bg-gradient-to-b from-[#7AA2FF] to-[#4F7DF5] px-4 py-2.5 text-sm font-semibold text-[#07090F] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_0_0_1px_rgba(91,140,255,0.4),0_10px_30px_-8px_rgba(91,140,255,0.8)] transition-all duration-300 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_0_0_1px_rgba(91,140,255,0.6),0_14px_40px_-8px_rgba(91,140,255,1)] active:scale-[0.97] sm:px-5 sm:py-3"
          >
            <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 transition-all duration-700 group-hover/btn:translate-x-full group-hover/btn:opacity-100" />
            <span className="relative">Analyze</span>
            <ArrowRight className="relative h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
          </button>
        </div>
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-3 flex items-center gap-2 pl-2 text-sm text-red-400"
            >
              <AlertCircle className="h-4 w-4" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Trust */}
      <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-xs text-white/45 sm:mt-8">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-[#3DDC97]" />
          No signup. No spam.
        </span>
        <span className="hidden h-3 w-px bg-white/10 sm:block" />
        <span className="inline-flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="h-3 w-3 fill-[#FFB155] text-[#FFB155]" />
          ))}
          <span className="ml-1.5 text-white/55">4.9 · 2,300 reviews</span>
        </span>
        <span className="hidden h-3 w-px bg-white/10 sm:block" />
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-[#5B8CFF]" />
          60-second audit
        </span>
      </div>

      {/* Rotating testimonial */}
      <div className="relative mt-14 h-16 w-full max-w-xl">
        <AnimatePresence mode="wait">
          <motion.blockquote
            key={tIndex}
            initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 text-center"
          >
            <p className="text-[15px] font-medium italic leading-snug text-white/75">
              “{TESTIMONIALS[tIndex].q}”
            </p>
            <footer className="mt-2 text-xs tracking-wide text-white/40">
              — {TESTIMONIALS[tIndex].a}
            </footer>
          </motion.blockquote>
        </AnimatePresence>
      </div>

      {/* How it works */}
      <div className="mt-24 w-full sm:mt-28">
        <h2 className="text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-white/40">
          How it works
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: 0.06 * i, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.015] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl transition-all duration-500 hover:-translate-y-1 hover:border-white/20 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_30px_60px_-30px_rgba(91,140,255,0.4)]"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -top-px left-1/2 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#5B8CFF]/25 bg-gradient-to-br from-[#5B8CFF]/20 to-[#7C5BFF]/10 text-[#A9C2FF] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="flex items-baseline gap-2 text-[15px] font-semibold tracking-tight text-white">
                <span className="tabular-nums text-white/30">{String(i + 1).padStart(2, "0")}</span>
                {s.label}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}