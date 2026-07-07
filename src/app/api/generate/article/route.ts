import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { getDefaultUser } from "@/lib/user";

// AIで記事を一括生成し、draft（下書き）として保存する。
// 投稿・承認は行わない（重要ルールR1/R2）。
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const theme: string = body.theme;
    if (!theme) {
      return NextResponse.json({ error: "theme は必須です" }, { status: 400 });
    }
    const articleType: "free" | "paid" = body.articleType === "paid" ? "paid" : "free";

    const user = await getDefaultUser();
    const setting = await prisma.setting.findUnique({ where: { userId: user.id } });

    const ai = await getAIProvider();
    const request = {
      theme,
      articleType,
      tone: body.tone || setting?.tone || undefined,
      profile: setting?.profile,
    };
    const generated = await ai.generateArticle(request);

    const article = await prisma.noteArticle.create({
      data: {
        userId: user.id,
        ideaId: body.ideaId || null,
        title: generated.title,
        articleType,
        status: "draft",
        lead: generated.lead,
        summary: generated.summary,
        cta: generated.cta,
        hashtags: generated.hashtags,
        thumbnailText: generated.thumbnailText,
        sections: {
          create: generated.sections.map((s, i) => ({
            orderIndex: i,
            heading: s.heading,
            content: s.content,
            isPaid: articleType === "paid" ? s.isPaid : false,
          })),
        },
      },
      include: { sections: { orderBy: { orderIndex: "asc" } } },
    });

    if (body.ideaId) {
      await prisma.articleIdea
        .update({ where: { id: body.ideaId }, data: { used: true } })
        .catch(() => {});
    }

    await prisma.aiGenerationLog.create({
      data: {
        userId: user.id,
        articleId: article.id,
        kind: "article",
        provider: ai.name,
        model: ai.model,
        prompt: JSON.stringify(request),
        response: JSON.stringify(generated),
      },
    });

    return NextResponse.json(article, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "記事生成に失敗しました" }, { status: 500 });
  }
}
