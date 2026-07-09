"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import { toast } from "@/components/Toast";

// 1リクエストあたりの送信ファイル数。品質チェック込みでも
// サーバーのタイムアウト(60秒)に収まるよう小さめに分割する
const IMPORT_CHUNK_SIZE = 5;

const MD_EXTENSIONS = /\.(md|markdown|txt)$/i;

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
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const ideaId = searchParams.get("ideaId");

  // 複数mdの一括取り込み。フォルダ選択（サブフォルダ含む）にも対応し、
  // 件数制限やタイムアウトを避けるため小分けにして順次送信する。
  const importMdFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    // フォルダ選択時はmd以外のファイルも混ざるため拡張子で絞り込み、
    // シリーズ順に取り込まれるようパスでソートする
    const targets = Array.from(fileList)
      .filter((f) => MD_EXTENSIONS.test(f.name))
      .sort((a, b) => {
        const pa = (a as File & { webkitRelativePath?: string }).webkitRelativePath || a.name;
        const pb = (b as File & { webkitRelativePath?: string }).webkitRelativePath || b.name;
        return pa.localeCompare(pb, "ja");
      });

    if (targets.length === 0) {
      setImportError("mdファイルが見つかりませんでした");
      return;
    }

    setImportError("");
    setImporting(true);
    setImportProgress({ done: 0, total: targets.length });

    const succeeded: { id: string }[] = [];
    const failed: string[] = [];
    try {
      const files = await Promise.all(
        targets.map(async (f) => ({ name: f.name, content: await f.text() })),
      );

      for (let i = 0; i < files.length; i += IMPORT_CHUNK_SIZE) {
        const chunk = files.slice(i, i + IMPORT_CHUNK_SIZE);
        try {
          const res = await fetch("/api/articles/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ files: chunk }),
          });
          if (!res.ok) throw new Error();
          const data = await res.json();
          for (const a of data.articles ?? []) {
            if (a.id) succeeded.push(a);
            else failed.push(`${a.name}: ${a.error ?? "取り込み失敗"}`);
          }
        } catch {
          failed.push(...chunk.map((f) => `${f.name}: 通信エラー`));
        }
        setImportProgress({ done: Math.min(i + chunk.length, files.length), total: files.length });
      }

      if (succeeded.length === 0) {
        setImportError("mdファイルの読み込みに失敗しました。もう一度お試しください。");
        return;
      }
      toast(
        failed.length === 0
          ? `${succeeded.length}件の下書きを取り込みました（品質チェック済み）`
          : `${succeeded.length}件取り込み・${failed.length}件失敗（${failed[0]}）`,
        failed.length === 0 ? "success" : "info",
      );
      if (succeeded.length === 1) {
        router.push(`/articles/${succeeded[0].id}`);
      } else {
        router.push("/articles?status=draft");
      }
    } finally {
      setImporting(false);
      setImportProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (folderInputRef.current) folderInputRef.current.value = "";
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
        <input
          ref={folderInputRef}
          type="file"
          multiple
          className="hidden"
          {...({ webkitdirectory: "" } as Record<string, string>)}
          onChange={(e) => importMdFiles(e.target.files)}
        />
        {importError && <p className="text-xs font-bold text-red-500">{importError}</p>}
        {importProgress && (
          <div className="space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-note transition-all"
                style={{ width: `${(importProgress.done / importProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-center text-[10px] text-gray-400">
              取り込み＆品質チェック中... {importProgress.done}/{importProgress.total} ファイル
            </p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            className="rounded-xl border border-note py-3 text-sm font-bold text-note-dark disabled:opacity-50"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            📄 ファイルを選択
          </button>
          <button
            className="rounded-xl bg-note py-3 text-sm font-bold text-white active:bg-note-dark disabled:opacity-50"
            onClick={() => folderInputRef.current?.click()}
            disabled={importing}
          >
            📁 フォルダごと取り込む
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-400">
          「フォルダごと取り込む」はサブフォルダ内のmdもまとめて対象になります（md以外は自動で除外）。
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
