"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import ArticleCard, { type ArticleSummary } from "@/components/ArticleCard";
import { STATUS_LABELS } from "@/lib/workflow";

type HomeArticle = ArticleSummary & {
  publishReadinessStatus: "not_ready" | "needs_review" | "ready";
  scheduledAt: string | null;
};

export default function HomePage() {
  const [articles, setArticles] = useState<HomeArticle[]>([]);
  const [revenue, setRevenue] = useState<{ totalAmount: number; totalCount: number } | null>(null);
  const [noteUrl, setNoteUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/articles").then((r) => r.json()),
      fetch("/api/revenues").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ])
      .then(([a, r, s]) => {
        setArticles(a);
        setRevenue(r);
        setNoteUrl(s?.noteAccountUrl ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  const countBy = (status: string) => articles.filter((a) => a.status === status).length;
  const reviewCount = countBy("review");
  const recent = articles.filter((a) => a.status !== "archived").slice(0, 5);

  // 「次にやること」: ユーザーがボタンを押すだけで運用できるよう、状態から次の一手を提示する
  const nextActions: { href: string; label: string; sub: string; emphasis?: boolean }[] = [];
  const readyDrafts = articles.filter(
    (a) => a.status === "draft" && a.publishReadinessStatus === "ready",
  ).length;
  const needsFixDrafts = articles.filter(
    (a) => a.status === "draft" && a.publishReadinessStatus !== "ready",
  ).length;
  const approvedUnscheduled = articles.filter(
    (a) => (a.status === "approved" || a.status === "copied") && !a.scheduledAt,
  ).length;
  const copiedCount = countBy("copied");
  const approvedCount = countBy("approved");

  if (reviewCount > 0)
    nextActions.push({ href: "/review", label: `承認待ちを確認する（${reviewCount}件）`, sub: "内容を見て承認 / 差し戻し", emphasis: true });
  if (readyDrafts > 0)
    nextActions.push({ href: "/articles?status=draft", label: `チェックOKの下書きを承認へ（${readyDrafts}件）`, sub: "記事を開いて「承認まで進める」を押すだけ", emphasis: true });
  if (needsFixDrafts > 0)
    nextActions.push({ href: "/articles?status=draft", label: `下書きの品質チェック・修正（${needsFixDrafts}件）`, sub: "記事を開いてチェック結果を解消" });
  if (approvedCount > 0)
    nextActions.push({ href: "/articles?status=approved", label: `承認済み記事をnoteへコピー（${approvedCount}件）`, sub: "プレビューからコピー→貼り付け" });
  if (approvedUnscheduled > 0)
    nextActions.push({ href: "/schedule", label: `投稿予定を自動割当（${approvedUnscheduled}件が未設定）`, sub: "投稿キューでボタン1つ" });
  if (copiedCount > 0)
    nextActions.push({ href: "/articles?status=copied", label: `投稿したら記録する（${copiedCount}件）`, sub: "投稿済みボタンを押すだけ" });
  if (nextActions.length === 0 && !loading)
    nextActions.push({ href: "/series", label: "新しいシリーズを企画する", sub: "テーマを入れてAIが10本企画", emphasis: true });

  return (
    <>
      <Header title="Note Auto Creator" />
      <main className="space-y-4 p-4">
        {/* 自分のnoteページへ */}
        {noteUrl && (
          <a
            href={noteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-2xl bg-note px-4 py-3 text-white active:bg-note-dark"
          >
            <span className="text-sm font-bold">📝 自分のnoteページを開く</span>
            <span className="text-xs opacity-80">{noteUrl.replace("https://", "")} →</span>
          </a>
        )}

        {/* クイックアクション */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/ideas" className="card block text-center active:bg-gray-50">
            <div className="text-2xl">💡</div>
            <div className="mt-1 text-sm font-bold">テーマ提案</div>
            <div className="text-[10px] text-gray-400">AIがネタを提案</div>
          </Link>
          <Link href="/articles/new" className="card block text-center active:bg-gray-50">
            <div className="text-2xl">✨</div>
            <div className="mt-1 text-sm font-bold">記事を作成</div>
            <div className="text-[10px] text-gray-400">AIが自動生成</div>
          </Link>
          <Link href="/series" className="card block text-center active:bg-gray-50">
            <div className="text-2xl">📚</div>
            <div className="mt-1 text-sm font-bold">シリーズ</div>
            <div className="text-[10px] text-gray-400">テーマ別に10本企画</div>
          </Link>
          <Link href="/schedule" className="card block text-center active:bg-gray-50">
            <div className="text-2xl">📅</div>
            <div className="mt-1 text-sm font-bold">投稿キュー</div>
            <div className="text-[10px] text-gray-400">予定・承認待ち管理</div>
          </Link>
        </div>

        {/* 次にやること（ボタンを押すだけの運用ガイド） */}
        {!loading && nextActions.length > 0 && (
          <section className="card space-y-2">
            <h2 className="text-xs font-bold text-gray-500">👉 次にやること</h2>
            {nextActions.slice(0, 4).map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className={`block rounded-xl px-3 py-2.5 active:opacity-80 ${
                  a.emphasis
                    ? "bg-note text-white"
                    : "border border-gray-200 bg-gray-50 text-gray-700"
                }`}
              >
                <p className="text-sm font-bold">{a.label}</p>
                <p className={`text-[10px] ${a.emphasis ? "text-white/80" : "text-gray-400"}`}>
                  {a.sub} →
                </p>
              </Link>
            ))}
          </section>
        )}

        {/* サマリ */}
        <div className="card">
          <h2 className="mb-2 text-xs font-bold text-gray-500">記事ステータス</h2>
          {loading ? (
            <p className="text-xs text-gray-400">読み込み中...</p>
          ) : (
            <div className="grid grid-cols-4 gap-2 text-center">
              {(["draft", "review", "approved", "posted"] as const).map((s) => (
                <div key={s}>
                  <div className="text-lg font-bold">{countBy(s)}</div>
                  <div className="text-[10px] text-gray-400">{STATUS_LABELS[s]}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 売上サマリ */}
        <Link href="/revenues" className="card block active:bg-gray-50">
          <h2 className="mb-1 text-xs font-bold text-gray-500">売上メモ</h2>
          <div className="flex items-end justify-between">
            <span className="text-xl font-bold">
              ¥{(revenue?.totalAmount ?? 0).toLocaleString()}
            </span>
            <span className="text-xs text-gray-400">{revenue?.totalCount ?? 0} 件の販売 →</span>
          </div>
        </Link>

        {/* 最近の記事 */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold">最近の記事</h2>
            <Link href="/articles" className="text-xs text-note-dark">
              すべて見る →
            </Link>
          </div>
          <div className="space-y-2">
            {loading ? (
              <p className="text-xs text-gray-400">読み込み中...</p>
            ) : recent.length === 0 ? (
              <p className="card text-center text-xs text-gray-400">
                まだ記事がありません。テーマ提案から始めましょう！
              </p>
            ) : (
              recent.map((a) => <ArticleCard key={a.id} article={a} />)
            )}
          </div>
        </section>
      </main>
    </>
  );
}
