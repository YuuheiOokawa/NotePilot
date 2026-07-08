import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultUser } from "@/lib/user";
import { parseMarkdownArticle } from "@/lib/mdImport";
import { runQualityCheck } from "@/lib/quality";

export const maxDuration = 60;

const MAX_FILES = 20;
const MAX_CONTENT_LENGTH = 200_000;

interface ImportFile {
  name?: string;
  content: string;
}

// mdファイルを取り込んで下書き記事を作成する。
// AI生成と同じく draft 止まり(投稿・承認は必ずユーザー操作)。
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const files: ImportFile[] | null = Array.isArray(body?.files)
    ? body.files
    : typeof body?.markdown === "string"
      ? [{ name: body.fileName, content: body.markdown }]
      : null;

  if (!files || files.length === 0) {
    return NextResponse.json({ error: "mdファイルの内容を指定してください" }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `一度に取り込めるのは${MAX_FILES}ファイルまでです` },
      { status: 400 },
    );
  }

  const user = await getDefaultUser();
  const results: {
    name: string;
    id?: string;
    title?: string;
    articleType?: string;
    warnings?: string[];
    error?: string;
  }[] = [];

  for (const file of files) {
    const name = typeof file?.name === "string" ? file.name : "";
    if (typeof file?.content !== "string" || !file.content.trim()) {
      results.push({ name, error: "内容が空のためスキップしました" });
      continue;
    }
    if (file.content.length > MAX_CONTENT_LENGTH) {
      results.push({ name, error: "ファイルが大きすぎるためスキップしました" });
      continue;
    }

    const parsed = parseMarkdownArticle(file.content, name || undefined);
    const isPaid = parsed.articleType === "paid";

    const article = await prisma.noteArticle.create({
      data: {
        userId: user.id,
        title: parsed.title,
        articleType: parsed.articleType,
        isPaid,
        status: "draft",
        lead: parsed.lead,
        summary: parsed.summary,
        cta: parsed.cta,
        hashtags: parsed.hashtags,
        thumbnailText: parsed.thumbnailText,
        price: parsed.price,
        targetReader: parsed.targetReader || null,
        freeScopeNote: parsed.freeScopeNote || null,
        sections: {
          create: parsed.sections.map((s, i) => ({
            orderIndex: i,
            heading: s.heading,
            content: s.content,
            isPaid: isPaid ? s.isPaid : false,
          })),
        },
      },
    });

    // 取り込み後も生成時と同様に品質チェックまで自動実行(失敗しても取り込み自体は成功扱い)
    if (body?.autoCheck !== false) {
      try {
        await runQualityCheck(article.id);
      } catch (e) {
        console.error("import quality check failed:", e);
      }
    }

    results.push({
      name,
      id: article.id,
      title: article.title,
      articleType: article.articleType,
      warnings: parsed.warnings,
    });
  }

  return NextResponse.json({ articles: results }, { status: 201 });
}
