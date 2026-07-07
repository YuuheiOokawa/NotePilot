"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import type { ArticleSummary } from "@/components/ArticleCard";
import { READINESS_COLORS, READINESS_LABELS, type ReadinessStatus } from "@/lib/review";

type ReviewArticle = ArticleSummary & {
  publishReadinessStatus: ReadinessStatus;
  hasUnverifiedClaims: boolean;
};

export default function ReviewPage() {
  const [articles, setArticles] = useState<ReviewArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/articles?status=review")
      .then((r) => r.json())
      .then(setArticles)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, to: "approved" | "draft") => {
    let comment: string | null = null;
    if (to === "approved") {
      if (!confirm("この記事を承認しますか？投稿可能な状態になります。")) return;
    } else {
      comment = prompt("差し戻しコメント（任意）");
      if (comment === null) return;
    }
    const res = await fetch(`/api/articles/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, comment: comment || undefined }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "操作に失敗しました");
    }
    load();
  };

  return (
    <>
      <Header title="承認待ち一覧" backHref="/" />
      <main className="space-y-3 p-4">
        <p className="text-xs text-gray-500">
          あなたが承認しない限り、記事が投稿可能な状態になることはありません。
        </p>
        {loading ? (
          <p className="py-8 text-center text-xs text-gray-400">読み込み中...</p>
        ) : articles.length === 0 ? (
          <p className="card text-center text-xs text-gray-400">確認待ちの記事はありません 🎉</p>
        ) : (
          articles.map((a) => (
            <div key={a.id} className="card space-y-3">
              <Link href={`/articles/${a.id}`} className="block">
                <div className="mb-1 flex items-center gap-1.5">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      a.articleType === "paid"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-sky-100 text-sky-700"
                    }`}
                  >
                    {a.articleType === "paid" ? "有料" : "無料"}
                  </span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${READINESS_COLORS[a.publishReadinessStatus]}`}
                  >
                    {READINESS_LABELS[a.publishReadinessStatus]}
                  </span>
                </div>
                <p className="text-sm font-bold">{a.title}</p>
                <p className="mt-1 text-[10px] text-note-dark">内容を確認する →</p>
              </Link>
              {a.publishReadinessStatus !== "ready" && (
                <p className="text-[10px] text-red-500">
                  ⚠️ 品質チェック未完了または未確認情報あり。記事詳細でチェックを完了させてください。
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white active:bg-green-700 disabled:opacity-40"
                  disabled={a.publishReadinessStatus !== "ready"}
                  onClick={() => act(a.id, "approved")}
                >
                  ✅ 承認
                </button>
                <button
                  className="rounded-xl border border-gray-300 py-2.5 text-sm font-bold text-gray-600 active:bg-gray-100"
                  onClick={() => act(a.id, "draft")}
                >
                  差し戻し
                </button>
              </div>
            </div>
          ))
        )}
      </main>
    </>
  );
}
