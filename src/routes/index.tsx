import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Landing from "@/components/audit/Landing";
import Loading from "@/components/audit/Loading";
import Results from "@/components/audit/Results";
import type { Analysis } from "@/components/lib/gemini";

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
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [minDone, setMinDone] = useState(false);
  const requestId = useRef(0);

  const handleAnalyze = useCallback(async (input: string) => {
    const id = ++requestId.current;
    setUrl(input);
    setAnalysis(null);
    setFetchError(null);
    setMinDone(false);
    setPhase("loading");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: input }),
      });
      const data = (await res.json().catch(() => ({}))) as Analysis & {
        error?: string;
        score?: number;
        leaks?: { title: string; teaser: string; severity: string; impact: string }[];
      };
      if (id !== requestId.current) return;
      if (!res.ok || typeof data?.score !== "number" || !Array.isArray(data?.leaks)) {
        setFetchError(data?.error || "Analysis failed. Please try again.");
        return;
      }
      // Keep the full response (including `premium`) instead of cherry-picking fields
      setAnalysis(data);
    } catch {
      if (id !== requestId.current) return;
      setFetchError("Network error. Please try again.");
    }
  }, []);

  useEffect(() => {
    if (phase !== "loading" || !minDone) return;
    if (fetchError) setPhase("landing");
    else if (analysis) setPhase("results");
  }, [phase, analysis, fetchError, minDone]);

  return (
    <div className="min-h-screen bg-[#07090F] text-white antialiased selection:bg-[#5B8CFF]/30 selection:text-white [font-feature-settings:'ss01','cv11']">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* aurora blobs */}
        <motion.div
          aria-hidden
          className="absolute -top-48 left-1/2 h-[720px] w-[1100px] -translate-x-1/2 rounded-full bg-[#5B8CFF]/[0.14] blur-[160px]"
          animate={{ opacity: [0.7, 1, 0.7], scale: [1, 1.04, 1] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute -bottom-32 -right-32 h-[520px] w-[720px] rounded-full bg-[#7C5BFF]/[0.13] blur-[150px]"
          animate={{ opacity: [0.5, 0.9, 0.5], scale: [1, 1.06, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <motion.div
          aria-hidden
          className="absolute top-1/3 -left-32 h-[420px] w-[620px] rounded-full bg-[#3DDC97]/[0.06] blur-[140px]"
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        />
        {/* dot grid */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.035)_1px,transparent_0)] [background-size:34px_34px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_85%)]" />
        {/* film grain */}
        <div
          className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
          }}
        />
        {/* top vignette */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
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
              <Landing onAnalyze={handleAnalyze} initialError={fetchError} />
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
              <Loading url={url} onDone={() => setMinDone(true)} />
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

              <Results
                url={url}
                score={analysis?.score ?? 0}
                leaks={analysis?.leaks}
                analysis={analysis}
                onReset={() => setPhase("landing")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
