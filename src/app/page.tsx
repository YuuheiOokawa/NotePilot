"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import ArticleCard, { type ArticleSummary } from "@/components/ArticleCard";
import { STATUS_LABELS } from "@/lib/workflow";

export default function HomePage() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [revenue, setRevenue] = useState<{ totalAmount: number; totalCount: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/articles").then((r) => r.json()),
      fetch("/api/revenues").then((r) => r.json()),
    ])
      .then(([a, r]) => {
        setArticles(a);
        setRevenue(r);
      })
      .finally(() => setLoading(false));
  }, []);

  const countBy = (status: string) => articles.filter((a) => a.status === status).length;
  const reviewCount = countBy("review");
  const recent = articles.filter((a) => a.status !== "archived").slice(0, 5);

  return (
    <>
      <Header title="Note Auto Creator" />
      <main className="space-y-4 p-4">
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
        </div>

        {/* 承認待ちアラート */}
        {reviewCount > 0 && (
          <Link
            href="/review"
            className="block rounded-2xl border border-orange-200 bg-orange-50 p-4 active:bg-orange-100"
          >
            <p className="text-sm font-bold text-orange-700">
              ⏳ 確認待ちの記事が {reviewCount} 件あります
            </p>
            <p className="mt-0.5 text-xs text-orange-500">内容を確認して承認しましょう →</p>
          </Link>
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
