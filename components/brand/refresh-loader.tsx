"use client";

import { AnswerRankMark, FeatureBadge } from "@/components/brand/logo";

const refreshSteps = [
  "Loading product diagnostic shell",
  "Restoring report workspace",
  "Preparing visibility tools",
];

export function RefreshLoader() {
  return (
    <div
      className="fixed inset-0 z-[70] overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(124,58,237,0.14),transparent_32%),linear-gradient(180deg,#07131c_0%,#0c1723_100%)] text-slate-50"
      role="status"
      aria-live="polite"
      aria-label="Restoring AnswerRank workspace"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />

      <div className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-6 py-10">
        <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-white/6 px-6 py-7 shadow-[0_24px_80px_rgba(2,8,23,0.42)] backdrop-blur-xl sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="rounded-[22px] border border-white/10 bg-white/8 p-3 shadow-[0_0_36px_rgba(56,189,248,0.10)]">
                <AnswerRankMark className="h-12 w-12" />
              </div>
              <div>
                <FeatureBadge label="Workspace Restore" kind="context" />
                <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  Restoring AnswerRank workspace
                </h1>
                <p className="mt-2 text-sm leading-7 text-slate-300">
                  Rebuilding your AI visibility dashboard.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400" />
          </div>

          <div className="mt-6 grid gap-3">
            {refreshSteps.map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/25 bg-cyan-400/10 text-xs font-semibold text-cyan-100">
                  0{index + 1}
                </span>
                <p className="text-sm text-slate-200">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
