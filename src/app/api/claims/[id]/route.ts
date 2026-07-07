import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeReadiness } from "@/lib/review";

// 要確認情報のステータス変更（ユーザーが確認済み/未確認/削除済みに変更する）。
// 変更後に記事の hasUnverifiedClaims / publishReadinessStatus を再計算する。
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const status: string = body.status;
  if (!["unverified", "verified", "removed"].includes(status)) {
    return NextResponse.json({ error: "不正なステータスです" }, { status: 400 });
  }

  const claim = await prisma.factClaim.findUnique({ where: { id: params.id } });
  if (!claim) {
    return NextResponse.json({ error: "要確認項目が見つかりません" }, { status: 404 });
  }

  await prisma.factClaim.update({
    where: { id: params.id },
    data: {
      status: status as "unverified" | "verified" | "removed",
      note: body.note ?? claim.note,
    },
  });

  const article = await prisma.noteArticle.findUnique({
    where: { id: claim.articleId },
    include: { factClaims: true },
  });
  if (!article) {
    return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });
  }

  const hasUnverifiedClaims = article.factClaims.some((c) => c.status === "unverified");
  const publishReadinessStatus = computeReadiness({
    checked: article.typoCheckStatus !== "not_checked",
    hasUnverifiedClaims,
    typoCheckStatus: article.typoCheckStatus,
    factCheckStatus: "passed",
  });

  const updated = await prisma.noteArticle.update({
    where: { id: article.id },
    data: {
      hasUnverifiedClaims,
      factCheckStatus: hasUnverifiedClaims ? "issues_found" : "passed",
      publishReadinessStatus,
    },
    include: { factClaims: { orderBy: { createdAt: "asc" } } },
  });

  return NextResponse.json(updated);
}
