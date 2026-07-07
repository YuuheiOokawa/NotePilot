"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import ReviewPanel, { type FactClaimData } from "@/components/ReviewPanel";
import { toast } from "@/components/Toast";
import { SERIES_ROLE_LABELS, type SeriesRole } from "@/lib/types";
import type { CheckStatus, ReadinessStatus } from "@/lib/review";

interface Section {
  heading: string;
  content: string;
  isPaid: boolean;
}

interface Approval {
  id: string;
  status: string;
  comment: string | null;
  requestedAt: string;
  resolvedAt: string | null;
}

interface Article {
  id: string;
  title: string;
  articleType: "free" | "paid";
  status: string;
  lead: string;
  summary: string;
  cta: string;
  hashtags: string;
  thumbnailText: string;
  price: number | null;
  noteUrl: string | null;
  sections: Section[];
  approvalRequests: Approval[];
  // シリーズ
  themeGroup: { id: string; name: string } | null;
  seriesNumber: number | null;
  seriesRole: SeriesRole | null;
  // 品質チェック・スケジュール
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

export default function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/articles/${id}`);
    if (res.ok) setArticle(await res.json());
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!article) {
    return (
      <>
        <Header title="記事詳細" backHref="/articles" />
        <p className="py-8 text-center text-xs text-gray-400">読み込み中...</p>
      </>
    );
  }

  const update = (patch: Partial<Article>) => setArticle({ ...article, ...patch });

  const updateSection = (i: number, patch: Partial<Section>) => {
    const sections = article.sections.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    update({ sections });
  };

  const save = async () => {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: article.title,
          lead: article.lead,
          summary: article.summary,
          cta: article.cta,
          hashtags: article.hashtags,
          thumbnailText: article.thumbnailText,
          sections: article.sections,
        }),
      });
      if (!res.ok) throw new Error();
      toast("保存しました。内容を変更したので品質チェックの再実行が必要です", "info");
      await load();
    } catch {
      toast("保存に失敗しました", "error");
    } finally {
      setSaving(false);
    }
  };

  const transition = async (to: string, extra: Record<string, unknown> = {}) => {
    const res = await fetch(`/api/articles/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, ...extra }),
    });
    if (res.ok) {
      await load();
      return true;
    }
    const body = await res.json().catch(() => ({}));
    toast(body.error ?? "ステータス変更に失敗しました", "error");
    return false;
  };

  // 1タップで「確認に出す→承認」まで進める（承認はこのボタン＝ユーザー操作）
  const quickApprove = async () => {
    if (!confirm("この記事を承認しますか？（確認に出す→承認 を一括で行います）")) return;
    if (!(await transition("review"))) return;
    if (await transition("approved")) toast("承認しました。プレビューからコピーできます");
  };

  const markPosted = async () => {
    const url = prompt("投稿したnote記事のURL（任意）を入力してください", article.noteUrl ?? "");
    if (url === null) return;
    if (!confirm("この記事を「投稿済み」として記録しますか？")) return;
    await transition("posted", { noteUrl: url || undefined });
  };

  const reject = async () => {
    const comment = prompt("差し戻しコメント（任意）");
    if (comment === null) return;
    await transition("draft", { comment });
  };

  const editable = ["idea", "draft", "review"].includes(article.status);

  return (
    <>
      <Header title="記事詳細" backHref="/articles" />
      <main className="space-y-4 p-4">
        {/* ステータスと操作 */}
        <div className="card space-y-3">
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                article.articleType === "paid"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-sky-100 text-sky-700"
              }`}
            >
              {article.articleType === "paid" ? `有料${article.price ? ` ¥${article.price}` : ""}` : "無料"}
            </span>
            <StatusBadge status={article.status} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {article.status === "draft" && article.publishReadinessStatus === "ready" && (
              <button
                className="col-span-2 rounded-xl bg-green-600 py-3 text-sm font-bold text-white active:bg-green-700"
                onClick={quickApprove}
              >
                ✅ 承認まで進める（チェックOK・1タップ）
              </button>
            )}
            {article.status === "draft" && (
              <button
                className={`col-span-2 rounded-xl py-3 text-sm font-bold ${
                  article.publishReadinessStatus === "ready"
                    ? "border border-gray-300 text-gray-600 active:bg-gray-100"
                    : "bg-orange-500 text-white active:bg-orange-600"
                }`}
                onClick={() => transition("review")}
              >
                確認に出す（承認リクエスト）
              </button>
            )}
            {article.status === "review" && (
              <>
                <button
                  className="rounded-xl bg-green-600 py-3 text-sm font-bold text-white active:bg-green-700 disabled:opacity-40"
                  disabled={article.publishReadinessStatus !== "ready"}
                  onClick={() => confirm("この記事を承認しますか？投稿可能な状態になります。") && transition("approved")}
                >
                  ✅ 承認する
                </button>
                <button
                  className="rounded-xl border border-gray-300 py-3 text-sm font-bold text-gray-600 active:bg-gray-100"
                  onClick={reject}
                >
                  差し戻す
                </button>
                {article.publishReadinessStatus !== "ready" && (
                  <p className="col-span-2 text-[10px] text-red-500">
                    ⚠️ 品質チェックが「投稿準備OK」になるまで承認できません（未確認情報が残っている記事は投稿できません）。下の品質チェックを実行・解消してください。
                  </p>
                )}
              </>
            )}
            {(article.status === "approved" || article.status === "copied") && (
              <Link
                href={`/articles/${id}/preview`}
                className="col-span-2 rounded-xl bg-note py-3 text-center text-sm font-bold text-white active:bg-note-dark"
              >
                📋 コピー用プレビューを開く
              </Link>
            )}
            {article.status === "copied" && (
              <button
                className="col-span-2 rounded-xl border border-note py-3 text-sm font-bold text-note-dark active:bg-note/10"
                onClick={markPosted}
              >
                noteに投稿済みとして記録する
              </button>
            )}
            {article.status === "approved" && (
              <button
                className="col-span-2 rounded-xl border border-gray-300 py-2 text-xs text-gray-500 active:bg-gray-100"
                onClick={() => transition("draft")}
              >
                下書きに戻す
              </button>
            )}
            {article.status === "archived" ? (
              <button
                className="col-span-2 rounded-xl border border-gray-300 py-2 text-xs text-gray-500 active:bg-gray-100"
                onClick={() => transition("draft")}
              >
                下書きとして復元
              </button>
            ) : (
              article.status !== "posted" && (
                <button
                  className="col-span-2 rounded-xl py-2 text-xs text-gray-400 active:bg-gray-50"
                  onClick={() => confirm("アーカイブしますか？") && transition("archived")}
                >
                  アーカイブ
                </button>
              )
            )}
            {article.status === "posted" && (
              <button
                className="col-span-2 rounded-xl py-2 text-xs text-gray-400 active:bg-gray-50"
                onClick={() => confirm("アーカイブしますか？") && transition("archived")}
              >
                アーカイブ
              </button>
            )}
          </div>

          {article.articleType === "paid" && (
            <Link
              href={`/articles/${id}/sales`}
              className="block rounded-xl border border-amber-300 bg-amber-50 py-3 text-center text-sm font-bold text-amber-700 active:bg-amber-100"
            >
              💰 有料記事設定（価格・宣伝文）
            </Link>
          )}

          {article.noteUrl && (
            <p className="break-all text-[10px] text-gray-400">投稿URL: {article.noteUrl}</p>
          )}

          {article.themeGroup && (
            <Link
              href={`/series/${article.themeGroup.id}`}
              className="block rounded-xl bg-gray-50 p-3 text-[11px] text-gray-600 active:bg-gray-100"
            >
              📚 シリーズ「{article.themeGroup.name}」 第{article.seriesNumber}回
              {article.seriesRole && `（${SERIES_ROLE_LABELS[article.seriesRole]}）`} →
            </Link>
          )}
        </div>

        {/* 記事レビュー（品質チェック・ファクトチェック・要確認リスト・スケジュール） */}
        <ReviewPanel article={article} onChanged={load} />

        {/* 本文編集 */}
        <div className="card space-y-3">
          <h2 className="text-xs font-bold text-gray-500">記事内容{!editable && "（このステータスでは編集できません）"}</h2>

          <div>
            <label className="label">タイトル</label>
            <textarea
              className="input"
              value={article.title}
              disabled={!editable}
              onChange={(e) => update({ title: e.target.value })}
            />
          </div>
          <div>
            <label className="label">導入文</label>
            <textarea
              className="input min-h-[100px]"
              value={article.lead}
              disabled={!editable}
              onChange={(e) => update({ lead: e.target.value })}
            />
          </div>

          {article.sections.map((s, i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-400">セクション {i + 1}</label>
                {article.articleType === "paid" && (
                  <button
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      s.isPaid ? "bg-amber-200 text-amber-800" : "bg-gray-200 text-gray-500"
                    }`}
                    disabled={!editable}
                    onClick={() => updateSection(i, { isPaid: !s.isPaid })}
                  >
                    {s.isPaid ? "🔒 有料部分" : "無料部分"}
                  </button>
                )}
              </div>
              <input
                className="input mb-2 font-bold"
                value={s.heading}
                disabled={!editable}
                onChange={(e) => updateSection(i, { heading: e.target.value })}
              />
              <textarea
                className="input min-h-[120px]"
                value={s.content}
                disabled={!editable}
                onChange={(e) => updateSection(i, { content: e.target.value })}
              />
            </div>
          ))}

          <div>
            <label className="label">まとめ</label>
            <textarea
              className="input min-h-[80px]"
              value={article.summary}
              disabled={!editable}
              onChange={(e) => update({ summary: e.target.value })}
            />
          </div>
          <div>
            <label className="label">CTA</label>
            <textarea
              className="input"
              value={article.cta}
              disabled={!editable}
              onChange={(e) => update({ cta: e.target.value })}
            />
          </div>
          <div>
            <label className="label">ハッシュタグ</label>
            <input
              className="input"
              value={article.hashtags}
              disabled={!editable}
              onChange={(e) => update({ hashtags: e.target.value })}
            />
          </div>
          <div>
            <label className="label">サムネイル文言</label>
            <input
              className="input"
              value={article.thumbnailText}
              disabled={!editable}
              onChange={(e) => update({ thumbnailText: e.target.value })}
            />
          </div>

          {editable && (
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? "保存中..." : "変更を保存"}
            </button>
          )}
          {message && <p className="text-center text-xs font-bold text-note-dark">{message}</p>}
        </div>

        {/* 承認履歴 */}
        {article.approvalRequests.length > 0 && (
          <div className="card">
            <h2 className="mb-2 text-xs font-bold text-gray-500">承認履歴</h2>
            <ul className="space-y-1.5">
              {article.approvalRequests.map((a) => (
                <li key={a.id} className="text-[11px] text-gray-500">
                  {new Date(a.requestedAt).toLocaleString("ja-JP")}:{" "}
                  {a.status === "pending" ? "確認待ち" : a.status === "approved" ? "✅ 承認" : "↩️ 差し戻し"}
                  {a.comment && <span className="text-gray-400">（{a.comment}）</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 削除 */}
        <button
          className="w-full py-2 text-xs text-red-300 active:text-red-500"
          onClick={async () => {
            if (!confirm("この記事を完全に削除しますか？この操作は取り消せません。")) return;
            await fetch(`/api/articles/${id}`, { method: "DELETE" });
            router.push("/articles");
          }}
        >
          この記事を削除する
        </button>
      </main>
    </>
  );
}
