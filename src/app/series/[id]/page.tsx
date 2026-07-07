"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import { SERIES_ROLE_LABELS, type SeriesRole } from "@/lib/types";
import { READINESS_COLORS, READINESS_LABELS, type ReadinessStatus } from "@/lib/review";

interface Item {
  id: string;
  seriesNumber: number;
  title: string;
  description: string;
  role: SeriesRole;
  suggestedPrice: number | null;
  articleId: string | null;
  article: {
    id: string;
    status: string;
    publishReadinessStatus: ReadinessStatus;
    scheduledAt: string | null;
  } | null;
}

interface Group {
  id: string;
  name: string;
  description: string;
  items: Item[];
}

const ROLE_BADGE: Record<SeriesRole, string> = {
  free: "bg-sky-100 text-sky-700",
  paid: "bg-amber-100 text-amber-700",
  summary: "bg-purple-100 text-purple-700",
  promo: "bg-pink-100 text-pink-700",
};

export default function SeriesDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [group, setGroup] = useState<Group | null>(null);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/theme-groups/${id}`);
    if (res.ok) setGroup(await res.json());
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const generateArticle = async (item: Item) => {
    setGeneratingId(item.id);
    try {
      const res = await fetch("/api/generate/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme: `${item.title}\n${item.description}`,
          articleType: item.role === "paid" ? "paid" : "free",
          seriesItemId: item.id,
        }),
      });
      if (!res.ok) throw new Error();
      await load();
    } catch {
      alert("記事の生成に失敗しました");
    } finally {
      setGeneratingId(null);
    }
  };

  if (!group) {
    return (
      <>
        <Header title="シリーズ詳細" backHref="/series" />
        <p className="py-8 text-center text-xs text-gray-400">読み込み中...</p>
      </>
    );
  }

  const generated = group.items.filter((i) => i.articleId).length;

  return (
    <>
      <Header title={group.name} backHref="/series" />
      <main className="space-y-4 p-4">
        <div className="card">
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-note"
                style={{ width: `${group.items.length ? (generated / group.items.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400">
              {generated}/{group.items.length} 本作成済み
            </span>
          </div>
          <p className="mt-2 text-[10px] text-gray-400">
            無料記事は信頼獲得を、有料記事は具体的な手順・テンプレート・実体験を重視して作成しましょう。
          </p>
        </div>

        <div className="space-y-2">
          {group.items.map((item) => (
            <div key={item.id} className="card space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gray-400">#{item.seriesNumber}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${ROLE_BADGE[item.role]}`}>
                  {SERIES_ROLE_LABELS[item.role]}
                  {item.role === "paid" && item.suggestedPrice ? ` ¥${item.suggestedPrice}` : ""}
                </span>
                {item.article && <StatusBadge status={item.article.status} />}
                {item.article && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${READINESS_COLORS[item.article.publishReadinessStatus]}`}
                  >
                    {READINESS_LABELS[item.article.publishReadinessStatus]}
                  </span>
                )}
              </div>
              <p className="text-sm font-bold">{item.title}</p>
              {item.description && <p className="text-[11px] text-gray-500">{item.description}</p>}
              {item.article ? (
                <Link
                  href={`/articles/${item.article.id}`}
                  className="block rounded-lg border border-note py-2 text-center text-xs font-bold text-note-dark active:bg-note/10"
                >
                  記事を開く →
                </Link>
              ) : (
                <button
                  className="w-full rounded-lg bg-note py-2 text-xs font-bold text-white active:bg-note-dark disabled:opacity-50"
                  onClick={() => generateArticle(item)}
                  disabled={generatingId !== null}
                >
                  {generatingId === item.id ? "AIが執筆中..." : "✨ この記事をAIで生成"}
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          className="w-full py-2 text-xs text-red-300 active:text-red-500"
          onClick={async () => {
            if (!confirm("このシリーズを削除しますか？（作成済みの記事は残ります）")) return;
            await fetch(`/api/theme-groups/${id}`, { method: "DELETE" });
            router.push("/series");
          }}
        >
          このシリーズを削除する
        </button>
      </main>
    </>
  );
}
