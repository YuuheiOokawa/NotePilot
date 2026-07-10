"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import CopyButton from "@/components/CopyButton";
import StatusBadge from "@/components/StatusBadge";
import { toast } from "@/components/Toast";
import { convertMarkdownTablesForNote } from "@/lib/noteFormat";

interface Section {
  heading: string;
  content: string;
  isPaid: boolean;
}

interface Article {
  id: string;
  title: string;
  articleType: "free" | "paid";
  status: string;
  lead: string;
  summary: string;
  cta: string;
  hashtags: string;
  promoText: string | null;
  price: number | null;
  sections: Section[];
}

// noteはMarkdownのテーブル記法(| a | b |)をサポートしないため、コピー用テキストを
// 組み立てる際に箇条書き形式へ変換する(DB上の元原稿・編集画面の表示は変更しない)。
function sectionText(sections: Section[]): string {
  return sections
    .map((s) => `${s.heading}\n\n${convertMarkdownTablesForNote(s.content)}`)
    .join("\n\n\n");
}

interface SnsVariant {
  label: string;
  text: string;
}

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [noteUrl, setNoteUrl] = useState("");
  const [snsVariants, setSnsVariants] = useState<SnsVariant[]>([]);
  const [generatingSns, setGeneratingSns] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/articles/${id}`);
    if (res.ok) setArticle(await res.json());
  }, [id]);

  useEffect(() => {
    load();
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s) => setNoteUrl(s?.noteAccountUrl ?? ""));
  }, [load]);

  const generateSns = async () => {
    setGeneratingSns(true);
    try {
      const res = await fetch("/api/generate/sns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error ?? "SNS宣伝文の生成に失敗しました", "error");
        return;
      }
      setSnsVariants(data.variants);
    } finally {
      setGeneratingSns(false);
    }
  };

  // コピー実行時、approved なら copied に自動記録する（F-06-3）
  const recordCopy = async () => {
    if (article?.status !== "approved") return;
    await fetch(`/api/articles/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: "copied" }),
    });
    await load();
  };

  if (!article) {
    return (
      <>
        <Header title="コピー用プレビュー" backHref={`/articles/${id}`} />
        <p className="py-8 text-center text-xs text-gray-400">読み込み中...</p>
      </>
    );
  }

  const freeSections = article.sections.filter((s) => !s.isPaid);
  const paidSections = article.sections.filter((s) => s.isPaid);
  const tail = `${convertMarkdownTablesForNote(article.summary)}\n\n${article.cta}`;

  const freeBody =
    `${convertMarkdownTablesForNote(article.lead)}\n\n\n${sectionText(freeSections)}` +
    (paidSections.length === 0 ? `\n\n\n${tail}` : "");
  const paidBody = paidSections.length > 0 ? `${sectionText(paidSections)}\n\n\n${tail}` : "";
  const fullBody = paidSections.length > 0 ? `${freeBody}\n\n\n${paidBody}` : freeBody;

  return (
    <>
      <Header title="コピー用プレビュー" backHref={`/articles/${id}`} />
      <main className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <StatusBadge status={article.status} />
          <p className="text-[10px] text-gray-400">
            コピーしてnoteの編集画面に貼り付けてください
          </p>
        </div>

        {!["approved", "copied", "posted"].includes(article.status) && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3 text-xs text-orange-700">
            ⚠️ この記事はまだ承認されていません。承認後のコピーを推奨します。
          </div>
        )}

        {/* タイトル */}
        <div className="card space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-500">タイトル</h2>
            <CopyButton text={article.title} label="コピー" onCopied={recordCopy} />
          </div>
          <p className="text-sm font-bold">{article.title}</p>
        </div>

        {/* 本文（無料部分） */}
        <div className="card space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-500">
              {article.articleType === "paid" ? "本文（無料公開部分）" : "本文"}
            </h2>
            <CopyButton text={freeBody} label="コピー" onCopied={recordCopy} />
          </div>
          <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-gray-700">
            {freeBody}
          </pre>
        </div>

        {/* 有料境界と有料部分 */}
        {paidSections.length > 0 && (
          <>
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-amber-300" />
              <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold text-amber-700">
                🔒 ここから有料{article.price ? `（¥${article.price}）` : ""}
              </span>
              <div className="h-px flex-1 bg-amber-300" />
            </div>
            <div className="card space-y-2 border border-amber-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-amber-700">本文（有料部分）</h2>
                <CopyButton text={paidBody} label="コピー" onCopied={recordCopy} />
              </div>
              <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-gray-700">
                {paidBody}
              </pre>
            </div>
          </>
        )}

        {/* ハッシュタグ */}
        <div className="card space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-500">ハッシュタグ</h2>
            <CopyButton text={article.hashtags} label="コピー" onCopied={recordCopy} />
          </div>
          <p className="text-xs text-note-dark">{article.hashtags}</p>
        </div>

        {/* 宣伝文 */}
        {article.promoText && (
          <div className="card space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-gray-500">宣伝文（SNS用）</h2>
              <CopyButton text={article.promoText} label="コピー" />
            </div>
            <pre className="whitespace-pre-wrap break-words font-sans text-xs text-gray-700">
              {article.promoText}
            </pre>
          </div>
        )}

        {/* SNS宣伝文の生成 */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-500">SNS宣伝文をAIで生成</h2>
            <button
              className="rounded-lg border border-note px-3 py-1.5 text-xs font-bold text-note-dark active:bg-note/10"
              onClick={generateSns}
              disabled={generatingSns}
            >
              {generatingSns ? "生成中..." : snsVariants.length > 0 ? "⚡ 再生成" : "⚡ 3パターン生成"}
            </button>
          </div>
          {snsVariants.length === 0 ? (
            <p className="text-[10px] text-gray-400">
              共感型・問いかけ型など切り口の違う宣伝文を3パターン提案します（投稿は手動です）
            </p>
          ) : (
            snsVariants.map((v) => (
              <div key={v.label} className="space-y-1 rounded-lg bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-note/10 px-2 py-0.5 text-[10px] font-bold text-note-dark">
                    {v.label}
                  </span>
                  <CopyButton text={v.text} label="コピー" />
                </div>
                <pre className="whitespace-pre-wrap break-words font-sans text-xs text-gray-700">
                  {v.text}
                </pre>
              </div>
            ))
          )}
        </div>

        {/* 全文一括コピー */}
        <div className="card space-y-2">
          <CopyButton
            text={fullBody}
            label="📋 本文を全文コピー（無料＋有料）"
            onCopied={recordCopy}
            className="btn-primary"
          />
          {noteUrl && (
            <a
              href={noteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary block"
            >
              📝 noteを開いて貼り付ける →
            </a>
          )}
        </div>
      </main>
    </>
  );
}
