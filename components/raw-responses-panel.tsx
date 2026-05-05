import { FeatureBadge, ProviderBadge } from "@/components/brand/logo";
import type { ModelResult, RawModelResponse } from "@/lib/types";

const providerLabels = {
  openai: "OpenAI / GPT",
  gemini: "Google Gemini",
  anthropic: "Anthropic Claude",
};

type RawResponsesPanelProps = {
  responses: RawModelResponse[];
  modelResults: ModelResult[];
};

export function RawResponsesPanel({
  responses,
  modelResults,
}: RawResponsesPanelProps) {
  return (
    <section className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-sm">
      <FeatureBadge label="Raw Responses" kind="metadata" />
      <h4 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
        Expand the provider outputs
      </h4>
      <div className="mt-5 space-y-3">
        {responses.map((response, index) => {
          const relatedResult = modelResults.find(
            (result) => result.provider === response.provider,
          );

          return (
            <details
              key={response.provider}
              className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-50/70"
              open={index === 0}
            >
              <summary className="flex cursor-pointer list-none flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <ProviderBadge provider={providerLabels[response.provider]} />
                  <p className="mt-1 text-sm text-slate-500">
                    {response.query}
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                    {relatedResult?.mentioned
                      ? `Rank #${relatedResult.rank}`
                      : "Not mentioned"}
                  </span>
                  <span className="text-slate-400 transition group-open:rotate-180">
                    ^
                  </span>
                </div>
              </summary>
              <div className="border-t border-slate-200/80 bg-white px-4 py-4">
                <p className="whitespace-pre-line text-sm leading-7 text-slate-600">
                  {response.response}
                </p>
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}
