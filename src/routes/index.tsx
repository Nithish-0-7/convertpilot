import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Landing from "@/components/audit/Landing";
import Loading from "@/components/audit/Loading";
import Results from "@/components/audit/Results";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Revenue Audit — Find what's costing your site sales" },
      {
        name: "description",
        content:
          "A brutally honest AI audit of your website. Get a Revenue Score in 60 seconds and uncover the leaks costing you sales.",
      },
      { property: "og:title", content: "AI Revenue Audit" },
      {
        property: "og:description",
        content: "A brutally honest AI audit of your website. Get a Revenue Score in 60 seconds.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [phase, setPhase] = useState<"landing" | "loading" | "results">("landing");
  const [url, setUrl] = useState("");
  const [score, setScore] = useState(47);

  const handleAnalyze = (input: string) => {
    setUrl(input);
    setScore(Math.floor(30 + Math.random() * 36));
    setPhase("loading");
  };

  return (
    <div className="min-h-screen bg-[#0A0E14] text-white antialiased selection:bg-[#5B8CFF]/30 selection:text-white">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[#5B8CFF]/10 blur-[140px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[600px] rounded-full bg-[#7C5BFF]/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.04)_1px,transparent_0)] [background-size:32px_32px]" />
      </div>

      <div className="relative">
        <AnimatePresence mode="wait">
          {phase === "landing" && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <Landing onAnalyze={handleAnalyze} />
            </motion.div>
          )}
          {phase === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Loading url={url} onDone={() => setPhase("results")} />
            </motion.div>
          )}
          {phase === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              <Results url={url} score={score} onReset={() => setPhase("landing")} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
