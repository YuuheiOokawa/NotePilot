import type {
  ArticleRequest,
  GeneratedArticle,
  QualityReview,
  QualityReviewRequest,
  SalesPlan,
  SalesPlanRequest,
  SeriesPlanItem,
  SeriesPlanRequest,
  SnsPromoRequest,
  SnsPromoVariant,
  ThemeRequest,
  ThemeSuggestion,
} from "../types";
import { MockProvider } from "./mock";

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  generateThemes(req: ThemeRequest): Promise<ThemeSuggestion[]>;
  generateArticle(req: ArticleRequest): Promise<GeneratedArticle>;
  generateSalesPlan(req: SalesPlanRequest): Promise<SalesPlan>;
  generateSeriesPlan(req: SeriesPlanRequest): Promise<SeriesPlanItem[]>;
  reviewArticle(req: QualityReviewRequest): Promise<QualityReview>;
  generateSnsPromo(req: SnsPromoRequest): Promise<SnsPromoVariant[]>;
}

let cached: AIProvider | null = null;

// env AI_PROVIDER でプロバイダを切り替える。既定はモック（APIキー不要）。
export async function getAIProvider(): Promise<AIProvider> {
  if (cached) return cached;
  const provider = process.env.AI_PROVIDER || "mock";
  if (provider === "anthropic" && process.env.ANTHROPIC_API_KEY) {
    const { AnthropicProvider } = await import("./anthropic");
    cached = new AnthropicProvider();
  } else {
    cached = new MockProvider();
  }
  return cached;
}
