"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";

function NewArticleForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [theme, setTheme] = useState(searchParams.get("theme") ?? "");
  const [articleType, setArticleType] = useState<"free" | "paid">(
    searchParams.get("type") === "paid" ? "paid" : "free",
  );
  const [tone, setTone] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const ideaId = searchParams.get("ideaId");

  const generate = async () => {
    if (!theme.trim()) {
      setError("テーマを入力してください");
      return;
    }
    setError("");
    setGenerating(true);
    try {
      const res = await fetch("/api/generate/article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, articleType, tone, ideaId }),
      });
      if (!res.ok) throw new Error();
      const article = await res.json();
      router.push(`/articles/${article.id}`);
    } catch {
      setError("生成に失敗しました。もう一度お試しください。");
      setGenerating(false);
    }
  };

  return (
    <main className="space-y-4 p-4">
      <div className="card space-y-3">
        <div>
          <label className="label">記事テーマ *</label>
          <textarea
            className="input min-h-[80px]"
            placeholder="例: 未経験からITエンジニアに転職した体験談"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          />
        </div>

        <div>
          <label className="label">記事種別</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              className={`rounded-xl border py-3 text-sm font-bold ${
                articleType === "free"
                  ? "border-note bg-note/10 text-note-dark"
                  : "border-gray-200 text-gray-400"
              }`}
              onClick={() => setArticleType("free")}
            >
              無料記事
            </button>
            <button
              className={`rounded-xl border py-3 text-sm font-bold ${
                articleType === "paid"
                  ? "border-amber-400 bg-amber-50 text-amber-700"
                  : "border-gray-200 text-gray-400"
              }`}
              onClick={() => setArticleType("paid")}
            >
              有料記事
            </button>
          </div>
          {articleType === "paid" && (
            <p className="mt-1 text-[10px] text-gray-400">
              無料部分と有料部分の切り分けもAIが提案します
            </p>
          )}
        </div>

        <div>
          <label className="label">文体・トーン（任意）</label>
          <input
            className="input"
            placeholder="例: 親しみやすく、ですます調"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
          />
        </div>

        {error && <p className="text-xs font-bold text-red-500">{error}</p>}

        <button className="btn-primary" onClick={generate} disabled={generating}>
          {generating ? "AIが執筆中...（少々お待ちください）" : "AIに記事を生成してもらう"}
        </button>
        <p className="text-center text-[10px] text-gray-400">
          生成後は「下書き」として保存されます。投稿は必ずあなたの承認後です。
        </p>
      </div>
    </main>
  );
}

export default function NewArticlePage() {
  return (
    <>
      <Header title="記事作成" backHref="/" />
      <Suspense>
        <NewArticleForm />
      </Suspense>
    </>
  );
}
