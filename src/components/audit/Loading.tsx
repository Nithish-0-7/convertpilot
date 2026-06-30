import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Check } from "lucide-react";

const STATUSES = [
  "Fetching DOM and assets…",
  "Reading hero copy & CTA hierarchy…",
  "Detecting revenue leaks…",
  "Scoring conversion signals…",
  "Compiling your audit…",
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
      () => setStepIdx((i) => Math.min(STATUSES.length - 1, i + 1)),
      DURATION_MS / STATUSES.length,
    );
    return () => clearInterval(id);
  }, []);

  const host = url.replace(/^https?:\/\//, "").replace(/\/$/, "");

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-5 sm:px-6">
      {/* Orbiting glyph */}
      <div className="relative mb-10 h-28 w-28">
        <motion.div
          className="absolute inset-0 rounded-full border border-[#5B8CFF]/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-[#5B8CFF] shadow-[0_0_12px_rgba(91,140,255,0.9)]" />
        </motion.div>
        <motion.div
          className="absolute inset-2 rounded-full border border-[#7C5BFF]/20"
          animate={{ rotate: -360 }}
          transition={{ duration: 11, repeat: Infinity, ease: "linear" }}
        >
          <span className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[#7C5BFF] shadow-[0_0_10px_rgba(124,91,255,0.9)]" />
        </motion.div>
        <motion.div
          className="absolute inset-5 rounded-full border border-white/10"
          animate={{ rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#5B8CFF]/30 bg-gradient-to-br from-[#5B8CFF]/30 to-[#7C5BFF]/20 text-[#A9C2FF] shadow-[0_0_30px_rgba(91,140,255,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-xl">
            <Sparkles className="h-5 w-5" />
          </div>
        </motion.div>
      </div>

      <h2 className="text-balance text-center text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
        Auditing{" "}
        <span className="bg-gradient-to-r from-[#A9C2FF] to-[#7C5BFF] bg-clip-text text-transparent">
          {host}
        </span>
      </h2>
      <p className="mt-2 text-sm text-white/45">This typically takes 5–10 seconds.</p>

      <div className="mt-12 w-full">
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06] shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#5B8CFF] via-[#7C5BFF] to-[#FF5C7A] shadow-[0_0_14px_rgba(124,91,255,0.6)]"
            style={{ width: `${progress}%` }}
          />
          <motion.div
            className="absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-white/50 to-transparent"
            animate={{ x: ["-20%", "120%"] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <div className="mt-5 flex items-center justify-between gap-4 text-xs">
          <div className="relative h-5 flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.span
                key={stepIdx}
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="block text-white/75"
              >
                {STATUSES[stepIdx]}
              </motion.span>
            </AnimatePresence>
          </div>
          <span className="tabular-nums text-white/45">{Math.round(progress)}%</span>
        </div>

        {/* Step checklist */}
        <ul className="mt-8 space-y-2.5">
          {STATUSES.map((s, i) => {
            const done = i < stepIdx;
            const active = i === stepIdx;
            return (
              <li
                key={s}
                className={`flex items-center gap-3 text-sm transition-colors duration-500 ${
                  done ? "text-white/55" : active ? "text-white" : "text-white/25"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-500 ${
                    done
                      ? "border-[#3DDC97]/40 bg-[#3DDC97]/15 text-[#3DDC97]"
                      : active
                        ? "border-[#5B8CFF]/50 bg-[#5B8CFF]/15 text-[#A9C2FF]"
                        : "border-white/10 bg-white/[0.02] text-white/30"
                  }`}
                >
                  {done ? (
                    <Check className="h-3 w-3" />
                  ) : active ? (
                    <motion.span
                      className="h-1.5 w-1.5 rounded-full bg-[#A9C2FF]"
                      animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
                  )}
                </span>
                {s}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}