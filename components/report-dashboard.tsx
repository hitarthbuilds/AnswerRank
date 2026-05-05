import {
  AnswerRankMark,
  FeatureBadge,
  ProviderBadge,
} from "@/components/brand/logo";
import { CompetitorLeaderboard } from "@/components/competitor-leaderboard";
import { FixItEngine } from "@/components/fix-it-engine";
import { InsightsPanel } from "@/components/insights-panel";
import { ModelResultCard } from "@/components/model-result-card";
import { RawResponsesPanel } from "@/components/raw-responses-panel";
import { RecommendationsPanel } from "@/components/recommendations-panel";
import { ScoreCard } from "@/components/score-card";
import type { DiagnoseResponse, FirecrawlStatus } from "@/lib/types";

type ReportDashboardProps = {
  report: DiagnoseResponse | null;
};

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatFirecrawlStatus(
  status: FirecrawlStatus,
  urlContextLength?: number,
) {
  if (status === "used") {
    return urlContextLength
      ? `Used (${urlContextLength.toLocaleString()} chars)`
      : "Used";
  }

  if (status === "failed") {
    return "Attempted but failed; continued with submitted product context";
  }

  if (status === "unavailable") {
    return "Unavailable; key not configured";
  }

  return "Skipped";
}

function formatServiceLabel(value: string) {
  if (value === "openai") return "OpenAI";
  if (value === "gemini") return "Gemini";
  if (value === "anthropic") return "Anthropic";
  if (value === "firecrawl") return "Firecrawl";
  return value;
}

function formatToolsLabel(report: DiagnoseResponse) {
  if (report.metadata.source === "mock") {
    return "None";
  }

  if (report.metadata.firecrawlStatus === "used") {
    return "Firecrawl used";
  }

  if (report.metadata.firecrawlStatus === "failed") {
    return "Firecrawl attempted but failed";
  }

  if (report.metadata.firecrawlStatus === "unavailable") {
    return report.productUrl ? "Firecrawl unavailable" : "None";
  }

  if (report.metadata.toolsAttempted.length) {
    return report.metadata.toolsAttempted
      .map(formatServiceLabel)
      .map((tool) => `${tool} attempted`)
      .join(", ");
  }

  return "None";
}

export function ReportDashboard({ report }: ReportDashboardProps) {
  if (!report) {
    return (
      <section className="section-shell overflow-hidden rounded-[28px] p-6 sm:p-7">
        <div className="flex flex-col gap-5 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--accent)]">
              Report Dashboard
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Your first diagnostic report will render here
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              Run the form once to render the answer-engine report with score
              cards, provider outcomes, competitor analysis, and raw answer
              text.
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
            Awaiting first run
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {["Score card", "Provider results", "Recommendations"].map((item) => (
            <div
              key={item}
              className="rounded-[26px] border border-dashed border-slate-200 bg-white/70 px-5 py-12 text-center text-sm text-slate-400"
            >
              {item} appears after the diagnostic completes
            </div>
          ))}
        </div>
      </section>
    );
  }

  const sourceLabel =
    report.metadata.source === "mock"
      ? "Mock mode"
      : report.metadata.source === "mock-fallback"
        ? "Mock fallback"
        : report.metadata.source === "full-live"
          ? "Full live"
          : report.metadata.source === "gemini-live"
            ? "Live partial"
            : "Live partial";

  const providersUsedLabel = report.metadata.providersUsed.length
    ? report.metadata.providersUsed.map(formatServiceLabel).join(", ")
    : report.metadata.source === "mock"
      ? "Seeded OpenAI, Gemini, Claude mock responses"
      : "None";

  const normalizedProvidersUsedLabel =
    report.metadata.source === "mock"
      ? "Seeded OpenAI, Gemini, Claude mock responses"
      : providersUsedLabel;

  const providersConfiguredLabel = report.metadata.providersConfigured.length
    ? report.metadata.providersConfigured.map(formatServiceLabel).join(", ")
    : "None";

  const providersSkippedLabel = report.metadata.providersSkipped.length
    ? report.metadata.providersSkipped.map(formatServiceLabel).join(", ")
    : "None";

  const toolsUsedLabel = formatToolsLabel(report);

  const firecrawlLabel =
    report.metadata.source === "mock"
      ? "Not used"
      : formatFirecrawlStatus(
          report.metadata.firecrawlStatus,
          report.metadata.urlContextLength,
        );

  const subtitle =
    report.metadata.source === "mock"
      ? "This report is rendered from stable seeded responses so the product story stays demoable with no external keys."
      : report.metadata.source === "mock-fallback"
        ? "Live mode was attempted, but the server returned a seeded fallback report instead."
        : report.metadata.source === "full-live"
          ? "This report was generated from live OpenAI, Gemini, and Claude-style provider output, then scored by the deterministic parser, AEO engine, and leaderboard builder."
          : report.metadata.source === "gemini-live"
            ? "This report was generated from live Gemini output, then scored by the deterministic parser, AEO engine, and leaderboard builder."
            : "This report was generated from live multi-provider output and then scored by the deterministic parser, AEO engine, and leaderboard builder.";

  return (
    <section className="section-shell overflow-hidden rounded-[28px] p-6 sm:p-7">
      <div className="flex flex-col gap-5 border-b border-slate-200/80 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-start gap-4">
            <AnswerRankMark className="mt-0.5 h-12 w-12" />
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <FeatureBadge
                  label={
                    report.metadata.source === "mock"
                      ? "Mock DiagnoseResponse"
                      : "DiagnoseResponse"
                  }
                  kind={report.metadata.source === "mock" ? "mock" : "live"}
                />
                <FeatureBadge label="Source Metadata" kind="metadata" />
              </div>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                {report.productName} scores {report.overallScore}/100 for{" "}
                <span className="text-slate-700">&quot;{report.targetQuery}&quot;</span>
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                {subtitle}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <ProviderBadge provider={sourceLabel} />
            {report.metadata.firecrawlStatus === "used" ? (
              <ProviderBadge provider="Firecrawl" />
            ) : report.metadata.firecrawlStatus === "failed" ? (
              <ProviderBadge provider="Firecrawl attempted" />
            ) : null}
          </div>
          <span className="font-medium text-slate-800">Source: {sourceLabel}</span>
          <span>Mode: {report.metadata.mode}</span>
          <span>Demo mode: {report.metadata.demoMode ? "true" : "false"}</span>
          <span>Providers configured: {providersConfiguredLabel}</span>
          <span>Providers used: {normalizedProvidersUsedLabel}</span>
          {report.metadata.providersUsed.length ? (
            <div className="flex flex-wrap gap-2">
              {report.metadata.providersUsed.map((provider) => (
                <ProviderBadge
                  key={`used-${provider}`}
                  provider={formatServiceLabel(provider)}
                />
              ))}
            </div>
          ) : null}
          <span>Providers skipped: {providersSkippedLabel}</span>
          {report.metadata.providersSkipped.length ? (
            <div className="flex flex-wrap gap-2">
              {report.metadata.providersSkipped.map((provider) => (
                <ProviderBadge
                  key={`skipped-${provider}`}
                  provider={`${formatServiceLabel(provider)} optional`}
                />
              ))}
            </div>
          ) : null}
          <span>
            Coverage: {report.metadata.successfulProviderCount} of{" "}
            {report.metadata.expectedProviderCount} answer engines
          </span>
          <span>Tools: {toolsUsedLabel}</span>
          <span>Firecrawl: {firecrawlLabel}</span>
          {report.metadata.fallbackReason ? (
            <span className="text-amber-700">
              Fallback reason: {report.metadata.fallbackReason}
            </span>
          ) : null}
          <span>Generated {formatTimestamp(report.generatedAt)}</span>
          <span className="break-all font-mono text-xs text-slate-400">
            {report.reportId}
          </span>
        </div>
      </div>

      {report.metadata.providerErrors?.length ? (
        <div className="mt-4 rounded-3xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
          <p className="font-semibold text-amber-950">Provider diagnostics</p>
          <div className="mt-2 space-y-2">
            {report.metadata.providerErrors.map((error) => (
              <p key={`${error.provider}-${error.message}`}>
                <span className="font-medium">{error.provider}:</span>{" "}
                {error.message}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 2xl:grid-cols-[340px_minmax(0,1fr)]">
        <ScoreCard report={report} />
        <div className="grid min-w-0 gap-4">
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {report.modelResults.map((result) => (
              <ModelResultCard key={result.provider} result={result} />
            ))}
          </div>
          <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <CompetitorLeaderboard competitors={report.competitorLeaderboard} />
            <InsightsPanel insights={report.insights} />
          </div>
        </div>
      </div>

      <div className="mt-4">
        <RecommendationsPanel
          recommendations={report.recommendations}
          faqItems={report.faqItems}
        />
      </div>

      <div className="mt-4">
        <FixItEngine key={report.reportId} report={report} />
      </div>

      <div className="mt-4">
        <RawResponsesPanel
          responses={report.rawResponses}
          modelResults={report.modelResults}
        />
      </div>
    </section>
  );
}
