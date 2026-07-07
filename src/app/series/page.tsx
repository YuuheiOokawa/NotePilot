"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { SERIES_ROLE_LABELS, type SeriesPlanItem, type SeriesRole } from "@/lib/types";

interface Group {
  id: string;
  name: string;
  description: string;
  items: { id: string; role: SeriesRole; articleId: string | null }[];
  _count: { articles: number };
}

const ROLE_BADGE: Record<SeriesRole, string> = {
  free: "bg-sky-100 text-sky-700",
  paid: "bg-amber-100 text-amber-700",
  summary: "bg-purple-100 text-purple-700",
  promo: "bg-pink-100 text-pink-700",
};

export default function SeriesPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [theme, setTheme] = useState("");
  const [plan, setPlan] = useState<SeriesPlanItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/theme-groups")
      .then((r) => r.json())
      .then(setGroups);
  }, []);

  const generate = async () => {
    if (!theme.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/generate/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      if (!res.ok) throw new Error();
      setPlan(await res.json());
    } catch {
      alert("シリーズ計画の生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  };

  const updateItem = (i: number, patch: Partial<SeriesPlanItem>) => {
    setPlan(plan.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/theme-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: theme, items: plan }),
      });
      if (!res.ok) throw new Error();
      const group = await res.json();
      router.push(`/series/${group.id}`);
    } catch {
      alert("保存に失敗しました");
      setSaving(false);
    }
  };

  const freeCount = plan.filter((p) => p.role === "free").length;
  const paidCount = plan.filter((p) => p.role === "paid").length;

  return (
    <>
      <Header title="テーマ別シリーズ" backHref="/" />
      <main className="space-y-4 p-4">
        {/* 新規シリーズ作成 */}
        <div className="card space-y-3">
          <h2 className="text-xs font-bold text-gray-500">新しいシリーズを企画する</h2>
          <input
            className="input"
            placeholder="例: Java Silver学習ロードマップ"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          />
          <button className="btn-primary" onClick={generate} disabled={generating || !theme.trim()}>
            {generating ? "AIが企画中..." : "AIにシリーズ計画（10本前後）を提案してもらう"}
          </button>
          <p className="text-[10px] text-gray-400">
            推奨配分: 無料6〜7本（信頼獲得）/ 有料2〜3本（具体ノウハウ・テンプレート）/ まとめ1本 / 宣伝1本
          </p>
        </div>

        {/* 提案されたプラン（編集可能） */}
        {plan.length > 0 && (
          <div className="card space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-gray-500">提案されたシリーズ計画</h2>
              <span className="text-[10px] text-gray-400">
                無料{freeCount} / 有料{paidCount}
              </span>
            </div>
            {plan.map((item, i) => (
              <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400">#{item.seriesNumber}</span>
                  <select
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${ROLE_BADGE[item.role]}`}
                    value={item.role}
                    onChange={(e) => updateItem(i, { role: e.target.value as SeriesRole })}
                  >
                    {(Object.keys(SERIES_ROLE_LABELS) as SeriesRole[]).map((r) => (
                      <option key={r} value={r}>
                        {SERIES_ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                  {item.role === "paid" && (
                    <input
                      className="w-20 rounded border border-gray-200 px-1.5 py-0.5 text-[10px]"
                      type="number"
                      placeholder="価格"
                      value={item.suggestedPrice ?? ""}
                      onChange={(e) =>
                        updateItem(i, {
                          suggestedPrice: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  )}
                </div>
                <input
                  className="input mb-1 text-xs font-bold"
                  value={item.title}
                  onChange={(e) => updateItem(i, { title: e.target.value })}
                />
                <p className="text-[10px] text-gray-400">{item.description}</p>
              </div>
            ))}
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? "保存中..." : "このシリーズ計画を保存する"}
            </button>
          </div>
        )}

        {/* 既存シリーズ一覧 */}
        <section className="space-y-2">
          <h2 className="text-sm font-bold">シリーズ一覧</h2>
          {groups.length === 0 ? (
            <p className="card text-center text-xs text-gray-400">まだシリーズがありません</p>
          ) : (
            groups.map((g) => {
              const generated = g.items.filter((i) => i.articleId).length;
              return (
                <Link key={g.id} href={`/series/${g.id}`} className="card block active:bg-gray-50">
                  <p className="text-sm font-bold">{g.name}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-note"
                        style={{ width: `${g.items.length ? (generated / g.items.length) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {generated}/{g.items.length} 本作成済み
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </section>
      </main>
    </>
  );
}
