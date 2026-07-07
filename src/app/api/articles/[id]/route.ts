import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const article = await prisma.noteArticle.findUnique({
    where: { id: params.id },
    include: {
      sections: { orderBy: { orderIndex: "asc" } },
      approvalRequests: { orderBy: { requestedAt: "desc" } },
      revenueLogs: { orderBy: { date: "desc" } },
      idea: true,
      themeGroup: { select: { id: true, name: true } },
      factClaims: { orderBy: { createdAt: "asc" } },
      qualityChecks: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!article) {
    return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });
  }
  return NextResponse.json(article);
}

// 記事の基本要素・販売設定・セクションを更新する。ステータスはここでは変更しない。
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json();
  const existing = await prisma.noteArticle.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  const fields = [
    "title",
    "lead",
    "summary",
    "cta",
    "hashtags",
    "thumbnailText",
    "salesTitle",
    "freeScopeNote",
    "paidValueNote",
    "targetReader",
    "promoText",
    "noteUrl",
    "reviewNotes",
  ] as const;
  for (const f of fields) {
    if (f in body) data[f] = body[f];
  }
  if ("price" in body) data.price = body.price === null ? null : Number(body.price);
  if ("articleType" in body && (body.articleType === "free" || body.articleType === "paid")) {
    data.articleType = body.articleType;
    data.isPaid = body.articleType === "paid";
  }

  const sections: { heading: string; content: string; isPaid: boolean }[] | undefined =
    body.sections;

  // 本文・タイトル等の内容が変更されたら、品質チェック結果を無効化する
  // （記事作成・修正後は必ず再チェックさせるための設計）
  const contentChanged =
    sections !== undefined ||
    ["title", "lead", "summary", "cta"].some((f) => f in body);
  if (contentChanged) {
    data.typoCheckStatus = "not_checked";
    data.factCheckStatus = "not_checked";
    data.publishReadinessStatus = "not_ready";
    data.qualityScore = null;
  }

  const article = await prisma.$transaction(async (tx) => {
    if (sections) {
      await tx.articleSection.deleteMany({ where: { articleId: params.id } });
      await tx.articleSection.createMany({
        data: sections.map((s, i) => ({
          articleId: params.id,
          orderIndex: i,
          heading: s.heading ?? "",
          content: s.content ?? "",
          isPaid: !!s.isPaid,
        })),
      });
    }
    return tx.noteArticle.update({
      where: { id: params.id },
      data,
      include: { sections: { orderBy: { orderIndex: "asc" } } },
    });
  });

  return NextResponse.json(article);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.noteArticle.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });
  }
}
