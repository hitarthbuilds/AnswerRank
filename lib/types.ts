export type ProviderId = "openai" | "gemini" | "anthropic";

export type AuditMode = "free" | "full";

export type CoverageLevel = "sample" | "partial" | "tri-engine";

export type CacheStatus = "hit" | "miss" | "skipped";

export type ToolId = "firecrawl";

export type ExternalServiceId = ProviderId | ToolId;

export type ProviderStatus = "success" | "failed";

export type Sentiment =
  | "positive"
  | "neutral"
  | "negative"
  | "not_mentioned";

export type RecommendationCategory =
  | "title"
  | "bullets"
  | "faq"
  | "trust-signals"
  | "positioning"
  | "comparison";

export type RecommendationPriority = "high" | "medium" | "low";

export type DiagnoseRequest = {
  productName: string;
  productUrl?: string;
  productDescription?: string;
  targetQuery: string;
  buyerIntentQuery?: string;
  competitors?: string[] | string;
  audience?: string;
  region?: string;
  auditMode?: AuditMode;
  leadEmail?: string;
};

export type QueryIntent =
  | "best_for_use_case"
  | "comparison"
  | "alternative"
  | "problem_solution"
  | "ingredient_or_feature"
  | "regional_purchase"
  | "trust_or_safety"
  | "price_value";

export type ExpandedQuery = {
  id: string;
  query: string;
  intent: QueryIntent;
  priority: "high" | "medium" | "low";
  source: "seed" | "deterministic" | "llm";
};

export type QueryExpansionResult = {
  seedQuery: string;
  expandedQueries: ExpandedQuery[];
  mode: AuditMode;
  generatedAt: string;
};

export type ScoreBreakdown = {
  mentionFrequency: number;
  rankPosition: number;
  sentimentConfidence: number;
  competitorGap: number;
  queryRelevance: number;
};

export type MentionedProduct = {
  name: string;
  brand: string;
  rank: number;
  reason: string;
  isUserProduct: boolean;
};

export type ParsedMentionResult = {
  mentionedProducts: MentionedProduct[];
  userProductMentioned: boolean;
  userProductRank: number | null;
  sentiment: Sentiment;
  confidence: number;
};

export type ModelResult = {
  provider: ProviderId;
  status: ProviderStatus;
  mentioned: boolean;
  rank: number | null;
  sentiment: Sentiment;
  confidence: number;
  summary: string;
  mentionedProducts: MentionedProduct[];
};

export type CompetitorScore = {
  name: string;
  mentions: number;
  averageRank: number | null;
  visibilityScore: number;
  winReason: string;
  reasons: string[];
};

export type Recommendation = {
  category: RecommendationCategory;
  priority: RecommendationPriority;
  title: string;
  description: string;
};

export type FAQItem = {
  question: string;
  answer: string;
};

export type RawModelResponse = {
  provider: ProviderId;
  queryId?: string;
  intent?: QueryIntent;
  query: string;
  response: string;
};

export type QueryProviderResult = {
  queryId: string;
  query: string;
  intent: QueryIntent;
  provider: ProviderId;
  productMentioned: boolean;
  productRank?: number | null;
  competitorMentions: Array<{
    name: string;
    rank?: number | null;
    sentiment?: "positive" | "neutral" | "negative";
  }>;
  rawSummary?: string;
  confidence?: number;
};

export type QueryVisibilitySummary = {
  queryId: string;
  query: string;
  intent: QueryIntent;
  productMentionedAcrossProviders: number;
  bestRank?: number | null;
  strongestCompetitor?: string | null;
  visibilityStatus: "visible" | "weak" | "invisible";
};

export type ModelWiseScore = {
  provider: ProviderId;
  visibilityScore: number;
  mentionRate: number;
  averageRank: number | null;
  queryCoverage: number;
};

export type CompetitorShareOfVoice = {
  name: string;
  mentionCount: number;
  providerCount: number;
  queryCount: number;
  averageRank: number | null;
  advantageVsProduct: number;
};

export type QueryCoverageSummary = {
  totalExpandedQueries: number;
  highPriorityQueries: number;
  productVisibleOnHighPriorityQueries: number;
  invisibleQueries: string[];
};

export type FirecrawlStatus = "used" | "skipped" | "failed" | "unavailable";

export type ProviderError = {
  provider: ExternalServiceId;
  message: string;
  recoverable: boolean;
};

export type DiagnoseMetadata = {
  mode: "mock" | "live";
  source:
    | "mock"
    | "gemini-live"
    | "full-live"
    | "live-partial"
    | "mock-fallback";
  auditMode: AuditMode;
  demoMode: boolean;
  providersConfigured: string[];
  providersUsed: string[];
  providersSkipped: string[];
  toolsUsed: string[];
  toolsAttempted: string[];
  firecrawlStatus: FirecrawlStatus;
  cacheStatus: CacheStatus;
  expectedProviderCount: number;
  successfulProviderCount: number;
  providerCoverageRatio: number;
  sampledScore: number;
  coverageAdjusted: boolean;
  fallbackReason?: string;
  providerErrors?: ProviderError[];
  urlContextLength?: number;
};

export type DiagnoseResponse = {
  reportId: string;
  source: "mock" | "live";
  metadata: DiagnoseMetadata;
  generatedAt: string;
  productName: string;
  productUrl?: string;
  productDescription?: string;
  targetQuery: string;
  audience?: string;
  region?: string;
  overallScore: number;
  visibilityScore: number;
  confidenceScore: number;
  coverageLevel: CoverageLevel;
  scoreBreakdown: ScoreBreakdown;
  modelResults: ModelResult[];
  expandedQueries: ExpandedQuery[];
  queryExpansion: QueryExpansionResult;
  queryProviderResults: QueryProviderResult[];
  queryVisibilitySummaries: QueryVisibilitySummary[];
  modelWiseScores: ModelWiseScore[];
  competitorShareOfVoice: CompetitorShareOfVoice[];
  queryCoverage: QueryCoverageSummary;
  competitorLeaderboard: CompetitorScore[];
  insights: string[];
  recommendations: Recommendation[];
  faqItems: FAQItem[];
  rawResponses: RawModelResponse[];
  errors: ProviderError[];
};

export type FixItRequest = {
  report: DiagnoseResponse;
  productDescription?: string;
};

export type FixItResponse = {
  rewrittenTitle: string;
  rewrittenBullets: string[];
  generatedFAQ: FAQItem[];
  positioningStatement: string;
};

export type DiagnosticFormValues = {
  productName: string;
  productUrl: string;
  productDescription: string;
  targetQuery: string;
  competitors: string;
  audience: string;
  region: string;
};

export type LeadCaptureSource =
  | "form"
  | "report_cta"
  | "full_audit_request";

export type LeadRequest = {
  email: string;
  companyName?: string;
  productName?: string;
  productUrl?: string;
  buyerIntentQuery?: string;
  source: LeadCaptureSource;
  auditModeRequested: AuditMode;
};
