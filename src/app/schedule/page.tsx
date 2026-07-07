"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import { toast } from "@/components/Toast";
import { READINESS_COLORS, READINESS_LABELS, type ReadinessStatus } from "@/lib/review";

interface QueueArticle {
  id: string;
  title: string;
  articleType: "free" | "paid";
  status: string;
  scheduledAt: string | null;
  postFrequencyGroup: string | null;
  publishReadinessStatus: ReadinessStatus;
  postedAt: string | null;
}

interface ScheduleData {
  queue: QueueArticle[];
  waitingApproval: QueueArticle[];
  approvedUnscheduled: QueueArticle[];
  posted: QueueArticle[];
  hourUsage: Record<string, number>;
  maxPerHour: number;
}

function fmt(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Row({ a }: { a: QueueArticle }) {
  return (
    <Link href={`/articles/${a.id}`} className="card block active:bg-gray-50">
      <div className="mb-1 flex items-center gap-1.5">
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
            a.articleType === "paid" ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"
          }`}
        >
          {a.articleType === "paid" ? "有料" : "無料"}
        </span>
        <StatusBadge status={a.status} />
        <span
          className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${READINESS_COLORS[a.publishReadinessStatus]}`}
        >
          {READINESS_LABELS[a.publishReadinessStatus]}
        </span>
      </div>
      <p className="line-clamp-1 text-sm font-bold">{a.title}</p>
      {a.scheduledAt && (
        <p className="mt-0.5 text-[10px] text-note-dark">📅 投稿予定: {fmt(a.scheduledAt)}</p>
      )}
      {a.postedAt && <p className="mt-0.5 text-[10px] text-gray-400">投稿日: {fmt(a.postedAt)}</p>}
    </Link>
  );
}

export default function SchedulePage() {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [assigning, setAssigning] = useState(false);

  const load = useCallback(() => {
    fetch("/api/schedule")
      .then((r) => r.json())
      .then(setData);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 承認済み・予定未設定の記事に、空き時間帯を自動割当（ボタン1つ）
  const autoAssign = async () => {
    setAssigning(true);
    try {
      const res = await fetch("/api/schedule/auto-assign", { method: "POST" });
      if (!res.ok) throw new Error();
      const result = await res.json();
      toast(
        result.assigned > 0
          ? `${result.assigned}件の記事に投稿予定を自動割当しました`
          : "割当対象の記事がありません（承認済み・予定未設定の記事が対象）",
        result.assigned > 0 ? "success" : "info",
      );
      load();
    } catch {
      toast("自動割当に失敗しました", "error");
    } finally {
      setAssigning(false);
    }
  };

  if (!data) {
    return (
      <>
        <Header title="投稿キュー" backHref="/" />
        <p className="py-8 text-center text-xs text-gray-400">読み込み中...</p>
      </>
    );
  }

  const hours = Object.entries(data.hourUsage).sort(([a], [b]) => a.localeCompare(b));

  return (
    <>
      <Header title="投稿キュー" backHref="/" />
      <main className="space-y-4 p-4">
        <p className="text-[10px] text-gray-400">
          投稿頻度の目安は1時間に最大{data.maxPerHour}件です。予定は管理用であり、実際の投稿はあなたが承認後に手動で行います。
        </p>

        {/* 自動割当（ボタン1つで投稿予定を組む） */}
        {data.approvedUnscheduled.length > 0 && (
          <button className="btn-primary" onClick={autoAssign} disabled={assigning}>
            {assigning
              ? "割当中..."
              : `⚡ 承認済み${data.approvedUnscheduled.length}件に投稿予定を自動割当`}
          </button>
        )}

        {/* 時間帯の使用状況 */}
        {hours.length > 0 && (
          <div className="card">
            <h2 className="mb-2 text-xs font-bold text-gray-500">時間帯ごとの予定数</h2>
            <div className="space-y-1.5">
              {hours.map(([hour, count]) => (
                <div key={hour} className="flex items-center gap-2">
                  <span className="w-28 text-[10px] text-gray-500">
                    {hour.replace("T", " ")}時台
                  </span>
                  <div className="flex gap-1">
                    {Array.from({ length: data.maxPerHour }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-2.5 w-6 rounded ${i < count ? "bg-note" : "bg-gray-100"}`}
                      />
                    ))}
                  </div>
                  <span className={`text-[10px] font-bold ${count >= data.maxPerHour ? "text-red-500" : "text-gray-400"}`}>
                    {count}/{data.maxPerHour}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 投稿キュー */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold">📅 投稿予定（キュー）</h2>
          {data.queue.length === 0 ? (
            <p className="card text-center text-xs text-gray-400">
              投稿予定はありません。記事詳細から予定日時を設定できます。
            </p>
          ) : (
            data.queue.map((a) => <Row key={a.id} a={a} />)
          )}
        </section>

        {/* 承認待ち */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold">⏳ 承認待ち</h2>
            <Link href="/review" className="text-xs text-note-dark">
              承認画面へ →
            </Link>
          </div>
          {data.waitingApproval.length === 0 ? (
            <p className="card text-center text-xs text-gray-400">承認待ちはありません</p>
          ) : (
            data.waitingApproval.map((a) => <Row key={a.id} a={a} />)
          )}
        </section>

        {/* 承認済み・予定未設定 */}
        {data.approvedUnscheduled.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-bold">✅ 承認済み（予定未設定）</h2>
            {data.approvedUnscheduled.map((a) => (
              <Row key={a.id} a={a} />
            ))}
          </section>
        )}

        {/* 投稿済み */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold">🎉 投稿済み</h2>
          {data.posted.length === 0 ? (
            <p className="card text-center text-xs text-gray-400">投稿済みの記事はまだありません</p>
          ) : (
            data.posted.map((a) => <Row key={a.id} a={a} />)
          )}
        </section>
      </main>
    </>
  );
}
