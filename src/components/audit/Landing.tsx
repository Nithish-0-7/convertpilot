import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ShieldCheck, Sparkles, Search, Gauge, Unlock, AlertCircle } from "lucide-react";

const TESTIMONIALS = [
  { q: "Found $43k/yr in leaks we'd missed for two years.", a: "Maya R., Head of Growth" },
  { q: "Brutal, specific, and right. We shipped fixes the same day.", a: "Daniel K., Founder" },
  { q: "Cheaper than one hour with our agency. Sharper too.", a: "Priya S., DTC Operator" },
];

const PAY_BADGES = ["VISA", "MC", "AMEX", " Pay", "G Pay"];

const STEPS = [
  { icon: Search, label: "Analyze", desc: "We scan your live site like a skeptical buyer." },
  { icon: Gauge, label: "Score", desc: "Get a 0–100 Revenue Score in under a minute." },
  { icon: Unlock, label: "Unlock", desc: "See every leak, with a prioritized fix plan." },
];

function isValidUrl(v: string) {
  return /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/i.test(v.trim());
}

export default function Landing({ onAnalyze }: { onAnalyze: (url: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tIndex, setTIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTIndex((i) => (i + 1) % TESTIMONIALS.length), 4200);
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
    <section className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center px-6 pt-20 pb-24 sm:pt-28">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/70 backdrop-blur"
      >
        <Sparkles className="h-3.5 w-3.5 text-[#5B8CFF]" />
        Powered by Claude · 10,000+ sites audited
      </motion.div>

      <h1 className="max-w-4xl text-center text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
        Your website is quietly{" "}
        <span className="bg-gradient-to-r from-[#5B8CFF] via-[#7C5BFF] to-[#5B8CFF] bg-clip-text text-transparent">
          bleeding revenue.
        </span>
      </h1>
      <p className="mt-6 max-w-2xl text-center text-base text-white/60 sm:text-lg">
        Most sites lose 20–40% of potential revenue to small, fixable issues. Get a brutally honest
        AI audit in under 60 seconds — no fluff, no signup.
      </p>

      <form onSubmit={submit} className="mt-10 w-full max-w-2xl">
        <div
          className={`group relative flex items-center gap-2 rounded-2xl border bg-white/[0.04] p-2 backdrop-blur-xl transition ${
            error ? "border-red-500/60" : "border-white/10 focus-within:border-[#5B8CFF]/60"
          }`}
        >
          <div className="pl-3 text-white/40">https://</div>
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            placeholder="yourstore.com"
            className="flex-1 bg-transparent py-3 text-base text-white placeholder:text-white/30 focus:outline-none"
            aria-label="Website URL"
          />
          <button
            type="submit"
            className="group/btn relative inline-flex items-center gap-2 rounded-xl bg-[#5B8CFF] px-5 py-3 text-sm font-semibold text-[#0A0E14] shadow-[0_0_0_1px_rgba(91,140,255,0.4),0_8px_30px_-8px_rgba(91,140,255,0.7)] transition hover:bg-[#7AA2FF] hover:shadow-[0_0_0_1px_rgba(91,140,255,0.6),0_12px_40px_-8px_rgba(91,140,255,0.9)] active:scale-[0.98] disabled:opacity-50"
          >
            Analyze Website
            <ArrowRight className="h-4 w-4 transition group-hover/btn:translate-x-0.5" />
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

      {/* Trust badges */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs text-white/40">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          No signup. No spam.
        </span>
        <span className="hidden h-3 w-px bg-white/10 sm:block" />
        <div className="flex items-center gap-2">
          {PAY_BADGES.map((b) => (
            <span
              key={b}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-semibold tracking-wider text-white/50"
            >
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* Rotating testimonial */}
      <div className="relative mt-12 h-14 w-full max-w-xl">
        <AnimatePresence mode="wait">
          <motion.blockquote
            key={tIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 text-center"
          >
            <p className="text-sm italic text-white/70">"{TESTIMONIALS[tIndex].q}"</p>
            <footer className="mt-1.5 text-xs text-white/40">— {TESTIMONIALS[tIndex].a}</footer>
          </motion.blockquote>
        </AnimatePresence>
      </div>

      {/* How it works */}
      <div className="mt-20 w-full">
        <h2 className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-white/40">
          How it works
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl transition hover:border-white/20 hover:bg-white/[0.05]"
            >
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#5B8CFF]/30 bg-[#5B8CFF]/10 text-[#5B8CFF]">
                <s.icon className="h-5 w-5" />
              </div>
              <div className="text-sm font-semibold text-white">
                {String(i + 1).padStart(2, "0")} · {s.label}
              </div>
              <p className="mt-1.5 text-sm text-white/55">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}