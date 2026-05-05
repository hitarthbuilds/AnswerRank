"use client";

import { useState } from "react";
import {
  AnswerRankLogo,
  FeatureBadge,
  ProviderBadge,
} from "@/components/brand/logo";
import { DiagnosticLoading } from "@/components/diagnostic/diagnostic-loading";
import { StreamingDiagnosticStatus } from "@/components/diagnostic/streaming-diagnostic-status";
import { DiagnosticForm } from "@/components/diagnostic-form";
import { HeroSection } from "@/components/hero-section";
import { ReportDashboard } from "@/components/report-dashboard";
import { formValuesToDiagnoseRequest } from "@/lib/mock-data";
import { SAMPLE_DIAGNOSTIC_VALUES } from "@/lib/sample-input";
import type {
  DiagnoseRequest,
  DiagnoseResponse,
  DiagnosticFormValues,
  ExpandedQuery,
  ProviderId,
} from "@/lib/types";

const INITIAL_VALUES: DiagnosticFormValues = {
  productName: "",
  productUrl: "",
  productDescription: "",
  targetQuery: "",
  competitors: "",
  audience: "",
  region: "United States",
};

function validateBeforeSubmit(values: DiagnosticFormValues) {
  if (!values.productName.trim()) {
    return "productName is required.";
  }

  if (!values.targetQuery.trim()) {
    return "targetQuery is required.";
  }

  if (!values.productDescription.trim() && !values.productUrl.trim()) {
    return "Provide at least one of productDescription or productUrl.";
  }

  return null;
}

class StreamingDiagnosticError extends Error {
  shouldFallback: boolean;

  constructor(message: string, shouldFallback: boolean) {
    super(message);
    this.name = "StreamingDiagnosticError";
    this.shouldFallback = shouldFallback;
  }
}

export function HomeShell() {
  const [values, setValues] = useState<DiagnosticFormValues>(INITIAL_VALUES);
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<DiagnoseResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [streamState, setStreamState] = useState<{
    currentStage: string;
    statusMessage: string;
    expandedQueries: ExpandedQuery[];
    providerStatuses: Array<{
      provider: ProviderId;
      state: "pending" | "running" | "done" | "failed" | "skipped" | "locked";
    }>;
  } | null>(null);

  const defaultProviderStatuses = [
    { provider: "gemini" as const, state: "pending" as const },
    { provider: "openai" as const, state: "locked" as const },
    { provider: "anthropic" as const, state: "locked" as const },
  ];

  const updateProviderStatus = (
    provider: ProviderId,
    state: "pending" | "running" | "done" | "failed" | "skipped" | "locked",
  ) => {
    setStreamState((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        providerStatuses: current.providerStatuses.map((item) =>
          item.provider === provider ? { ...item, state } : item,
        ),
      };
    });
  };

  const updateField = <K extends keyof DiagnosticFormValues>(
    field: K,
    value: DiagnosticFormValues[K],
  ) => {
    if (errorMessage) {
      setErrorMessage(null);
    }

    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const loadSample = () => {
    setValues(SAMPLE_DIAGNOSTIC_VALUES);
    setErrorMessage(null);
    setReport(null);
    setIsLoading(false);
    setStreamState(null);
  };

  const runJsonDiagnostic = async (requestBody: DiagnoseRequest) => {
    const [response] = await Promise.all([
      fetch("/api/diagnose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }),
      new Promise((resolve) => window.setTimeout(resolve, 700)),
    ]);

    const payload = (await response.json().catch(() => null)) as
      | DiagnoseResponse
      | { error?: string; message?: string }
      | null;

    if (!response.ok) {
      const message =
        payload &&
        typeof payload === "object" &&
        "message" in payload &&
        typeof payload.message === "string"
          ? payload.message
          : payload &&
              typeof payload === "object" &&
              "error" in payload &&
              typeof payload.error === "string"
            ? payload.error
            : "Unable to run the diagnostic right now.";

      throw new Error(message);
    }

    return payload as DiagnoseResponse;
  };

  const runStreamingDiagnostic = async (requestBody: DiagnoseRequest) => {
    const response = await fetch("/api/diagnose/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok || !response.body) {
      throw new StreamingDiagnosticError("Streaming unavailable.", true);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalReport: DiagnoseResponse | null = null;

    const applyEvent = (event: string, payload: unknown) => {
      if (event === "status" && payload && typeof payload === "object") {
        const statusPayload = payload as { stage?: string; message?: string };
        setStreamState((current) =>
          current
            ? {
                ...current,
                currentStage: statusPayload.stage ?? current.currentStage,
                statusMessage: statusPayload.message ?? current.statusMessage,
              }
            : current,
        );
      }

      if (event === "query_expanded" && payload && typeof payload === "object") {
        const queryPayload = payload as { queries?: ExpandedQuery[] };
        setStreamState((current) =>
          current
            ? {
                ...current,
                expandedQueries: queryPayload.queries ?? current.expandedQueries,
              }
            : current,
        );
      }

      if (event === "provider_start" && payload && typeof payload === "object") {
        const providerPayload = payload as { provider?: ProviderId };
        if (providerPayload.provider) {
          updateProviderStatus(providerPayload.provider, "running");
        }
      }

      if (event === "provider_done" && payload && typeof payload === "object") {
        const providerPayload = payload as {
          provider?: ProviderId;
          success?: boolean;
          skipped?: boolean;
        };
        if (providerPayload.provider) {
          updateProviderStatus(
            providerPayload.provider,
            providerPayload.skipped
              ? "skipped"
              : providerPayload.success
                ? "done"
                : "failed",
          );
        }
      }

      if (event === "result") {
        finalReport = payload as DiagnoseResponse;
      }

      if (event === "error" && payload && typeof payload === "object") {
        const errorPayload = payload as { message?: string; error?: string };
        throw new StreamingDiagnosticError(
          errorPayload.message ||
            errorPayload.error ||
            "Unable to run the diagnostic right now.",
          false,
        );
      }
    };

    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const lines = part.split("\n");
        const eventLine = lines.find((line) => line.startsWith("event:"));
        const dataLines = lines.filter((line) => line.startsWith("data:"));
        const event = eventLine?.replace("event:", "").trim() ?? "message";
        const data = dataLines
          .map((line) => line.replace("data:", "").trim())
          .join("\n");

        if (!data) {
          continue;
        }

        applyEvent(event, JSON.parse(data));
      }
    }

    if (!finalReport) {
      throw new StreamingDiagnosticError(
        "Streaming finished without a report.",
        true,
      );
    }

    return finalReport;
  };

  const runDiagnostic = async () => {
    if (isLoading) {
      return;
    }

    setReport(null);
    setErrorMessage(null);
    setIsLoading(true);
    setStreamState({
      currentStage: "validating",
      statusMessage: "Validating product and buyer query",
      expandedQueries: [],
      providerStatuses: defaultProviderStatuses,
    });

    const validationError = validateBeforeSubmit(values);

    if (validationError) {
      setErrorMessage(validationError);
      setIsLoading(false);
      setStreamState(null);
      return;
    }

    const requestBody: DiagnoseRequest = {
      ...formValuesToDiagnoseRequest(values),
      auditMode: "free",
    };

    try {
      let nextReport: DiagnoseResponse | null = null;

      try {
        nextReport = await runStreamingDiagnostic(requestBody);
      } catch (error) {
        if (
          error instanceof StreamingDiagnosticError &&
          !error.shouldFallback
        ) {
          throw error;
        }

        setStreamState(null);
        nextReport = await runJsonDiagnostic(requestBody);
      }

      setReport(nextReport);
    } catch (error) {
      setReport(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to run the diagnostic right now.",
      );
    } finally {
      setIsLoading(false);
      setStreamState(null);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <AnswerRankLogo />
        <div className="flex flex-wrap gap-2">
          <FeatureBadge label="AI Visibility Diagnostic" kind="diagnostic" />
          <ProviderBadge provider="Live Partial" />
        </div>
      </header>
      <HeroSection />
      <section
        id="workspace"
        className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_360px]"
      >
        <DiagnosticForm
          values={values}
          isLoading={isLoading}
          errorMessage={errorMessage}
          onFieldChange={updateField}
          onLoadSample={loadSample}
          onRunDiagnostic={runDiagnostic}
        />
        <aside className="section-shell grid-noise grid rounded-[28px] p-6">
          <div className="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-[0_12px_35px_rgba(15,23,42,0.08)]">
            <FeatureBadge label="Live Demo Pipeline" kind="context" />
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              Gemini answer engine + Firecrawl context
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              Submit a product, buyer-intent query, and competitors.
              AnswerRank extracts product context, queries Gemini, parses brand
              mentions, scores AI visibility, and generates listing fixes.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ProviderBadge provider="Gemini" />
              <ProviderBadge provider="Firecrawl" />
              <FeatureBadge label="AEO scoring" kind="score" />
            </div>
            <div className="mt-6 space-y-3">
              {[
                "Gemini live answer-engine response",
                "Firecrawl product-page context",
                "Deterministic parser and AEO scoring",
                "Fix It Engine for listing rewrites",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3"
                >
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
                  <p className="text-sm text-slate-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
      <section className="mt-6">
        {isLoading ? (
          streamState ? (
            <StreamingDiagnosticStatus
              currentStage={streamState.currentStage}
              statusMessage={streamState.statusMessage}
              expandedQueries={streamState.expandedQueries}
              providerStatuses={streamState.providerStatuses}
              productName={values.productName}
              query={values.targetQuery}
            />
          ) : (
            <DiagnosticLoading
              mode="diagnostic"
              productName={values.productName}
              query={values.targetQuery}
            />
          )
        ) : report && !errorMessage ? (
          <ReportDashboard report={report} />
        ) : null}
      </section>
    </main>
  );
}
