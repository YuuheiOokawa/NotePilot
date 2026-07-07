import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { getDefaultUser } from "@/lib/user";

// SNS宣伝文の「提案」のみを返す。投稿はユーザーが自分で行う（自動投稿はしない）。
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const article = await prisma.noteArticle.findUnique({
      where: { id: body.articleId },
    });
    if (!article) {
      return NextResponse.json({ error: "記事が見つかりません" }, { status: 404 });
    }

    const user = await getDefaultUser();
    const ai = await getAIProvider();
    const request = {
      title: article.title,
      lead: article.lead,
      articleType: article.articleType as "free" | "paid",
      price: article.price,
      hashtags: article.hashtags,
      noteUrl: article.noteUrl,
    };
    const variants = await ai.generateSnsPromo(request);

    await prisma.aiGenerationLog.create({
      data: {
        userId: user.id,
        articleId: article.id,
        kind: "sns_promo",
        provider: ai.name,
        model: ai.model,
        prompt: JSON.stringify(request),
        response: JSON.stringify(variants),
      },
    });

    return NextResponse.json({ variants });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "SNS宣伝文の生成に失敗しました" }, { status: 500 });
  }
}
