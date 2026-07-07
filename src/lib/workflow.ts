export const STATUSES = [
  "idea",
  "draft",
  "review",
  "approved",
  "copied",
  "posted",
  "archived",
] as const;

export type ArticleStatus = (typeof STATUSES)[number];

// 許可されたステータス遷移。ここにない遷移はAPI層で拒否する（重要ルールR2）。
// approved / posted への遷移はユーザー操作のエンドポイントからのみ実行される。
const TRANSITIONS: Record<ArticleStatus, ArticleStatus[]> = {
  idea: ["draft", "archived"],
  draft: ["review", "archived"],
  review: ["approved", "draft", "archived"],
  approved: ["copied", "draft", "archived"],
  copied: ["posted", "approved", "archived"],
  posted: ["archived"],
  archived: ["draft"],
};

// ユーザーの明示的な確認・承認操作でのみ許可される遷移先
export const USER_ONLY_TARGETS: ArticleStatus[] = ["approved", "posted"];

export function isStatus(value: string): value is ArticleStatus {
  return (STATUSES as readonly string[]).includes(value);
}

export function canTransition(from: ArticleStatus, to: ArticleStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export const STATUS_LABELS: Record<ArticleStatus, string> = {
  idea: "アイデア",
  draft: "下書き",
  review: "確認待ち",
  approved: "承認済み",
  copied: "コピー済み",
  posted: "投稿済み",
  archived: "アーカイブ",
};

export const STATUS_COLORS: Record<ArticleStatus, string> = {
  idea: "bg-gray-100 text-gray-600",
  draft: "bg-yellow-100 text-yellow-700",
  review: "bg-orange-100 text-orange-700",
  approved: "bg-green-100 text-green-700",
  copied: "bg-blue-100 text-blue-700",
  posted: "bg-note/10 text-note-dark",
  archived: "bg-gray-200 text-gray-500",
};
