"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnswerRankMark } from "@/components/brand/logo";

type AppIntroProps = {
  onComplete?: () => void;
};

const phrases = [
  "Mapping AI buying answers",
  "Ranking product visibility",
  "Preparing diagnostic workspace",
];

export function AppIntro({ onComplete }: AppIntroProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const completedRef = useRef(false);

  const progress = useMemo(
    () => `${Math.min(((activeIndex + 1) / phrases.length) * 100, 100)}%`,
    [activeIndex],
  );

  useEffect(() => {
    const timers: number[] = [];

    phrases.forEach((_, index) => {
      if (index === 0) {
        return;
      }

      timers.push(
        window.setTimeout(() => {
          setActiveIndex(index);
        }, 620 * index),
      );
    });

    timers.push(
      window.setTimeout(() => {
        setIsExiting(true);
      }, 1850),
    );

    timers.push(
      window.setTimeout(() => {
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete?.();
        }
      }, 2250),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [onComplete]);

  const handleSkip = () => {
    if (completedRef.current) {
      return;
    }

    completedRef.current = true;
    setIsExiting(true);
    onComplete?.();
  };

  return (
    <div
      className={`fixed inset-0 z-[80] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.16),transparent_34%),linear-gradient(180deg,#050b12_0%,#0b1420_100%)] text-slate-50 transition-opacity duration-500 ${isExiting ? "opacity-0" : "opacity-100"}`}
      role="status"
      aria-live="polite"
      aria-label="AnswerRank AI intro"
    >
      <button
        type="button"
        onClick={handleSkip}
        className="absolute right-5 top-5 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10"
      >
        Skip
      </button>

      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-1 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400 transition-all duration-500"
          style={{ width: progress }}
        />
      </div>

      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6 py-10">
        <div className="w-full max-w-2xl rounded-[36px] border border-white/10 bg-white/6 px-8 py-10 text-center shadow-[0_24px_90px_rgba(2,8,23,0.48)] backdrop-blur-xl">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/10 bg-white/6 shadow-[0_0_48px_rgba(56,189,248,0.12)]">
            <AnswerRankMark className="h-16 w-16" />
          </div>

          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.34em] text-cyan-200/80">
            AnswerRank AI
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            AnswerRank AI
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
            AI visibility diagnostic for ecommerce brands
          </p>

          <div className="mt-8 h-14 overflow-hidden">
            <div
              className="transition-transform duration-500"
              style={{ transform: `translateY(-${activeIndex * 56}px)` }}
            >
              {phrases.map((phrase) => (
                <p
                  key={phrase}
                  className="flex h-14 items-center justify-center text-lg font-medium text-slate-100 sm:text-xl"
                >
                  {phrase}
                </p>
              ))}
            </div>
          </div>

          <p className="mt-6 text-sm font-medium text-cyan-100/85">
            See if your product shows up.
          </p>
        </div>
      </div>
    </div>
  );
}
