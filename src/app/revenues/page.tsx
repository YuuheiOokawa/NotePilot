"use client";

import { useCallback, useEffect, useState } from "react";
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

export default function RevenuesPage() {
  const [logs, setLogs] = useState<RevenueLog[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [articles, setArticles] = useState<ArticleOption[]>([]);

  const [articleId, setArticleId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [count, setCount] = useState("1");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [rev, arts] = await Promise.all([
      fetch("/api/revenues").then((r) => r.json()),
      fetch("/api/articles").then((r) => r.json()),
    ]);
    setLogs(rev.logs);
    setTotalAmount(rev.totalAmount);
    setTotalCount(rev.totalCount);
    setArticles(arts.map((a: { id: string; title: string }) => ({ id: a.id, title: a.title })));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!articleId || !amount) {
      alert("記事と金額を入力してください");
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
