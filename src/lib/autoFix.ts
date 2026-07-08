import { prisma } from "./prisma";
import { getAIProvider } from "./ai";
import { getDefaultUser } from "./user";
import { runQualityCheck } from "./quality";
import type { QualityReview } from "./types";

// チェック結果詳細の指摘(誤字脱字・文法・表現・重複)をAIに修正させる共通処理。
// 方針:
// - 修正対象は文章表現のみ。要確認情報(ファクト)の解消は必ずユーザーが行う
// - セクションの数・順序・有料境界(isPaid)は変更しない
// - ステータスは変更しない(承認フローは従来どおりユーザー操作のみ)
// - 修正後は必ず品質チェックを再実行する

export class AutoFixError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "AutoFixError";
  }
}

export async function runAutoFix(articleId: string) {
  const article = await prisma.noteArticle.findUnique({
    where: { id: articleId },
    include: {
      sections: { orderBy: { orderIndex: "asc" } },
      qualityChecks: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!article) throw new AutoFixError("記事が見つかりません", 404);
  if (article.status !== "draft" && article.status !== "review") {
    throw new AutoFixError("自動修正は下書き・確認待ちの記事でのみ実行できます", 409);
  }

  const latest = article.qualityChecks[0];
  if (!latest) throw new AutoFixError("先に品質チェックを実行してください", 409);

  let review: QualityReview;
  try {
    review = JSON.parse(latest.resultJson) as QualityReview;
  } catch {
    throw new AutoFixError("品質チェック結果を読み取れませんでした。再チェックしてください", 500);
  }

  const issues = {
    typoIssues: review.typoIssues ?? [],
    grammarIssues: review.grammarIssues ?? [],
    expressionIssues: review.expressionIssues ?? [],
    duplicationIssues: review.duplicationIssues ?? [],
  };
  const issueCount =
    issues.typoIssues.length +
    issues.grammarIssues.length +
    issues.expressionIssues.length +
    issues.duplicationIssues.length;
  if (issueCount === 0) {
    throw new AutoFixError("自動修正の対象となる指摘がありません", 409);
  }

  const user = await getDefaultUser();
  const ai = await getAIProvider();
  const request = {
    title: article.title,
    articleType: article.articleType as "free" | "paid",
    lead: article.lead,
    sections: article.sections.map((s) => ({
      heading: s.heading,
      content: s.content,
      isPaid: s.isPaid,
    })),
    summary: article.summary,
    issues,
  };
  const fixed = await ai.fixArticle(request);

  // セクション構成が変わっていたら反映しない(構成・有料境界の保護)
  if (fixed.sections.length !== article.sections.length) {
    throw new AutoFixError("修正結果のセクション構成が元と一致しないため反映を中止しました", 500);
  }

  await prisma.$transaction([
    prisma.noteArticle.update({
      where: { id: article.id },
      data: { lead: fixed.lead, summary: fixed.summary },
    }),
    // isPaid・orderIndexは元の値を維持する(AIの出力は使わない)
    ...article.sections.map((s, i) =>
      prisma.articleSection.update({
        where: { id: s.id },
        data: { heading: fixed.sections[i].heading, content: fixed.sections[i].content },
      }),
    ),
    prisma.aiGenerationLog.create({
      data: {
        userId: user.id,
        articleId: article.id,
        kind: "auto_fix",
        provider: ai.name,
        model: ai.model,
        prompt: JSON.stringify(request),
        response: JSON.stringify(fixed),
      },
    }),
  ]);

  // 修正で新たな問題が入っていないか、必ず再チェックする
  const result = await runQualityCheck(article.id);
  return {
    changeNotes: fixed.changeNotes,
    review: result.review,
    article: result.article,
  };
}
