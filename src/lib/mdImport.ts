import type { GeneratedSection } from "./types";

// Markdown記事の取り込みパーサー。
// 2つの形式に対応する:
// 1. 構造化形式: 「## タイトル」「## 導入文」「## 本文(### や #### で小見出し)」「## まとめ」等の
//    メタ見出しで構成されたmd(note記事の下書きテンプレート形式)。
//    本文配下の### (小見出し)・#### (有料テンプレ集の個々のプロンプト「T-01|タイトル」等)は
//    それぞれ独立したセクションとして取り込む。
// 2. 汎用形式: 「# タイトル」+「## 見出し」の一般的なmd
// 有料境界は「---(ここから有料)---」のようなマーカー行、または見出しの【有料・◯円】表記から判定する。

export interface ParsedMdArticle {
  title: string;
  articleType: "free" | "paid";
  price: number | null;
  lead: string;
  sections: GeneratedSection[];
  summary: string;
  cta: string;
  hashtags: string;
  thumbnailText: string;
  targetReader: string;
  freeScopeNote: string;
  warnings: string[];
}

interface RawBlock {
  level: number; // 0=先頭の見出しなし部分
  heading: string;
  lines: string[];
  isPaid: boolean; // 「ここから有料」マーカー以降に始まったブロック
}

type MetaKey =
  | "title"
  | "thumbnail"
  | "lead"
  | "body"
  | "summary"
  | "cta"
  | "keywords"
  | "tags"
  | "targetReader"
  | "readTime"
  | "freeScope"
  | "typeNote";

// メタ見出し(括弧書き・空白を除いて正規化した名前) → フィールド
const META_MAP: Record<string, MetaKey> = {
  タイトル: "title",
  アイキャッチ案: "thumbnail",
  アイキャッチ: "thumbnail",
  導入文: "lead",
  リード文: "lead",
  本文: "body",
  まとめ: "summary",
  次回予告: "cta",
  SEOキーワード: "keywords",
  キーワード: "keywords",
  タグ: "tags",
  ハッシュタグ: "tags",
  想定読者: "targetReader",
  読了時間: "readTime",
  有料ラインの位置: "freeScope",
  有料ライン: "freeScope",
};

// H4(####)も見出しとして認識する。有料テンプレ集の個々のプロンプト
// (「#### T-01|タイトル」「#### P-01|タイトル」等)を、本文中の埋め込みテキストではなく
// 独立したセクションとして取り込むために必要。
const HEADING_RE = /^(#{1,4})\s+(.+?)\s*$/;
const PAID_MARKER_RE = /^[-=＝_*＊~〜ー–—\s(（)）]*ここから有料[-=＝_*＊~〜ー–—\s(（)）]*$/;
const HR_RE = /^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/;

// 「導入文(無料部分)」→「導入文」のように括弧書き・空白・記号を除去して比較する
function normalizeHeading(heading: string): string {
  return heading
    .replace(/[（(][^（()）]*[)）]/g, "")
    .replace(/[\s:：|｜]/g, "")
    .trim();
}

function blockText(block: RawBlock): string {
  const lines = [...block.lines];
  while (lines.length && (!lines[0].trim() || HR_RE.test(lines[0]))) lines.shift();
  while (lines.length && (!lines[lines.length - 1].trim() || HR_RE.test(lines[lines.length - 1]))) {
    lines.pop();
  }
  return lines.join("\n").trim();
}

// H2ブロック直後に続くH3・H4ブロック群を子として集める。
// H4(有料テンプレ集の個々のプロンプト等)もH3と同じ粒度でフラットに1セクションずつ扱う
// (UI側は見出し+本文のカード表示のみのため、H3/H4の階層差を作る必要がない)。
function collectChildren(blocks: RawBlock[], i: number): { children: RawBlock[]; next: number } {
  const children: RawBlock[] = [];
  let j = i + 1;
  while (j < blocks.length && blocks[j].level >= 3) {
    children.push(blocks[j]);
    j++;
  }
  return { children, next: j };
}

// H2本文+H3小見出しを1セクションの本文に畳み込む(汎用形式・未知の見出し用)
function foldSection(block: RawBlock, children: RawBlock[]): GeneratedSection {
  const parts = [blockText(block)];
  for (const c of children) parts.push(`${"#".repeat(c.level)} ${c.heading}\n${blockText(c)}`);
  return {
    heading: block.heading,
    level: block.level,
    content: parts.filter(Boolean).join("\n\n"),
    isPaid: block.isPaid || (children.length > 0 && children.every((c) => c.isPaid)),
  };
}

// 「01_第1回_タイトル.md」→「第1回_タイトル」のように整形
function titleFromFileName(fileName: string): string {
  return fileName
    .replace(/\.(md|markdown|txt)$/i, "")
    .replace(/^\d+[_\-]/, "")
    .trim();
}

function stripTitleDecorations(text: string): string {
  return text.replace(/【[^】]*】/g, "").trim();
}

export function parseMarkdownArticle(md: string, fileName?: string): ParsedMdArticle {
  const warnings: string[] = [];

  // 行単位で走査してブロックに分割。有料マーカー行はフラグに変換して除去する。
  // フェンスコードブロック(```〜```)内は、シェル/Pythonコメント等の「# 〜」行を
  // 見出しと誤認識しないよう、見出し判定の対象から除外する。
  const blocks: RawBlock[] = [];
  let current: RawBlock = { level: 0, heading: "", lines: [], isPaid: false };
  let paid = false;
  let inFence = false;
  for (const line of md.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      current.lines.push(line);
      continue;
    }
    if (inFence) {
      current.lines.push(line);
      continue;
    }
    if (line.includes("ここから有料") && PAID_MARKER_RE.test(line)) {
      paid = true;
      continue;
    }
    const m = HEADING_RE.exec(line);
    if (m) {
      blocks.push(current);
      current = { level: m[1].length, heading: m[2], lines: [], isPaid: paid };
    } else {
      current.lines.push(line);
    }
  }
  blocks.push(current);

  const h1Block = blocks.find((b) => b.level === 1);
  const h1 = h1Block?.heading ?? "";
  // 最初のH2より前の本文(見出しなし部分+H1直下)を導入文候補にする
  const preamble = [blockText(blocks[0]), h1Block ? blockText(h1Block) : ""]
    .filter(Boolean)
    .join("\n\n");

  // メタ見出しの抽出(H2のみ対象)
  const meta = new Map<MetaKey, { block: RawBlock; index: number }>();
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.level !== 2) continue;
    const key = META_MAP[normalizeHeading(b.heading)];
    if (key && !meta.has(key)) meta.set(key, { block: b, index: i });
  }

  // 「タイトル」「導入文」「本文」のいずれかがあれば構造化形式とみなす
  const structured = meta.has("title") || meta.has("lead") || meta.has("body");

  const sections: GeneratedSection[] = [];
  let summary = "";
  let cta = "";
  let lead = "";

  if (structured) {
    lead = meta.has("lead") ? blockText(meta.get("lead")!.block) : preamble;
    summary = meta.has("summary") ? blockText(meta.get("summary")!.block) : "";
    cta = meta.has("cta") ? blockText(meta.get("cta")!.block) : "";

    // 本文: H3小見出しを1つずつセクションにする
    if (meta.has("body")) {
      const { block, index } = meta.get("body")!;
      const intro = blockText(block);
      if (intro) {
        sections.push({ heading: "はじめに", level: 3, content: intro, isPaid: block.isPaid });
      }
      const { children } = collectChildren(blocks, index);
      for (const c of children) {
        sections.push({ heading: c.heading, level: c.level, content: blockText(c), isPaid: c.isPaid });
      }
    }

    // メタ見出し以外のH2は追加セクションとして取り込む
    const metaIndexes = new Set(Array.from(meta.values(), (v) => v.index));
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (b.level !== 2 || metaIndexes.has(i)) continue;
      const { children } = collectChildren(blocks, i);
      const folded = foldSection(b, children);
      if (folded.content) sections.push(folded);
    }
  } else {
    // 汎用形式: H2をセクション、まとめ/次回予告系の見出しは専用フィールドへ
    lead = preamble;
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      if (b.level !== 2) continue;
      const { children } = collectChildren(blocks, i);
      const name = normalizeHeading(b.heading);
      if (/^(まとめ|おわりに|さいごに|最後に)$/.test(name) && !summary) {
        summary = blockText(b);
      } else if (/次回予告/.test(name) && !cta) {
        cta = blockText(b);
      } else {
        const folded = foldSection(b, children);
        if (folded.content || folded.heading) sections.push(folded);
      }
    }
  }

  // タイトル決定: 「## タイトル」→ H1 → ファイル名 の順にフォールバック
  let title = "";
  if (meta.has("title")) {
    title = blockText(meta.get("title")!.block).split("\n")[0]?.trim() ?? "";
  }
  if (!title && h1) title = stripTitleDecorations(h1);
  if (!title && fileName) {
    title = titleFromFileName(fileName);
    warnings.push("タイトルが見つからなかったため、ファイル名をタイトルにしました。");
  }
  if (!title) {
    title = "無題の記事";
    warnings.push("タイトルが見つかりませんでした。編集画面で入力してください。");
  }

  // 見出しが1つもないmd: 全文を1セクションとして取り込む
  if (sections.length === 0 && lead) {
    sections.push({ heading: "本文", level: 2, content: lead, isPaid: false });
    lead = "";
    warnings.push("見出しが見つからなかったため、全文を1つのセクションとして取り込みました。");
  }

  // 有料/無料と価格の判定
  const typeSource = `${h1}\n${meta.has("title") ? blockText(meta.get("title")!.block) : ""}`;
  const priceMatch = /有料[・･,、]?\s*([0-9][0-9,]*)\s*円/.exec(typeSource);
  const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ""), 10) : null;
  const freeScopeNote = meta.has("freeScope") ? blockText(meta.get("freeScope")!.block) : "";

  let articleType: "free" | "paid";
  if (/【\s*有料/.test(typeSource) || price != null) {
    articleType = "paid";
  } else if (/【\s*無料\s*】/.test(typeSource)) {
    articleType = "free";
  } else {
    articleType = sections.some((s) => s.isPaid) || freeScopeNote ? "paid" : "free";
  }

  // タグ: 「## タグ」を優先し、なければSEOキーワードから生成
  let hashtags = meta.has("tags") ? blockText(meta.get("tags")!.block).replace(/\n+/g, " ") : "";
  if (!hashtags && meta.has("keywords")) {
    hashtags = blockText(meta.get("keywords")!.block)
      .split(/[/／・、,\n]/)
      .map((k) => k.trim().replace(/\s+/g, ""))
      .filter(Boolean)
      .map((k) => (k.startsWith("#") ? k : `#${k}`))
      .join(" ");
  }

  if (articleType === "paid" && !sections.some((s) => s.isPaid)) {
    warnings.push(
      "有料記事ですが有料セクションの境界が見つかりませんでした。編集画面で有料開始位置を設定してください。",
    );
  }

  return {
    title,
    articleType,
    price,
    lead,
    sections,
    summary,
    cta,
    hashtags,
    thumbnailText: meta.has("thumbnail") ? blockText(meta.get("thumbnail")!.block) : "",
    targetReader: meta.has("targetReader") ? blockText(meta.get("targetReader")!.block) : "",
    freeScopeNote,
    warnings,
  };
}
