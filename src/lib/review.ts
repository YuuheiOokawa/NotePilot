// 品質チェック・投稿可否の判定ロジック。
// 重要ルール: 未確認情報(hasUnverifiedClaims)が残っている記事は投稿準備完了(ready)にしない。

export type ReadinessStatus = "not_ready" | "needs_review" | "ready";
export type CheckStatus = "not_checked" | "passed" | "issues_found";

export interface ReadinessInput {
  checked: boolean; // 品質チェックを実行済みか
  hasUnverifiedClaims: boolean; // 未確認情報が残っているか
  typoCheckStatus: CheckStatus;
  factCheckStatus: CheckStatus;
}

export function computeReadiness(input: ReadinessInput): ReadinessStatus {
  if (!input.checked) return "not_ready";
  // 未確認情報が1件でも残っていれば絶対に ready にしない
  if (input.hasUnverifiedClaims) return "needs_review";
  if (input.typoCheckStatus === "issues_found" || input.factCheckStatus === "issues_found") {
    return "needs_review";
  }
  return "ready";
}

// 承認(approved)可能か。ready 以外は承認不可＝投稿可能な状態にならない。
export function canApprove(readiness: ReadinessStatus, hasUnverifiedClaims: boolean): boolean {
  return readiness === "ready" && !hasUnverifiedClaims;
}

export const READINESS_LABELS: Record<ReadinessStatus, string> = {
  not_ready: "チェック未実施",
  needs_review: "要修正・要確認",
  ready: "投稿準備OK",
};

export const READINESS_COLORS: Record<ReadinessStatus, string> = {
  not_ready: "bg-gray-100 text-gray-500",
  needs_review: "bg-red-100 text-red-600",
  ready: "bg-green-100 text-green-700",
};

export const CHECK_LABELS: Record<CheckStatus, string> = {
  not_checked: "未チェック",
  passed: "OK",
  issues_found: "要修正",
};
