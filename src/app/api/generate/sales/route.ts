import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { getDefaultUser } from "@/lib/user";

// 販売設計の「提案」のみを返す。保存はユーザーが編集・確認後にPATCHで行う（重要ルールR2）。
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const article = await prisma.noteArticle.findUnique({
      where: { id: body.articleId },
      include: { sections: { orderBy: { orderIndex: "asc" } } },
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
      sectionHeadings: article.sections.map((s) => s.heading),
    };
    const plan = await ai.generateSalesPlan(request);

    await prisma.aiGenerationLog.create({
      data: {
        userId: user.id,
        articleId: article.id,
        kind: "sales_plan",
        provider: ai.name,
        model: ai.model,
        prompt: JSON.stringify(request),
        response: JSON.stringify(plan),
      },
    });

    return NextResponse.json(plan);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "販売提案の生成に失敗しました" }, { status: 500 });
  }
}
