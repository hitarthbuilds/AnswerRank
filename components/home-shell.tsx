"use client";

import { useEffect, useRef, useState } from "react";
import { DiagnosticForm } from "@/components/diagnostic-form";
import { HeroSection } from "@/components/hero-section";
import { LoadingStatePlaceholder } from "@/components/loading-state-placeholder";
import { ReportDashboardPlaceholder } from "@/components/report-dashboard-placeholder";
import { SAMPLE_DIAGNOSTIC_VALUES } from "@/lib/sample-input";
import type { DiagnosticFormValues } from "@/lib/types";

const INITIAL_VALUES: DiagnosticFormValues = {
  productName: "",
  productUrl: "",
  productDescription: "",
  targetQuery: "",
  competitors: "",
  audience: "",
  region: "United States",
};

export function HomeShell() {
  const [values, setValues] = useState<DiagnosticFormValues>(INITIAL_VALUES);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const updateField = <K extends keyof DiagnosticFormValues>(
    field: K,
    value: DiagnosticFormValues[K],
  ) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const loadSample = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    setValues(SAMPLE_DIAGNOSTIC_VALUES);
    setHasSubmitted(false);
    setIsLoading(false);
  };

  const runDiagnostic = () => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    setIsLoading(true);
    setHasSubmitted(false);

    timeoutRef.current = window.setTimeout(() => {
      setIsLoading(false);
      setHasSubmitted(true);
    }, 1400);
  };

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
      <HeroSection />
      <section
        id="workspace"
        className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_360px]"
      >
        <DiagnosticForm
          values={values}
          isLoading={isLoading}
          onFieldChange={updateField}
          onLoadSample={loadSample}
          onRunDiagnostic={runDiagnostic}
        />
        <aside className="section-shell grid-noise grid rounded-[28px] p-6">
          <div className="rounded-3xl border border-white/70 bg-white/75 p-6 shadow-[0_12px_35px_rgba(15,23,42,0.08)]">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--accent)]">
              Phase 1 Scope
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              UI first, report engine next
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
              This phase proves the experience, form structure, demo sample, and
              dashboard layout before any provider or scoring logic is wired.
            </p>
            <div className="mt-6 space-y-3">
              {[
                "Homepage and hero section",
                "Diagnostic form with sample data loader",
                "Loading placeholder for the run flow",
                "Report dashboard shell for the next phase",
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
          <LoadingStatePlaceholder />
        ) : (
          <ReportDashboardPlaceholder hasSubmitted={hasSubmitted} />
        )}
      </section>
    </main>
  );
}
