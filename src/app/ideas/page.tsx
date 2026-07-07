"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import { THEME_CATEGORIES, type ThemeSuggestion } from "@/lib/types";

interface Idea {
  id: string;
  title: string;
  description: string;
  category: string;
  suggestedType: "free" | "paid";
  used: boolean;
}

export default function IdeasPage() {
  const router = useRouter();
  const [category, setCategory] = useState<string>(THEME_CATEGORIES[0]);
  const [suggestions, setSuggestions] = useState<ThemeSuggestion[]>([]);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [generating, setGenerating] = useState(false);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);

  const loadIdeas = () =>
    fetch("/api/ideas")
      .then((r) => r.json())
      .then(setIdeas);

  useEffect(() => {
    loadIdeas();
  }, []);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/generate/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      setSuggestions(await res.json());
    } finally {
      setGenerating(false);
    }
  };

  const saveIdea = async (s: ThemeSuggestion, index: number) => {
    setSavingIndex(index);
    try {
      await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: s.title,
          description: s.description,
          category,
          suggestedType: s.suggestedType,
        }),
      });
      await loadIdeas();
    } finally {
      setSavingIndex(null);
    }
  };

  const deleteIdea = async (id: string) => {
    await fetch(`/api/ideas/${id}`, { method: "DELETE" });
    await loadIdeas();
  };

  const createArticle = (idea: Idea) => {
    const params = new URLSearchParams({
      theme: idea.title,
      type: idea.suggestedType,
      ideaId: idea.id,
    });
    router.push(`/articles/new?${params.toString()}`);
  };

  return (
    <>
      <Header title="テーマ提案" backHref="/" />
      <main className="space-y-4 p-4">
        <div className="card space-y-3">
          <div>
            <label className="label">提案カテゴリ</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {THEME_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-primary" onClick={generate} disabled={generating}>
            {generating ? "AIが考え中..." : "AIにテーマを提案してもらう"}
          </button>
        </div>

        {suggestions.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-bold">提案されたテーマ</h2>
            {suggestions.map((s, i) => (
              <div key={i} className="card space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold">{s.title}</p>
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      s.suggestedType === "paid"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-sky-100 text-sky-700"
                    }`}
                  >
                    {s.suggestedType === "paid" ? "有料向き" : "無料向き"}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{s.description}</p>
                <p className="text-[10px] text-gray-400">💡 {s.reason}</p>
                <button
                  className="btn-secondary py-2 text-xs"
                  onClick={() => saveIdea(s, i)}
                  disabled={savingIndex === i}
                >
                  {savingIndex === i ? "保存中..." : "このテーマを保存"}
                </button>
              </div>
            ))}
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-bold">保存済みテーマ</h2>
          {ideas.length === 0 ? (
            <p className="card text-center text-xs text-gray-400">保存済みテーマはありません</p>
          ) : (
            ideas.map((idea) => (
              <div key={idea.id} className="card space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-sm font-bold ${idea.used ? "text-gray-400" : ""}`}>
                    {idea.title}
                  </p>
                  {idea.used && (
                    <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                      記事化済み
                    </span>
                  )}
                </div>
                {idea.description && <p className="text-xs text-gray-500">{idea.description}</p>}
                <div className="flex gap-2">
                  <button
                    className="flex-1 rounded-lg bg-note py-2 text-xs font-bold text-white active:bg-note-dark"
                    onClick={() => createArticle(idea)}
                  >
                    このテーマで記事作成
                  </button>
                  <button
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-400 active:bg-gray-50"
                    onClick={() => deleteIdea(idea.id)}
                  >
                    削除
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
