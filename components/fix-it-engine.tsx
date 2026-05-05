"use client";

import { useState } from "react";
import { FeatureBadge } from "@/components/brand/logo";
import type { DiagnoseResponse, FixItResponse } from "@/lib/types";

type FixItEngineProps = {
  report: DiagnoseResponse;
};

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function FixItEngine({ report }: FixItEngineProps) {
  const [result, setResult] = useState<FixItResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (key: string, value: string) => {
    try {
      await copyText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1500);
    } catch {
      setErrorMessage("Clipboard access was blocked. You can still copy the text manually.");
    }
  };

  const runFixIt = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/fix-it", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          report,
          productDescription: report.productDescription,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | FixItResponse
        | { error?: string }
        | null;

      if (!response.ok) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Unable to generate the listing fix right now.";

        throw new Error(message);
      }

      setResult(payload as FixItResponse);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to generate the listing fix right now.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <FeatureBadge label="Fix It Engine" kind="magic" />
          <h4 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            Generate a stronger listing rewrite from the diagnostic
          </h4>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
            Use the current report to produce a sharper title, five clearer
            bullets, FAQ copy, and a positioning statement.
          </p>
        </div>
        <button
          type="button"
          onClick={runFixIt}
          disabled={isLoading}
          className="inline-flex min-w-44 items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isLoading ? "Generating Fix..." : "Generate Listing Fix"}
        </button>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
          <p className="font-semibold text-rose-800">Fix It request failed</p>
          <p className="mt-1 leading-6">{errorMessage}</p>
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          {[0, 1].map((card) => (
            <div
              key={card}
              className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4"
            >
              <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200" />
              <div className="mt-4 space-y-3">
                <div className="h-3 animate-pulse rounded-full bg-slate-100" />
                <div className="h-3 w-5/6 animate-pulse rounded-full bg-slate-100" />
                <div className="h-3 w-2/3 animate-pulse rounded-full bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {result ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">
                  Rewritten Title
                </p>
                <h5 className="mt-2 text-base font-semibold leading-7 text-slate-900">
                  {result.rewrittenTitle}
                </h5>
              </div>
              <button
                type="button"
                onClick={() => handleCopy("title", result.rewrittenTitle)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm"
              >
                {copiedKey === "title" ? "Copied" : "Copy title"}
              </button>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">
                  Rewritten Bullets
                </p>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy("bullets", result.rewrittenBullets.join("\n"))
                  }
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm"
                >
                  {copiedKey === "bullets" ? "Copied" : "Copy bullets"}
                </button>
              </div>
              <div className="mt-3 space-y-3">
                {result.rewrittenBullets.map((bullet, index) => (
                  <div
                    key={`${index}-${bullet}`}
                    className="rounded-2xl border border-slate-200/80 bg-white p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)]/10 text-xs font-semibold text-[var(--accent)]">
                        {index + 1}
                      </span>
                      <p className="text-sm leading-6 text-slate-700">{bullet}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">
                    Positioning
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        "positioning",
                        result.positioningStatement,
                      )
                    }
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm"
                  >
                    {copiedKey === "positioning"
                      ? "Copied"
                      : "Copy positioning"}
                  </button>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  {result.positioningStatement}
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">
                    Generated FAQ
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        "faq",
                        result.generatedFAQ
                          .map((item) => `${item.question}\n${item.answer}`)
                          .join("\n\n"),
                      )
                    }
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm"
                  >
                    {copiedKey === "faq" ? "Copied" : "Copy FAQ"}
                  </button>
                </div>
                <div className="mt-3 space-y-3">
                  {result.generatedFAQ.map((item) => (
                    <div
                      key={item.question}
                      className="rounded-2xl border border-slate-200/80 bg-white p-4"
                    >
                      <h5 className="text-sm font-semibold text-slate-900">
                        {item.question}
                      </h5>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {item.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
