import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";

const STATUSES = [
  "Scanning website…",
  "Analyzing hero copy…",
  "Detecting revenue leaks…",
  "Scoring conversion signals…",
  "Finalizing report…",
];

const DURATION_MS = 6000;

export default function Loading({ url, onDone }: { url: string; onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / DURATION_MS);
      setProgress(p * 100);
      if (p < 1) raf = requestAnimationFrame(tick);
      else onDone();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  useEffect(() => {
    const id = setInterval(
      () => setStepIdx((i) => (i + 1) % STATUSES.length),
      DURATION_MS / STATUSES.length,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-6">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
        className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#5B8CFF]/30 bg-[#5B8CFF]/10 text-[#5B8CFF]"
      >
        <Loader2 className="h-6 w-6" />
      </motion.div>

      <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
        Auditing{" "}
        <span className="text-[#5B8CFF]">{url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
      </h2>
      <p className="mt-2 text-sm text-white/50">This typically takes 5–10 seconds.</p>

      <div className="mt-10 w-full">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#5B8CFF] to-[#7C5BFF]"
            style={{ width: `${progress}%` }}
          />
          <motion.div
            className="absolute inset-y-0 w-24 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent"
            animate={{ x: ["-10%", "110%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-white/40">
          <div className="relative h-5 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.span
                key={stepIdx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="block text-white/70"
              >
                {STATUSES[stepIdx]}
              </motion.span>
            </AnimatePresence>
          </div>
          <span className="tabular-nums text-white/50">{Math.round(progress)}%</span>
        </div>
      </div>
    </section>
  );
}