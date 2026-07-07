"use client";

import { useState } from "react";
import {
  CHECK_LABELS,
  READINESS_COLORS,
  READINESS_LABELS,
  type CheckStatus,
  type ReadinessStatus,
} from "@/lib/review";
import type { QualityReview } from "@/lib/types";

export interface FactClaimData {
  id: string;
  text: string;
  category: string;
  reason: string;
  status: "unverified" | "verified" | "removed";
}

export interface ReviewArticleData {
  id: string;
  qualityScore: number | null;
  typoCheckStatus: CheckStatus;
  factCheckStatus: CheckStatus;
  hasUnverifiedClaims: boolean;
  publishReadinessStatus: ReadinessStatus;
  reviewNotes: string;
  scheduledAt: string | null;
  factClaims: FactClaimData[];
  qualityChecks: { id: string; score: number; resultJson: string; createdAt: string }[];
}

// 記事レビュー画面: 品質チェック結果 / 誤字脱字 / ファクトチェック / 要確認リスト / 改善提案 / 投稿可否
export default function ReviewPanel({
  article,
  onChanged,
}: {
  article: ReviewArticleData;
  onChanged: () => void;
}) {
  const [checking, setChecking] = useState(false);
  const [notes, setNotes] = useState(article.reviewNotes);
  const [savingNotes, setSavingNotes] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(
    article.scheduledAt ? toLocalInput(article.scheduledAt) : "",
  );
  const [scheduleMsg, setScheduleMsg] = useState("");

  const latest = article.qualityChecks[0];
  let review: QualityReview | null = null;
  if (latest) {
    try {
      review = JSON.parse(latest.resultJson) as QualityReview;
    } catch {
      review = null;
    }
  }

  const runCheck = async () => {
    setChecking(true);
    try {
      const res = await fetch(`/api/articles/${article.id}/quality-check`, { method: "POST" });
      if (!res.ok) throw new Error();
      onChanged();
    } catch {
      alert("品質チェックに失敗しました");
    } finally {
      setChecking(false);
    }
  };

  const setClaimStatus = async (claimId: string, status: string) => {
    const res = await fetch(`/api/claims/${claimId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) onChanged();
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewNotes: notes }),
      });
      onChanged();
    } finally {
      setSavingNotes(false);
    }
  };

  const saveSchedule = async (clear: boolean) => {
    setScheduleMsg("");
    const res = await fetch(`/api/articles/${article.id}/schedule`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduledAt: clear ? null : scheduledAt ? new Date(scheduledAt).toISOString() : null,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setScheduleMsg(body.error ?? "設定に失敗しました");
      return;
    }
    setScheduleMsg(clear ? "予定を解除しました" : "投稿予定を設定しました");
    if (clear) setScheduledAt("");
    onChanged();
  };

  const activeClaims = article.factClaims.filter((c) => c.status !== "removed");
  const unverifiedCount = activeClaims.filter((c) => c.status === "unverified").length;

  return (
    <>
      {/* 品質チェック結果・投稿可否 */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-500">品質チェック・ファクトチェック</h2>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${READINESS_COLORS[article.publishReadinessStatus]}`}
          >
            {READINESS_LABELS[article.publishReadinessStatus]}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-gray-50 py-2">
            <div className="text-lg font-bold">
              {article.qualityScore !== null ? article.qualityScore : "--"}
            </div>
            <div className="text-[10px] text-gray-400">品質スコア</div>
          </div>
          <div className="rounded-xl bg-gray-50 py-2">
            <div
              className={`text-sm font-bold ${
                article.typoCheckStatus === "passed"
                  ? "text-green-600"
                  : article.typoCheckStatus === "issues_found"
                    ? "text-red-500"
                    : "text-gray-400"
              }`}
            >
              {CHECK_LABELS[article.typoCheckStatus]}
            </div>
            <div className="text-[10px] text-gray-400">誤字・表現</div>
          </div>
          <div className="rounded-xl bg-gray-50 py-2">
            <div
              className={`text-sm font-bold ${
                article.factCheckStatus === "passed"
                  ? "text-green-600"
                  : article.factCheckStatus === "issues_found"
                    ? "text-red-500"
                    : "text-gray-400"
              }`}
            >
              {CHECK_LABELS[article.factCheckStatus]}
            </div>
            <div className="text-[10px] text-gray-400">ファクト</div>
          </div>
        </div>

        <button className="btn-secondary" onClick={runCheck} disabled={checking}>
          {checking
            ? "チェック中..."
            : article.typoCheckStatus === "not_checked"
              ? "🔍 品質チェックを実行（承認前に必須）"
              : "🔍 品質チェックを再実行"}
        </button>

        {article.publishReadinessStatus !== "ready" && (
          <p className="text-[10px] text-gray-400">
            {article.publishReadinessStatus === "not_ready"
              ? "※ 品質チェックを実行し、問題がない状態になるまで承認（投稿準備完了）できません。"
              : "※ 要修正項目・未確認情報をすべて解消すると「投稿準備OK」になります。"}
          </p>
        )}
      </div>

      {/* チェック結果詳細 */}
      {review && (
        <div className="card space-y-3">
          <h2 className="text-xs font-bold text-gray-500">チェック結果詳細</h2>

          {review.typoIssues.length + review.grammarIssues.length > 0 && (
            <IssueList title="✏️ 誤字脱字・文法" items={[...review.typoIssues, ...review.grammarIssues]} color="text-red-500" />
          )}
          {review.expressionIssues.length > 0 && (
            <IssueList title="⚠️ 表現・誇大表現" items={review.expressionIssues} color="text-orange-600" />
          )}
          {review.duplicationIssues.length > 0 && (
            <IssueList title="🔁 内容の重複" items={review.duplicationIssues} color="text-orange-600" />
          )}

          <div className="space-y-1 text-[11px]">
            <p className={review.titleMatch.ok ? "text-green-600" : "text-red-500"}>
              {review.titleMatch.ok ? "✓" : "✕"} タイトルと本文の一致: {review.titleMatch.note}
            </p>
            <p className={review.paidSplit.ok ? "text-green-600" : "text-red-500"}>
              {review.paidSplit.ok ? "✓" : "✕"} 無料/有料の切り分け: {review.paidSplit.note}
            </p>
          </div>

          <div className="rounded-xl bg-gray-50 p-3">
            <p className="mb-1 text-[10px] font-bold text-gray-400">読者価値の評価</p>
            <p className="text-[11px] text-gray-600">{review.valueAssessment}</p>
          </div>

          {review.suggestions.length > 0 && (
            <div className="rounded-xl border border-note/30 bg-note/5 p-3">
              <p className="mb-1 text-[10px] font-bold text-note-dark">💡 改善提案</p>
              <ul className="space-y-1">
                {review.suggestions.map((s, i) => (
                  <li key={i} className="text-[11px] text-gray-600">
                    ・{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 要確認リスト（ファクトチェック） */}
      {activeClaims.length > 0 && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-500">要確認リスト</h2>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                unverifiedCount > 0 ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"
              }`}
            >
              未確認 {unverifiedCount} 件
            </span>
          </div>
          <p className="text-[10px] text-gray-400">
            数値・法律・制度・試験情報・料金などは正確性の確認が必要です。事実確認ができたら「確認済み」に、本文から削除した場合は「削除済み」にしてください。未確認が残っている記事は投稿準備完了になりません。
          </p>
          {activeClaims.map((c) => (
            <div
              key={c.id}
              className={`rounded-xl border p-3 ${
                c.status === "verified" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
              }`}
            >
              <div className="mb-1 flex items-center gap-1.5">
                <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
                  {c.category}
                </span>
                <span
                  className={`text-[10px] font-bold ${
                    c.status === "verified" ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {c.status === "verified" ? "✓ 確認済み" : "⚠ 要確認"}
                </span>
              </div>
              <p className="text-[11px] text-gray-700">{c.text}</p>
              <p className="mt-1 text-[10px] text-gray-400">{c.reason}</p>
              <div className="mt-2 flex gap-2">
                {c.status === "unverified" ? (
                  <button
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-[10px] font-bold text-white active:bg-green-700"
                    onClick={() => setClaimStatus(c.id, "verified")}
                  >
                    事実確認できたので確認済みにする
                  </button>
                ) : (
                  <button
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-[10px] text-gray-500 active:bg-gray-100"
                    onClick={() => setClaimStatus(c.id, "unverified")}
                  >
                    未確認に戻す
                  </button>
                )}
                <button
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-[10px] text-gray-500 active:bg-gray-100"
                  onClick={() => setClaimStatus(c.id, "removed")}
                >
                  本文から削除した
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* レビューメモ */}
      <div className="card space-y-2">
        <h2 className="text-xs font-bold text-gray-500">レビューメモ</h2>
        <textarea
          className="input min-h-[80px]"
          placeholder="確認したこと・修正予定などを記録"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button className="btn-secondary py-2 text-xs" onClick={saveNotes} disabled={savingNotes}>
          {savingNotes ? "保存中..." : "メモを保存"}
        </button>
      </div>

      {/* 投稿スケジュール */}
      <div className="card space-y-2">
        <h2 className="text-xs font-bold text-gray-500">投稿予定（1時間に最大3件まで）</h2>
        <input
          className="input"
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            className="rounded-xl bg-note py-2.5 text-xs font-bold text-white active:bg-note-dark disabled:opacity-50"
            onClick={() => saveSchedule(false)}
            disabled={!scheduledAt}
          >
            予定を設定
          </button>
          <button
            className="rounded-xl border border-gray-300 py-2.5 text-xs text-gray-500 active:bg-gray-100"
            onClick={() => saveSchedule(true)}
          >
            予定を解除
          </button>
        </div>
        {scheduleMsg && <p className="text-[11px] font-bold text-note-dark">{scheduleMsg}</p>}
        <p className="text-[10px] text-gray-400">
          ※ 予定はあくまで管理用の目安です。実際の投稿はあなたが承認後に手動で行います（自動投稿はしません）。
        </p>
      </div>
    </>
  );
}

function IssueList({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold text-gray-400">{title}</p>
      <ul className="space-y-0.5">
        {items.map((item, i) => (
          <li key={i} className={`text-[11px] ${color}`}>
            ・{item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
