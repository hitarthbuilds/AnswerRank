import type {
  FAQItem,
  Recommendation,
  RecommendationCategory,
} from "@/lib/types";

const categoryLabels: Record<RecommendationCategory, string> = {
  title: "Title",
  bullets: "Bullets",
  faq: "FAQ",
  "trust-signals": "Trust Signals",
  positioning: "Positioning",
  comparison: "Comparison",
};

type RecommendationsPanelProps = {
  recommendations: Recommendation[];
  faqItems: FAQItem[];
};

export function RecommendationsPanel({
  recommendations,
  faqItems,
}: RecommendationsPanelProps) {
  const grouped = recommendations.reduce<
    Partial<Record<RecommendationCategory, Recommendation[]>>
  >((accumulator, recommendation) => {
    const collection = accumulator[recommendation.category] ?? [];
    collection.push(recommendation);
    accumulator[recommendation.category] = collection;
    return accumulator;
  }, {});

  return (
    <section className="rounded-[26px] border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-slate-500">
            Recommendations
          </p>
          <h4 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            Highest-leverage copy moves from the current report
          </h4>
        </div>
        <span className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-semibold text-[var(--accent)]">
          Demo-ready guidance
        </span>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {Object.entries(grouped).map(([category, items]) => (
          <div
            key={category}
            className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[var(--accent)]">
              {categoryLabels[category as RecommendationCategory]}
            </p>
            <div className="mt-3 space-y-3">
              {items?.map((item) => (
                <div key={`${item.category}-${item.title}`}>
                  <div className="flex items-center gap-2">
                    <h5 className="text-sm font-semibold text-slate-800">
                      {item.title}
                    </h5>
                    <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {item.priority}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
          FAQ Preview
        </p>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {faqItems.map((item) => (
            <div
              key={item.question}
              className="rounded-2xl border border-slate-200/80 bg-white p-4"
            >
              <h5 className="text-sm font-semibold text-slate-800">
                {item.question}
              </h5>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
