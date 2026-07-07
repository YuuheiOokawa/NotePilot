"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/components/Toast";
import Header from "@/components/Header";

interface RevenueLog {
  id: string;
  date: string;
  count: number;
  amount: number;
  memo: string | null;
  article: { id: string; title: string; articleType: string };
}

interface ArticleOption {
  id: string;
  title: string;
}

interface Summary {
  totalAmount: number;
  totalCount: number;
  thisMonthAmount: number;
  lastMonthAmount: number;
  monthly: { month: string; amount: number; count: number }[];
  topArticles: { articleId: string; title: string; articleType: string; amount: number; count: number }[];
}

export default function RevenuesPage() {
  const [logs, setLogs] = useState<RevenueLog[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [articles, setArticles] = useState<ArticleOption[]>([]);

  const [articleId, setArticleId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [count, setCount] = useState("1");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [rev, arts, sum] = await Promise.all([
      fetch("/api/revenues").then((r) => r.json()),
      fetch("/api/articles").then((r) => r.json()),
      fetch("/api/revenues/summary").then((r) => r.json()),
    ]);
    setLogs(rev.logs);
    setTotalAmount(rev.totalAmount);
    setTotalCount(rev.totalCount);
    setSummary(sum);
    setArticles(arts.map((a: { id: string; title: string }) => ({ id: a.id, title: a.title })));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!articleId || !amount) {
      toast("記事と金額を入力してください", "error");
      return;
    }
    setSaving(true);
    try {
      await fetch(`/api/articles/${articleId}/revenues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, count: Number(count), amount: Number(amount), memo }),
      });
      setAmount("");
      setMemo("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("この売上記録を削除しますか？")) return;
    await fetch(`/api/revenues/${id}`, { method: "DELETE" });
    await load();
  };

  return (
    <>
      <Header title="売上メモ" backHref="/" />
      <main className="space-y-4 p-4">
        {/* 合計 */}
        <div className="card text-center">
          <p className="text-xs text-gray-400">累計売上</p>
          <p className="text-3xl font-bold text-note-dark">¥{totalAmount.toLocaleString()}</p>
          <p className="mt-1 text-xs text-gray-400">{totalCount} 件の販売</p>
        </div>

        {/* 売上分析 */}
        {summary && (
          <div className="card space-y-4">
            <h2 className="text-xs font-bold text-gray-500">売上分析</h2>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-lg bg-gray-50 p-2">
                <p className="text-[10px] text-gray-400">今月</p>
                <p className="text-lg font-bold text-note-dark">
                  ¥{summary.thisMonthAmount.toLocaleString()}
                </p>
                {summary.lastMonthAmount > 0 && (
                  <p
                    className={`text-[10px] font-bold ${
                      summary.thisMonthAmount >= summary.lastMonthAmount
                        ? "text-note-dark"
                        : "text-red-500"
                    }`}
                  >
                    先月比 {summary.thisMonthAmount >= summary.lastMonthAmount ? "+" : ""}
                    {Math.round(
                      ((summary.thisMonthAmount - summary.lastMonthAmount) /
                        summary.lastMonthAmount) *
                        100,
                    )}
                    %
                  </p>
                )}
              </div>
              <div className="rounded-lg bg-gray-50 p-2">
                <p className="text-[10px] text-gray-400">先月</p>
                <p className="text-lg font-bold">¥{summary.lastMonthAmount.toLocaleString()}</p>
              </div>
            </div>

            {/* 月別推移（直近6ヶ月） */}
            <div>
              <p className="mb-1 text-[10px] text-gray-400">月別推移（直近6ヶ月）</p>
              <div className="flex h-20 items-end gap-1">
                {summary.monthly.map((m) => {
                  const max = Math.max(...summary.monthly.map((x) => x.amount), 1);
                  return (
                    <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t bg-note"
                        style={{ height: `${Math.max((m.amount / max) * 64, m.amount > 0 ? 4 : 1)}px` }}
                        title={`${m.month}: ¥${m.amount.toLocaleString()}`}
                      />
                      <span className="text-[9px] text-gray-400">{Number(m.month.slice(5))}月</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 記事別ランキング */}
            {summary.topArticles.length > 0 && (
              <div>
                <p className="mb-1 text-[10px] text-gray-400">売れている記事 TOP5</p>
                <div className="space-y-1">
                  {summary.topArticles.map((a, i) => (
                    <div key={a.articleId} className="flex items-center justify-between gap-2 text-xs">
                      <p className="min-w-0 truncate">
                        <span className="mr-1 font-bold text-gray-400">{i + 1}.</span>
                        {a.title}
                      </p>
                      <span className="shrink-0 font-bold">
                        ¥{a.amount.toLocaleString()}
                        <span className="ml-1 font-normal text-gray-400">({a.count}件)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 記録フォーム */}
        <div className="card space-y-3">
          <h2 className="text-xs font-bold text-gray-500">売上を記録</h2>
          <div>
            <label className="label">記事</label>
            <select className="input" value={articleId} onChange={(e) => setArticleId(e.target.value)}>
              <option value="">選択してください</option>
              {articles.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="label">日付</label>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label">件数</label>
              <input className="input" type="number" min={1} value={count} onChange={(e) => setCount(e.target.value)} />
            </div>
            <div>
              <label className="label">金額(円)</label>
              <input className="input" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">メモ（任意）</label>
            <input className="input" value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={add} disabled={saving}>
            {saving ? "記録中..." : "記録する"}
          </button>
        </div>

        {/* 一覧 */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold">記録一覧</h2>
          {logs.length === 0 ? (
            <p className="card text-center text-xs text-gray-400">まだ売上記録がありません</p>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="card flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">{l.article.title}</p>
                  <p className="text-[10px] text-gray-400">
                    {new Date(l.date).toLocaleDateString("ja-JP")} ・ {l.count}件
                    {l.memo && ` ・ ${l.memo}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-bold">¥{l.amount.toLocaleString()}</span>
                  <button className="text-xs text-gray-300 active:text-red-400" onClick={() => remove(l.id)}>
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </>
  );
}
