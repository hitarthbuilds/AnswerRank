import { FormField } from "@/components/form-field";
import type { DiagnosticFormValues } from "@/lib/types";

const inputClassName =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-4 focus:ring-sky-100";

const regions = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Europe",
  "Global",
];

type DiagnosticFormProps = {
  values: DiagnosticFormValues;
  isLoading: boolean;
  onLoadSample: () => void;
  onRunDiagnostic: () => void;
  onFieldChange: <K extends keyof DiagnosticFormValues>(
    field: K,
    value: DiagnosticFormValues[K],
  ) => void;
};

export function DiagnosticForm({
  values,
  isLoading,
  onLoadSample,
  onRunDiagnostic,
  onFieldChange,
}: DiagnosticFormProps) {
  return (
    <section className="section-shell rounded-[28px] p-6 sm:p-7">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--accent)]">
              Diagnostic Intake
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Build the first report from structured product context
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
              Start with a focused buyer-intent query, add product context, and
              keep the first demo path simple.
            </p>
          </div>
          <button
            type="button"
            onClick={onLoadSample}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            Load Sample
          </button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onRunDiagnostic();
          }}
          className="grid gap-5 md:grid-cols-2"
        >
          <FormField
            label="Product name"
            required
            className="md:col-span-1"
            hint="Brand and product title used for matching and reporting."
          >
            <input
              className={inputClassName}
              placeholder="NutraCalm Magnesium Glycinate Plus"
              value={values.productName}
              onChange={(event) =>
                onFieldChange("productName", event.target.value)
              }
            />
          </FormField>

          <FormField
            label="Product URL"
            className="md:col-span-1"
            hint="Optional listing or PDP URL. Firecrawl is intentionally deferred."
          >
            <input
              className={inputClassName}
              placeholder="https://www.amazon.com/your-product"
              value={values.productUrl}
              onChange={(event) => onFieldChange("productUrl", event.target.value)}
            />
          </FormField>

          <FormField
            label="Product description"
            className="md:col-span-2"
            hint="Use benefits, trust signals, certifications, and audience clues."
          >
            <textarea
              className={`${inputClassName} min-h-32 resize-y`}
              placeholder="Magnesium glycinate for adults and seniors. Supports sleep, relaxation, and digestion..."
              value={values.productDescription}
              onChange={(event) =>
                onFieldChange("productDescription", event.target.value)
              }
            />
          </FormField>

          <FormField
            label="Target buyer-intent query"
            required
            className="md:col-span-2"
            hint="The main question a shopper would ask an AI assistant."
          >
            <input
              className={inputClassName}
              placeholder="best magnesium supplement for seniors"
              value={values.targetQuery}
              onChange={(event) =>
                onFieldChange("targetQuery", event.target.value)
              }
            />
          </FormField>

          <FormField
            label="Competitors"
            className="md:col-span-1"
            hint="Comma-separated brands to compare later in the report."
          >
            <input
              className={inputClassName}
              placeholder="Thorne, Pure Encapsulations, Doctor's Best"
              value={values.competitors}
              onChange={(event) =>
                onFieldChange("competitors", event.target.value)
              }
            />
          </FormField>

          <FormField
            label="Audience"
            className="md:col-span-1"
            hint="Who is buying, and who are they buying for?"
          >
            <input
              className={inputClassName}
              placeholder="Seniors and adult children buying supplements for parents"
              value={values.audience}
              onChange={(event) => onFieldChange("audience", event.target.value)}
            />
          </FormField>

          <FormField
            label="Region"
            className="md:col-span-1"
            hint="Defaulted to the United States for the take-home demo."
          >
            <select
              className={inputClassName}
              value={values.region}
              onChange={(event) => onFieldChange("region", event.target.value)}
            >
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </FormField>

          <div className="md:col-span-2 flex flex-col gap-3 border-t border-slate-200/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500">
              Phase 1 keeps the run flow local. The button below only drives a
              polished loading state and dashboard shell.
            </p>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex min-w-44 items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isLoading ? "Preparing Report..." : "Run Diagnostic"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
