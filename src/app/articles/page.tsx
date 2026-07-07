"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import ArticleCard, { type ArticleSummary } from "@/components/ArticleCard";
import { STATUSES, STATUS_LABELS } from "@/lib/workflow";

function ArticlesList() {
  const searchParams = useSearchParams();
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [type, setType] = useState(searchParams.get("type") ?? "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    fetch(`/api/articles?${params.toString()}`)
      .then((r) => r.json())
      .then(setArticles)
      .finally(() => setLoading(false));
  }, [status, type]);

  return (
      <main className="space-y-3 p-4">
        <div className="flex gap-2">
          <select className="input flex-1" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">全ステータス</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select className="input flex-1" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">全種別</option>
            <option value="free">無料</option>
            <option value="paid">有料</option>
          </select>
        </div>

        {loading ? (
          <p className="py-8 text-center text-xs text-gray-400">読み込み中...</p>
        ) : articles.length === 0 ? (
          <p className="card text-center text-xs text-gray-400">該当する記事がありません</p>
        ) : (
          <div className="space-y-2">
            {articles.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>
        )}
      </main>
  );
}

export default function ArticlesPage() {
  return (
    <>
      <Header title="記事一覧" backHref="/" />
      <Suspense>
        <ArticlesList />
      </Suspense>
    </>
  );
}
