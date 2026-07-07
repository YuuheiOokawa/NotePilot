import { NextResponse } from "next/server";
import { getAIProvider } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import { getDefaultUser } from "@/lib/user";

// テーマからシリーズ計画（10本前後・無料/有料/まとめ/宣伝の配分付き）を提案する。
// ここでは提案のみで保存しない。保存はユーザー確認後に /api/theme-groups で行う。
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const theme: string = body.theme;
    if (!theme) {
      return NextResponse.json({ error: "theme は必須です" }, { status: 400 });
    }

    const user = await getDefaultUser();
    const setting = await prisma.setting.findUnique({ where: { userId: user.id } });

    const ai = await getAIProvider();
    const request = { theme, count: body.count, profile: setting?.profile };
    const plan = await ai.generateSeriesPlan(request);

    await prisma.aiGenerationLog.create({
      data: {
        userId: user.id,
        kind: "series_plan",
        provider: ai.name,
        model: ai.model,
        prompt: JSON.stringify(request),
        response: JSON.stringify(plan),
      },
    });

    return NextResponse.json(plan);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "シリーズ計画の生成に失敗しました" }, { status: 500 });
  }
}
