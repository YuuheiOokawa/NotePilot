"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import CopyButton from "@/components/CopyButton";
import StatusBadge from "@/components/StatusBadge";

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

function sectionText(sections: Section[]): string {
  return sections.map((s) => `${s.heading}\n\n${s.content}`).join("\n\n\n");
}

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/articles/${id}`);
    if (res.ok) setArticle(await res.json());
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

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
  const tail = `${article.summary}\n\n${article.cta}`;

  const freeBody =
    `${article.lead}\n\n\n${sectionText(freeSections)}` +
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

        {/* 全文一括コピー */}
        <div className="card">
          <CopyButton
            text={fullBody}
            label="📋 本文を全文コピー（無料＋有料）"
            onCopied={recordCopy}
            className="btn-primary"
          />
        </div>
      </main>
    </>
  );
}
