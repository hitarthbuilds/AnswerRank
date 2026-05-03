import type { ModelResult } from "@/lib/types";

const providerLabels = {
  openai: "OpenAI / GPT",
  gemini: "Google Gemini",
  anthropic: "Anthropic Claude",
};

const sentimentLabels = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
  not_mentioned: "Not Mentioned",
};

type ModelResultCardProps = {
  result: ModelResult;
};

export function ModelResultCard({ result }: ModelResultCardProps) {
  const isPositive = result.mentioned && result.status === "success";

  return (
    <section className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">
            {providerLabels[result.provider]}
          </p>
          <h4 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            {result.mentioned ? `Rank #${result.rank}` : "Not mentioned"}
          </h4>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isPositive
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {result.status === "success"
            ? sentimentLabels[result.sentiment]
            : "Failed"}
        </span>
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-600">{result.summary}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
          Confidence {Math.round(result.confidence * 100)}%
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
          Status {result.status}
        </span>
      </div>
      <div className="mt-5 space-y-3 border-t border-slate-200/80 pt-4">
        {result.mentionedProducts.map((product) => (
          <div
            key={`${result.provider}-${product.rank}-${product.name}`}
            className="rounded-2xl border border-slate-200/70 bg-slate-50/75 p-3"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex items-center gap-2">
                <span className="font-mono text-xs text-slate-400">
                  #{product.rank}
                </span>
                <span className="truncate text-sm font-semibold text-slate-800">
                  {product.name}
                </span>
              </div>
              {product.isUserProduct ? (
                <span className="rounded-full bg-[var(--accent)] px-2.5 py-1 text-[11px] font-semibold text-white">
                  Your product
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {product.reason}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
