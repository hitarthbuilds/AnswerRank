type BaseProps = {
  className?: string;
};

type FeatureBadgeKind =
  | "diagnostic"
  | "score"
  | "ranking"
  | "metadata"
  | "magic"
  | "insight"
  | "rewrite"
  | "context"
  | "mock"
  | "live";

function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function BadgeGlyph({ kind }: { kind: FeatureBadgeKind }) {
  if (kind === "score") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
        <path
          d="M4 12a6 6 0 1 1 12 0"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M10 12l3-3"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="10" cy="12" r="1.1" fill="currentColor" />
      </svg>
    );
  }

  if (kind === "ranking") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
        <rect x="3" y="10" width="3" height="7" rx="1.2" fill="currentColor" />
        <rect x="8.5" y="7" width="3" height="10" rx="1.2" fill="currentColor" opacity="0.78" />
        <rect x="14" y="4" width="3" height="13" rx="1.2" fill="currentColor" opacity="0.58" />
      </svg>
    );
  }

  if (kind === "metadata") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
        <path
          d="M4.5 6.5 10 3.5l5.5 3-5.5 3-5.5-3Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M4.5 10 10 13l5.5-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M4.5 13.5 10 16.5l5.5-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "magic" || kind === "insight") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
        <path d="M10 2.8 11.5 7 15.8 8.5 11.5 10 10 14.2 8.5 10 4.2 8.5 8.5 7 10 2.8Z" fill="currentColor" />
        <path d="M15.6 2.6 16.2 4.1 17.7 4.7 16.2 5.3 15.6 6.8 15 5.3 13.5 4.7 15 4.1 15.6 2.6Z" fill="currentColor" opacity="0.7" />
      </svg>
    );
  }

  if (kind === "rewrite") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
        <path
          d="M4.5 14.8 5.2 11.7l6.7-6.7 3 3-6.7 6.7-3.2.7Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="m10.8 6.1 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "context") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
        <rect x="4" y="3.5" width="12" height="13" rx="2.2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M7 7.2h6M7 10.2h6M7 13.2h4.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "mock") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
        <rect x="3.5" y="4.5" width="13" height="11" rx="2.4" stroke="currentColor" strokeWidth="1.4" />
        <path d="M7 9.5h6M7 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "live") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
        <circle cx="10" cy="10" r="3.1" fill="currentColor" />
        <circle cx="10" cy="10" r="6.1" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.4" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M4.5 6.5h7.5l3.5 3.2V15a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 15V6.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M7 9.2h6M7 12.2h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ProviderGlyph({ label }: { label: string }) {
  const normalized = label.toLowerCase();
  const isFirecrawl = normalized.includes("firecrawl");
  const isMock = normalized.includes("mock");
  const isLive = normalized.includes("live");

  if (isFirecrawl) {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
        <path
          d="M10 2.8c2.6 1.9 4.5 4.4 4.5 7.1A4.5 4.5 0 0 1 10 14.4 4.5 4.5 0 0 1 5.5 9.9c0-2.7 1.9-5.2 4.5-7.1Z"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <circle cx="10" cy="9.8" r="1.5" fill="currentColor" />
      </svg>
    );
  }

  if (isMock || isLive) {
    return <BadgeGlyph kind={isMock ? "mock" : "live"} />;
  }

  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M4.3 10.1 7.8 6.6l2.2 2.2 5-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12.8 3.8h2.6v2.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BrandMarkSvg({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 72 72"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="answerrank-mark-accent" x1="16" y1="14" x2="57" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#38BDF8" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="answerrank-mark-success" x1="18" y1="38" x2="51" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22D3EE" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
      </defs>
      <path
        d="M15 16.5A9.5 9.5 0 0 1 24.5 7h22A9.5 9.5 0 0 1 56 16.5v20.8a9.5 9.5 0 0 1-9.5 9.5H32.4l-8.8 8c-1.7 1.6-4.5.4-4.5-1.9V46.8A9.5 9.5 0 0 1 15 37.3V16.5Z"
        fill="#07131C"
        stroke="rgba(56,189,248,0.28)"
        strokeWidth="1.5"
      />
      <rect x="24" y="31" width="6.8" height="10" rx="3.2" fill="#34D399" />
      <rect x="34" y="24" width="6.8" height="17" rx="3.2" fill="url(#answerrank-mark-success)" />
      <rect x="44" y="18" width="6.8" height="23" rx="3.2" fill="url(#answerrank-mark-accent)" />
      <path
        d="M22 45.2c6.3-5.6 12-7.6 18.5-6.8 3.9.5 7.2 1.8 11.5 4.8"
        stroke="rgba(226,232,240,0.52)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M50.6 13.3 52.1 17l3.7 1.5-3.7 1.5-1.5 3.7-1.5-3.7-3.7-1.5 3.7-1.5 1.5-3.7Z" fill="#E0E7FF" />
    </svg>
  );
}

export function AnswerRankMark({ className }: BaseProps) {
  return (
    <BrandMarkSvg
      className={cn("h-11 w-11 shrink-0", className)}
      title="AnswerRank AI mark"
    />
  );
}

export function AnswerRankWordmark({ className }: BaseProps) {
  return (
    <svg
      viewBox="0 0 290 60"
      className={cn("h-10 w-auto", className)}
      role="img"
      aria-label="AnswerRank AI"
      xmlns="http://www.w3.org/2000/svg"
    >
      <text
        x="0"
        y="31"
        fill="#0F172A"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="28"
        fontWeight="700"
        letterSpacing="-0.7"
      >
        AnswerRank
      </text>
      <text
        x="218"
        y="31"
        fill="#0EA5E9"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="28"
        fontWeight="700"
        letterSpacing="-0.7"
      >
        AI
      </text>
      <text
        x="1"
        y="52"
        fill="#64748B"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="11"
        fontWeight="700"
        letterSpacing="2.8"
      >
        AI VISIBILITY DIAGNOSTIC
      </text>
    </svg>
  );
}

export function AnswerRankLogo({ className }: BaseProps) {
  return (
    <div
      className={cn("inline-flex items-center gap-3", className)}
      aria-label="AnswerRank AI"
    >
      <AnswerRankMark />
      <AnswerRankWordmark className="hidden sm:block" />
      <div className="sm:hidden">
        <span className="block text-lg font-semibold tracking-tight text-slate-950">
          AnswerRank AI
        </span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
          AI Visibility Diagnostic
        </span>
      </div>
    </div>
  );
}

export function ProviderBadge({
  provider,
  className,
}: {
  provider: string;
  className?: string;
}) {
  const normalized = provider.toLowerCase();

  const tone = normalized.includes("gemini")
    ? "border-sky-200 bg-sky-50 text-sky-700"
    : normalized.includes("firecrawl")
      ? "border-violet-200 bg-violet-50 text-violet-700"
      : normalized.includes("openai")
        ? "border-slate-200 bg-slate-100 text-slate-700"
        : normalized.includes("anthropic")
          ? "border-stone-200 bg-stone-100 text-stone-700"
          : normalized.includes("mock")
            ? "border-slate-200 bg-slate-100 text-slate-600"
            : normalized.includes("live")
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-700";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm",
        tone,
        className,
      )}
      aria-label={provider}
    >
      <ProviderGlyph label={provider} />
      <span>{provider}</span>
    </span>
  );
}

export function FeatureBadge({
  label,
  kind = "diagnostic",
  className,
}: {
  label: string;
  kind?: FeatureBadgeKind;
  className?: string;
}) {
  const tone = kind === "score"
    ? "border-emerald-200 bg-emerald-50/90 text-emerald-700"
    : kind === "ranking"
      ? "border-sky-200 bg-sky-50/90 text-sky-700"
      : kind === "metadata"
        ? "border-violet-200 bg-violet-50/90 text-violet-700"
        : kind === "magic" || kind === "rewrite"
          ? "border-fuchsia-200 bg-fuchsia-50/90 text-fuchsia-700"
          : kind === "context"
            ? "border-cyan-200 bg-cyan-50/90 text-cyan-700"
            : kind === "mock"
              ? "border-slate-200 bg-slate-100 text-slate-600"
              : kind === "live"
                ? "border-emerald-200 bg-emerald-50/90 text-emerald-700"
                : "border-slate-200 bg-white/90 text-slate-700";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm",
        tone,
        className,
      )}
      aria-label={label}
    >
      <BadgeGlyph kind={kind} />
      <span>{label}</span>
    </span>
  );
}
