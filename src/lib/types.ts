export const THEME_CATEGORIES = [
  "売れやすいテーマ",
  "無料記事向けテーマ",
  "有料記事向けテーマ",
  "自分の経験を活かせるテーマ",
  "IT・転職・資格・副業・学習系テーマ",
] as const;

export type ThemeCategory = (typeof THEME_CATEGORIES)[number];

export interface ThemeSuggestion {
  title: string;
  description: string;
  suggestedType: "free" | "paid";
  reason: string;
}

export interface ThemeRequest {
  category: string;
  profile?: string;
  genres?: string;
}

export interface ArticleRequest {
  theme: string;
  articleType: "free" | "paid";
  tone?: string;
  profile?: string;
}

export interface GeneratedSection {
  heading: string;
  content: string;
  isPaid: boolean;
}

export interface GeneratedArticle {
  title: string;
  lead: string;
  sections: GeneratedSection[];
  summary: string;
  cta: string;
  hashtags: string;
  thumbnailText: string;
}

export interface SalesPlanRequest {
  title: string;
  articleType: "free" | "paid";
  lead: string;
  sectionHeadings: string[];
}

export interface SalesPlan {
  price: number;
  salesTitle: string;
  freeScopeNote: string;
  paidValueNote: string;
  targetReader: string;
  structureAdvice: string;
  promoText: string;
}

// ---- シリーズ（テーマ別連続記事） ----

export type SeriesRole = "free" | "paid" | "summary" | "promo";

export const SERIES_ROLE_LABELS: Record<SeriesRole, string> = {
  free: "無料（読者獲得）",
  paid: "有料（具体ノウハウ）",
  summary: "まとめ（導線）",
  promo: "宣伝（有料noteへの導線）",
};

export interface SeriesPlanRequest {
  theme: string;
  count?: number; // 既定10本前後
  profile?: string;
}

export interface SeriesPlanItem {
  seriesNumber: number;
  title: string;
  description: string;
  role: SeriesRole;
  suggestedPrice?: number | null;
}

// ---- 品質チェック・ファクトチェック ----

export interface QualityReviewRequest {
  title: string;
  articleType: "free" | "paid";
  lead: string;
  sections: { heading: string; content: string; isPaid: boolean }[];
  summary: string;
}

export interface SuspectedClaim {
  text: string;
  category: string; // 数値 / 法律・制度 / 試験情報 / 料金 など
  reason: string;
}

export interface QualityReview {
  score: number; // 0-100
  typoIssues: string[];
  grammarIssues: string[];
  expressionIssues: string[]; // 不自然な表現・誇大表現
  duplicationIssues: string[];
  titleMatch: { ok: boolean; note: string };
  paidSplit: { ok: boolean; note: string };
  valueAssessment: string;
  claims: SuspectedClaim[]; // 要確認情報（断定を避け「確認が必要」として扱う）
  suggestions: string[];
}
