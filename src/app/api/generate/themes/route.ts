import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { getDefaultUser } from "@/lib/user";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const category: string = body.category || "売れやすいテーマ";

    const user = await getDefaultUser();
    const setting = await prisma.setting.findUnique({ where: { userId: user.id } });

    const ai = await getAIProvider();
    const request = {
      category,
      profile: setting?.profile,
      genres: setting?.genres,
    };
    const themes = await ai.generateThemes(request);

    await prisma.aiGenerationLog.create({
      data: {
        userId: user.id,
        kind: "themes",
        provider: ai.name,
        model: ai.model,
        prompt: JSON.stringify(request),
        response: JSON.stringify(themes),
      },
    });

    return NextResponse.json(themes);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "テーマ生成に失敗しました" }, { status: 500 });
  }
}
