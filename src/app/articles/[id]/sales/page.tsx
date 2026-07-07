"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import type { SalesPlan } from "@/lib/types";

interface SalesFields {
  price: number | null;
  salesTitle: string;
  freeScopeNote: string;
  paidValueNote: string;
  targetReader: string;
  promoText: string;
}

export default function SalesPage() {
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState("");
  const [fields, setFields] = useState<SalesFields | null>(null);
  const [advice, setAdvice] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/articles/${id}`);
    if (!res.ok) return;
    const a = await res.json();
    setTitle(a.title);
    setFields({
      price: a.price,
      salesTitle: a.salesTitle ?? "",
      freeScopeNote: a.freeScopeNote ?? "",
      paidValueNote: a.paidValueNote ?? "",
      targetReader: a.targetReader ?? "",
      promoText: a.promoText ?? "",
    });
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/generate/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: id }),
      });
      if (!res.ok) throw new Error();
      const plan: SalesPlan = await res.json();
      setFields({
        price: plan.price,
        salesTitle: plan.salesTitle,
        freeScopeNote: plan.freeScopeNote,
        paidValueNote: plan.paidValueNote,
        targetReader: plan.targetReader,
        promoText: plan.promoText,
      });
      setAdvice(plan.structureAdvice);
    } catch {
      alert("提案の生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    if (!fields) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error();
      setMessage("保存しました（価格の適用はあなたの承認・投稿操作後です）");
    } catch {
      setMessage("保存に失敗しました");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  if (!fields) {
    return (
      <>
        <Header title="有料記事設定" backHref={`/articles/${id}`} />
        <p className="py-8 text-center text-xs text-gray-400">読み込み中...</p>
      </>
    );
  }

  return (
    <>
      <Header title="有料記事設定" backHref={`/articles/${id}`} />
      <main className="space-y-4 p-4">
        <p className="text-xs text-gray-500">「{title}」の販売設計</p>

        <button className="btn-secondary" onClick={generate} disabled={generating}>
          {generating ? "AIが分析中..." : "🤖 AIに販売設計を提案してもらう"}
        </button>

        {advice && (
          <div className="rounded-2xl border border-note/30 bg-note/5 p-4">
            <p className="mb-1 text-xs font-bold text-note-dark">💡 構成アドバイス</p>
            <p className="whitespace-pre-wrap text-xs text-gray-600">{advice}</p>
          </div>
        )}

        <div className="card space-y-3">
          <div>
            <label className="label">価格（円）</label>
            <input
              className="input"
              type="number"
              min={100}
              step={100}
              value={fields.price ?? ""}
              onChange={(e) =>
                setFields({ ...fields, price: e.target.value ? Number(e.target.value) : null })
              }
            />
            <p className="mt-1 text-[10px] text-gray-400">noteの有料記事は100円から設定できます</p>
          </div>
          <div>
            <label className="label">販売タイトル</label>
            <textarea
              className="input"
              value={fields.salesTitle}
              onChange={(e) => setFields({ ...fields, salesTitle: e.target.value })}
            />
          </div>
          <div>
            <label className="label">無料公開範囲の方針</label>
            <textarea
              className="input min-h-[80px]"
              value={fields.freeScopeNote}
              onChange={(e) => setFields({ ...fields, freeScopeNote: e.target.value })}
            />
          </div>
          <div>
            <label className="label">有料部分の価値訴求</label>
            <textarea
              className="input min-h-[80px]"
              value={fields.paidValueNote}
              onChange={(e) => setFields({ ...fields, paidValueNote: e.target.value })}
            />
          </div>
          <div>
            <label className="label">読者ターゲット</label>
            <textarea
              className="input"
              value={fields.targetReader}
              onChange={(e) => setFields({ ...fields, targetReader: e.target.value })}
            />
          </div>
          <div>
            <label className="label">宣伝文（SNS用）</label>
            <textarea
              className="input min-h-[100px]"
              value={fields.promoText}
              onChange={(e) => setFields({ ...fields, promoText: e.target.value })}
            />
          </div>

          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "保存中..." : "販売設定を保存"}
          </button>
          {message && <p className="text-center text-xs font-bold text-note-dark">{message}</p>}
          <p className="text-center text-[10px] text-gray-400">
            価格設定はアプリ内のメモです。実際の価格はnote投稿時にあなたが設定します。
          </p>
        </div>
      </main>
    </>
  );
}
