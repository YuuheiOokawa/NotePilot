import { prisma } from "./prisma";
import { getAIProvider } from "./ai";
import { getDefaultUser } from "./user";
import { runQualityCheck } from "./quality";

export interface GenerateArticleOptions {
  theme: string;
  articleType: "free" | "paid";
  tone?: string;
  ideaId?: string | null;
  seriesItemId?: string | null;
  // 生成後に品質チェックまで自動実行する（既定: true）。
  // ユーザーの操作を「生成ボタン1回」で済ませるための商用フロー。
  autoCheck?: boolean;
}

// AIで記事を生成しdraftとして保存する共通処理。
// 投稿・承認は行わない（承認は必ずユーザーのボタン操作）。
export async function generateAndSaveArticle(opts: GenerateArticleOptions) {
  const user = await getDefaultUser();
  const setting = await prisma.setting.findUnique({ where: { userId: user.id } });

  const ai = await getAIProvider();
  const request = {
    theme: opts.theme,
    articleType: opts.articleType,
    tone: opts.tone || setting?.tone || undefined,
    profile: setting?.profile,
  };
  const generated = await ai.generateArticle(request);

  // シリーズ項目からの生成の場合、シリーズ情報を記事に紐付ける
  let seriesData: {
    themeGroupId?: string;
    seriesNumber?: number;
    seriesRole?: "free" | "paid" | "summary" | "promo";
  } = {};
  let seriesItem = null;
  if (opts.seriesItemId) {
    seriesItem = await prisma.seriesItem.findUnique({ where: { id: opts.seriesItemId } });
    if (seriesItem) {
      seriesData = {
        themeGroupId: seriesItem.themeGroupId,
        seriesNumber: seriesItem.seriesNumber,
        seriesRole: seriesItem.role,
      };
    }
  }

  const article = await prisma.noteArticle.create({
    data: {
      userId: user.id,
      ideaId: opts.ideaId || null,
      title: generated.title,
      articleType: opts.articleType,
      isPaid: opts.articleType === "paid",
      status: "draft",
      lead: generated.lead,
      summary: generated.summary,
      cta: generated.cta,
      hashtags: generated.hashtags,
      thumbnailText: generated.thumbnailText,
      price: seriesItem?.suggestedPrice ?? null,
      ...seriesData,
      sections: {
        create: generated.sections.map((s, i) => ({
          orderIndex: i,
          heading: s.heading,
          content: s.content,
          isPaid: opts.articleType === "paid" ? s.isPaid : false,
        })),
      },
    },
    include: { sections: { orderBy: { orderIndex: "asc" } } },
  });

  if (seriesItem) {
    await prisma.seriesItem.update({
      where: { id: seriesItem.id },
      data: { articleId: article.id },
    });
  }

  if (opts.ideaId) {
    await prisma.articleIdea
      .update({ where: { id: opts.ideaId }, data: { used: true } })
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

  // 生成後すぐ品質チェック（1タップで「下書き＋チェック済み」まで進む）
  if (opts.autoCheck !== false) {
    try {
      const result = await runQualityCheck(article.id);
      return { ...article, ...result.article, sections: article.sections };
    } catch (e) {
      // チェック失敗でも記事生成自体は成功として返す（後から手動チェック可能）
      console.error("auto quality check failed:", e);
    }
  }

  return article;
}
