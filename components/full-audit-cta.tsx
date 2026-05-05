"use client";

import { useState } from "react";
import { FeatureBadge, ProviderBadge } from "@/components/brand/logo";
import type { DiagnoseResponse, LeadRequest } from "@/lib/types";

type FullAuditCtaProps = {
  report: DiagnoseResponse;
};

const perks = [
  "Gemini + ChatGPT + Claude visibility",
  "Expanded buyer-intent query coverage",
  "Competitor share of voice",
  "Model-wise ranking gaps",
  "PDF/shareable report",
  "Listing rewrite recommendations",
];

export function FullAuditCta({ report }: FullAuditCtaProps) {
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload: LeadRequest = {
        email: email.trim(),
        companyName: companyName.trim() || undefined,
        productName: report.productName,
        productUrl: report.productUrl,
        buyerIntentQuery: report.targetQuery,
        source: "full_audit_request",
        auditModeRequested: "full",
      };

      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json().catch(() => null)) as
        | { message?: string; error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          result?.message || result?.error || "Unable to capture lead right now.",
        );
      }

      setSuccessMessage(
        result?.message ||
          "Full audit request received. We’ll send the next steps.",
      );
      setEmail("");
      setCompanyName("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to capture lead right now.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <FeatureBadge label="Premium CTA" kind="magic" />
        <ProviderBadge provider="Full audit" />
      </div>
      <h3 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
        Unlock full tri-engine audit
      </h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">
        Compare how this product ranks across Gemini, ChatGPT, and Claude across
        a full buyer-intent query cluster.
      </p>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {perks.map((perk) => (
          <div
            key={perk}
            className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-700"
          >
            {perk}
          </div>
        ))}
      </div>

      {successMessage ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          placeholder="you@brand.com"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
        />
        <input
          type="text"
          value={companyName}
          onChange={(event) => setCompanyName(event.target.value)}
          placeholder="Company name (optional)"
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-w-44 items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSubmitting ? "Submitting..." : "Request full audit"}
        </button>
      </form>
    </section>
  );
}
