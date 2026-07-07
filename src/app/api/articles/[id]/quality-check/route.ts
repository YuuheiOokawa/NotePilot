import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { getDefaultUser } from "@/lib/user";
import { computeReadiness } from "@/lib/review";

// 品質チェック＋ファクトチェックを実行する。
// - 検出された要確認情報は FactClaim として保存（既に「確認済み」のものは維持）
// - 未確認情報が残っている限り publishReadinessStatus は ready にならない（重要ルール）
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const article = await prisma.noteArticle.findUnique({
      where: { id: params.id },
      include: {
        sections: { orderBy: { orderIndex: "asc" } },
        factClaims: true,
      },
    });
    if (!article) {
      return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });
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

    // 確認済み(verified)のクレームは維持し、未確認(unverified)のものは今回の結果で置き換える
    const verifiedTexts = new Set(
      article.factClaims.filter((c) => c.status === "verified").map((c) => c.text),
    );
    const newClaims = review.claims.filter((c) => !verifiedTexts.has(c.text));

    const typoCheckStatus =
      review.typoIssues.length + review.grammarIssues.length + review.expressionIssues.length > 0
        ? "issues_found"
        : "passed";
    const hasUnverifiedClaims = newClaims.length > 0;
    const factCheckStatus = hasUnverifiedClaims ? "issues_found" : "passed";
    const publishReadinessStatus = computeReadiness({
      checked: true,
      hasUnverifiedClaims,
      typoCheckStatus,
      factCheckStatus: "passed", // 要確認はhasUnverifiedClaimsで判定するため、ここでは重複減点しない
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

    return NextResponse.json({ review, article: updated, claims, checkId: check.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "品質チェックに失敗しました" }, { status: 500 });
  }
}
