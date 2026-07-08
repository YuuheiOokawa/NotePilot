"use client";

import { Suspense, useRef, useState } from "react";
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
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ideaId = searchParams.get("ideaId");

  const importMdFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setImportError("");
    setImporting(true);
    try {
      const files = await Promise.all(
        Array.from(fileList).map(async (f) => ({ name: f.name, content: await f.text() })),
      );
      const res = await fetch("/api/articles/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const imported = (data.articles ?? []).filter((a: { id?: string }) => a.id);
      if (imported.length === 0) throw new Error();
      if (imported.length === 1) {
        router.push(`/articles/${imported[0].id}`);
      } else {
        router.push("/articles");
      }
    } catch {
      setImportError("mdファイルの読み込みに失敗しました。もう一度お試しください。");
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
          {generating ? "AIが執筆＆品質チェック中..." : "✨ AIに記事を生成してもらう（品質チェック込み）"}
        </button>
        <p className="text-center text-[10px] text-gray-400">
          生成〜品質チェックまで自動で行い「下書き」として保存されます。投稿は必ずあなたの承認後です。
        </p>
      </div>

      <div className="card space-y-3">
        <div>
          <label className="label">mdファイルから読み込む</label>
          <p className="text-xs text-gray-500">
            書き溜めたMarkdown記事を取り込んで、タイトル・導入文・本文・タグを自動入力します。複数ファイルの一括取り込みにも対応しています。
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.markdown,.txt"
          multiple
          className="hidden"
          onChange={(e) => importMdFiles(e.target.files)}
        />
        {importError && <p className="text-xs font-bold text-red-500">{importError}</p>}
        <button
          className="w-full rounded-xl border border-note py-3 text-sm font-bold text-note-dark disabled:opacity-50"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          {importing ? "読み込み＆品質チェック中..." : "📄 mdファイルを選択して取り込む"}
        </button>
        <p className="text-center text-[10px] text-gray-400">
          「## タイトル」「## 導入文」「## 本文」形式のほか、一般的なMarkdownも取り込めます。【有料・◯円】表記や「---(ここから有料)---」の行から有料設定も自動判定します。
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
