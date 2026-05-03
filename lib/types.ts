export type ProviderId = "openai" | "gemini" | "anthropic";

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
  competitors?: string[] | string;
  audience?: string;
  region?: string;
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
  query: string;
  response: string;
};

export type FirecrawlStatus = "used" | "skipped" | "failed" | "unavailable";

export type ProviderError = {
  provider: ExternalServiceId;
  message: string;
  recoverable: boolean;
};

export type DiagnoseMetadata = {
  mode: "mock" | "live";
  source: "mock" | "gemini-live" | "mock-fallback";
  demoMode: boolean;
  providersConfigured: string[];
  providersUsed: string[];
  providersSkipped: string[];
  toolsUsed: string[];
  firecrawlStatus: FirecrawlStatus;
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
  scoreBreakdown: ScoreBreakdown;
  modelResults: ModelResult[];
  competitorLeaderboard: CompetitorScore[];
  insights: string[];
  recommendations: Recommendation[];
  faqItems: FAQItem[];
  rawResponses: RawModelResponse[];
  errors: ProviderError[];
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
