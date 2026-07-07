import { prisma } from "./prisma";
import { getAIProvider } from "./ai";
import { getDefaultUser } from "./user";
import { computeReadiness } from "./review";

// 品質チェック＋ファクトチェックを実行して結果をDBに反映する共通処理。
// - 検出された要確認情報は FactClaim として保存（「確認済み」のものは維持）
// - 未確認情報が残っている限り publishReadinessStatus は ready にならない
export async function runQualityCheck(articleId: string) {
  const article = await prisma.noteArticle.findUnique({
    where: { id: articleId },
    include: {
      sections: { orderBy: { orderIndex: "asc" } },
      factClaims: true,
    },
  });
  if (!article) throw new Error("記事が見つかりません");

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
  };
  const review = await ai.reviewArticle(request);

  await prisma.aiGenerationLog.create({
    data: {
      userId: user.id,
      articleId: article.id,
      kind: "quality_check",
      provider: ai.name,
      model: ai.model,
      prompt: JSON.stringify(request),
      response: JSON.stringify(review),
    },
  });

  // 確認済み(verified)のクレームは維持し、未確認(unverified)は今回の結果で置き換える
  const verifiedTexts = new Set(
    article.factClaims.filter((c) => c.status === "verified").map((c) => c.text),
  );
  const newClaims = review.claims.filter((c) => !verifiedTexts.has(c.text));

  const typoCheckStatus =
    review.typoIssues.length + review.grammarIssues.length + review.expressionIssues.length > 0
      ? ("issues_found" as const)
      : ("passed" as const);
  const hasUnverifiedClaims = newClaims.length > 0;
  const factCheckStatus = hasUnverifiedClaims ? ("issues_found" as const) : ("passed" as const);
  const publishReadinessStatus = computeReadiness({
    checked: true,
    hasUnverifiedClaims,
    typoCheckStatus,
    factCheckStatus: "passed", // 要確認はhasUnverifiedClaimsで判定するため重複減点しない
  });

  const [, , updated, check] = await prisma.$transaction([
    prisma.factClaim.deleteMany({
      where: { articleId: article.id, status: "unverified" },
    }),
    prisma.factClaim.createMany({
      data: newClaims.map((c) => ({
        articleId: article.id,
        text: c.text,
        category: c.category,
        reason: c.reason,
        status: "unverified" as const,
      })),
    }),
    prisma.noteArticle.update({
      where: { id: article.id },
      data: {
        qualityScore: review.score,
        typoCheckStatus,
        factCheckStatus,
        hasUnverifiedClaims,
        publishReadinessStatus,
      },
    }),
    prisma.qualityCheck.create({
      data: {
        articleId: article.id,
        score: review.score,
        resultJson: JSON.stringify(review),
      },
    }),
  ]);

  const claims = await prisma.factClaim.findMany({
    where: { articleId: article.id },
    orderBy: { createdAt: "asc" },
  });

  return { review, article: updated, claims, checkId: check.id };
}
