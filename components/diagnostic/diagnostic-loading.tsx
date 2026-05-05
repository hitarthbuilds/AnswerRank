"use client";

import { useEffect, useMemo, useState } from "react";
import { AnswerRankMark, FeatureBadge } from "@/components/brand/logo";

type DiagnosticLoadingProps = {
  productName?: string;
  query?: string;
  mode?: "diagnostic" | "fix-it";
};

type LoadingStep = {
  label: string;
  description: string;
};

const diagnosticSteps: LoadingStep[] = [
  {
    label: "Validating product and buyer-intent query",
    description: "Checking the core product context before the diagnostic runs.",
  },
  {
    label: "Extracting product-page context",
    description: "Reading the listing surface and preparing structured context.",
  },
  {
    label: "Querying AI answer engines",
    description: "Reading the buying answer surface for brand visibility.",
  },
  {
    label: "Detecting product and competitor mentions",
    description: "Comparing presence, ranking position, and surfaced brands.",
  },
  {
    label: "Calculating AEO visibility score",
    description: "Scoring mention frequency, rank depth, and coverage confidence.",
  },
  {
    label: "Preparing recommendations",
    description: "Turning answer-engine gaps into listing actions.",
  },
];

const fixItSteps: LoadingStep[] = [
  {
    label: "Reading visibility gaps",
    description: "Scanning the report to identify where the listing loses ground.",
  },
  {
    label: "Identifying competitor strengths",
    description: "Pulling out the trust, ranking, and clarity cues that win.",
  },
  {
    label: "Rewriting product title",
    description: "Sharpening the buyer-intent fit and product framing.",
  },
  {
    label: "Generating listing bullets",
    description: "Improving the scannability of benefits and proof points.",
  },
  {
    label: "Preparing FAQs and positioning",
    description: "Packaging clearer answers for AI summaries and shoppers.",
  },
];

function StepDot({
  index,
  active,
  complete,
}: {
  index: number;
  active: boolean;
  complete: boolean;
}) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border text-xs font-semibold transition ${
        complete
          ? "border-emerald-300/60 bg-emerald-400/20 text-emerald-100"
          : active
            ? "border-cyan-300/60 bg-cyan-400/15 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.18)]"
            : "border-white/10 bg-white/6 text-slate-300"
      }`}
    >
      0{index + 1}
    </span>
  );
}

export function DiagnosticLoading({
  productName,
  query,
  mode = "diagnostic",
}: DiagnosticLoadingProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  const steps = useMemo(
    () => (mode === "fix-it" ? fixItSteps : diagnosticSteps),
    [mode],
  );
  const displayStep = reducedMotion ? 0 : activeStep;

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);

    return () => {
      mediaQuery.removeEventListener("change", updateMotionPreference);
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveStep((current) =>
        current >= steps.length - 1 ? current : current + 1,
      );
    }, 980);

    return () => {
      window.clearInterval(interval);
    };
  }, [reducedMotion, steps.length]);

  const isFixIt = mode === "fix-it";
  const headline = isFixIt
    ? "Generating listing fixes"
    : "Running AI visibility diagnostic";
  const subtext = isFixIt
    ? "Turning visibility gaps into product-page improvements."
    : "Checking how this product appears across AI buying answers.";
  const activeLabel = steps[displayStep]?.label ?? steps[0]?.label;

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(124,58,237,0.14),transparent_30%),linear-gradient(180deg,#07131c_0%,#0c1723_100%)] p-6 text-slate-100 shadow-[0_26px_80px_rgba(2,8,23,0.30)] sm:p-7">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
      <div
        className={`absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.06)_50%,transparent_70%)] ${reducedMotion ? "opacity-0" : "animate-pulse"}`}
        aria-hidden="true"
      />

      <div className="relative grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-[26px] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-[22px] border border-white/10 bg-white/8 p-3">
                <AnswerRankMark className="h-12 w-12" />
              </div>
              <div>
                <FeatureBadge
                  label={isFixIt ? "Fix It Engine" : "Diagnostic Engine"}
                  kind={isFixIt ? "magic" : "diagnostic"}
                />
              </div>
            </div>
          </div>

          <h3 className="mt-5 text-2xl font-semibold tracking-tight text-white">
            {headline}
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">{subtext}</p>

          <div className="mt-5 space-y-3">
            {productName ? (
              <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-cyan-100/70">
                  Product
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-100">
                  {productName}
                </p>
              </div>
            ) : null}
            {query ? (
              <div className="rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-cyan-100/70">
                  Buyer Query
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-100">{query}</p>
              </div>
            ) : null}
          </div>

          <div className="mt-5">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400 transition-all duration-700"
                style={{
                  width: `${Math.max(
                    ((displayStep + 1) / steps.length) * 100,
                    12,
                  )}%`,
                }}
              />
            </div>
          </div>

          <p className="mt-5 text-sm text-slate-300" aria-live="polite">
            {activeLabel}
          </p>
          <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-400">
            This usually takes a few seconds.
          </p>
        </div>

        <div className="space-y-3">
          {steps.map((step, index) => {
            const isActive = index === displayStep;
            const isComplete = index < displayStep;

            return (
              <div
                key={step.label}
                className={`rounded-[24px] border px-4 py-4 transition ${
                  isComplete
                    ? "border-emerald-300/20 bg-emerald-400/10"
                    : isActive
                      ? "border-cyan-300/25 bg-white/10 shadow-[0_0_30px_rgba(34,211,238,0.08)]"
                      : "border-white/10 bg-white/5"
                }`}
              >
                <div className="flex items-start gap-4">
                  <StepDot index={index} active={isActive} complete={isComplete} />
                  <div className="min-w-0">
                    <p
                      className={`text-sm font-semibold ${
                        isActive || isComplete ? "text-white" : "text-slate-200"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
