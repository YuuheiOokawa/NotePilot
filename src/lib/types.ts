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
