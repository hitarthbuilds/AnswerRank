"use client";

import { AnswerRankMark, FeatureBadge, ProviderBadge } from "@/components/brand/logo";
import type { ExpandedQuery, ProviderId } from "@/lib/types";

type ProviderStreamStatus = {
  provider: ProviderId;
  state: "pending" | "running" | "done" | "failed" | "skipped" | "locked";
};

type StreamingDiagnosticStatusProps = {
  currentStage: string;
  statusMessage: string;
  expandedQueries: ExpandedQuery[];
  providerStatuses: ProviderStreamStatus[];
  productName?: string;
  query?: string;
};

function getStageLabel(stage: string) {
  if (stage === "validating") return "Validating product context";
  if (stage === "expanding_queries") return "Expanding buyer-intent surface";
  if (stage === "extracting_context") return "Reading product-page context";
  if (stage === "querying_providers") return "Checking AI answer visibility";
  if (stage === "scoring") return "Scoring model-wise visibility";
  if (stage === "cached") return "Restoring cached report";
  return "Preparing report";
}

function statusTone(state: ProviderStreamStatus["state"]) {
  if (state === "done") {
    return "border-emerald-300/35 bg-emerald-400/10 text-emerald-100";
  }

  if (state === "running") {
    return "border-cyan-300/40 bg-cyan-400/10 text-cyan-100";
  }

  if (state === "failed") {
    return "border-amber-300/35 bg-amber-400/10 text-amber-100";
  }

  if (state === "skipped" || state === "locked") {
    return "border-white/10 bg-white/5 text-slate-300";
  }

  return "border-white/10 bg-white/5 text-slate-200";
}

export function StreamingDiagnosticStatus({
  currentStage,
  statusMessage,
  expandedQueries,
  providerStatuses,
  productName,
  query,
}: StreamingDiagnosticStatusProps) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(124,58,237,0.14),transparent_30%),linear-gradient(180deg,#07131c_0%,#0c1723_100%)] p-6 text-slate-100 shadow-[0_26px_80px_rgba(2,8,23,0.30)] sm:p-7">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
      <div className="relative grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="rounded-[26px] border border-white/10 bg-white/6 p-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="rounded-[22px] border border-white/10 bg-white/8 p-3">
              <AnswerRankMark className="h-12 w-12" />
            </div>
            <div>
              <FeatureBadge label="Streaming Diagnostic" kind="live" />
            </div>
          </div>

          <h3 className="mt-5 text-2xl font-semibold tracking-tight text-white">
            {getStageLabel(currentStage)}
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">{statusMessage}</p>

          {productName ? (
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-cyan-100/70">
                Product
              </p>
              <p className="mt-2 text-sm text-slate-100">{productName}</p>
            </div>
          ) : null}

          {query ? (
            <div className="mt-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-cyan-100/70">
                Buyer Query
              </p>
              <p className="mt-2 text-sm text-slate-100">{query}</p>
            </div>
          ) : null}

          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400 transition-all duration-500"
              style={{
                width: `${Math.max(
                  12,
                  expandedQueries.length ? Math.min(100, expandedQueries.length * 18) : 18,
                )}%`,
              }}
            />
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">
                Expanded buyer-intent queries
              </p>
              <ProviderBadge provider={`${expandedQueries.length} queries`} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {expandedQueries.length ? (
                expandedQueries.map((expandedQuery) => (
                  <span
                    key={expandedQuery.id}
                    className="rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs text-slate-200"
                  >
                    {expandedQuery.query}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-300">
                  Waiting for query expansion…
                </span>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">Provider status</p>
            <div className="mt-4 flex flex-wrap gap-3" aria-live="polite">
              {providerStatuses.map((provider) => (
                <div
                  key={provider.provider}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${statusTone(
                    provider.state,
                  )}`}
                >
                  {provider.provider} · {provider.state}
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.24em] text-slate-400">
              No fake percentages. Progress reflects actual workflow stages.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
