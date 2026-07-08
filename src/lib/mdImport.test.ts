import { describe, expect, it } from "vitest";
import { parseMarkdownArticle } from "./mdImport";

const STRUCTURED_FREE = `# 第1回【無料】

## タイトル
AI初心者が最初に知るべき5つのこと|3分で解消します

## アイキャッチ案
白背景に大きく「はじめてのAI」の文字。

## 想定読者
- AIに興味はあるがまだ触ったことがない人

## 読了時間
約4分

## SEOキーワード
生成AI とは / AI 初心者

## タグ
#AI初心者 #生成AI #ChatGPT

---

## 導入文

「AIが話題なのは知っている」

そんな人のための連載第1回です。

## 本文

### 結論:生成AIは道具です

まず結論から言います。

### ①会話形式で使う

チャットに打ち込むだけです。

## まとめ

- 生成AIは道具
- まず触ってみる

## 次回予告

第2回は「ChatGPTの始め方」です。
`;

const STRUCTURED_PAID = `# 第8回【有料・500円】

## タイトル
【保存版】コピペで使えるプロンプト20選

## タグ
#プロンプト #業務効率化

## 有料ラインの位置
無料サンプル2本までを無料公開。テンプレ一覧以降を有料。

## 導入文(無料部分)

シリーズ第8回です。

## 本文

### 無料サンプル

これは無料部分です。

---(ここから有料)---

### テンプレ20本の全体マップ

これは有料部分です。

### メール編

有料の続きです。

## まとめ

- テンプレは育てる
`;

const GENERIC_MD = `# 汎用的な記事タイトル

これは導入の段落です。

## 最初の見出し

最初のセクションの本文。

### 小見出し

小見出しの内容。

## 次の見出し

次のセクションの本文。

## まとめ

まとめの本文。
`;

describe("mdImport: 構造化形式(無料)", () => {
  const parsed = parseMarkdownArticle(STRUCTURED_FREE, "01_第1回.md");

  it("タイトルは「## タイトル」から取得する", () => {
    expect(parsed.title).toBe("AI初心者が最初に知るべき5つのこと|3分で解消します");
  });

  it("無料記事と判定される", () => {
    expect(parsed.articleType).toBe("free");
    expect(parsed.price).toBeNull();
  });

  it("導入文・まとめ・次回予告が対応フィールドに入る", () => {
    expect(parsed.lead).toContain("連載第1回です");
    expect(parsed.summary).toContain("生成AIは道具");
    expect(parsed.cta).toContain("第2回");
  });

  it("本文のH3が1つずつセクションになる", () => {
    expect(parsed.sections.map((s) => s.heading)).toEqual([
      "結論:生成AIは道具です",
      "①会話形式で使う",
    ]);
    expect(parsed.sections.every((s) => !s.isPaid)).toBe(true);
  });

  it("タグ・アイキャッチ・想定読者が取り込まれる", () => {
    expect(parsed.hashtags).toBe("#AI初心者 #生成AI #ChatGPT");
    expect(parsed.thumbnailText).toContain("はじめてのAI");
    expect(parsed.targetReader).toContain("触ったことがない人");
  });
});

describe("mdImport: 構造化形式(有料)", () => {
  const parsed = parseMarkdownArticle(STRUCTURED_PAID);

  it("【有料・500円】から有料判定と価格を取得する", () => {
    expect(parsed.articleType).toBe("paid");
    expect(parsed.price).toBe(500);
  });

  it("「ここから有料」マーカー以降のセクションだけisPaidになる", () => {
    expect(parsed.sections.map((s) => [s.heading, s.isPaid])).toEqual([
      ["無料サンプル", false],
      ["テンプレ20本の全体マップ", true],
      ["メール編", true],
    ]);
  });

  it("有料ラインの位置がfreeScopeNoteに入る", () => {
    expect(parsed.freeScopeNote).toContain("無料サンプル2本まで");
  });

  it("括弧書き付きの「導入文(無料部分)」も導入文として扱う", () => {
    expect(parsed.lead).toContain("シリーズ第8回");
  });
});

describe("mdImport: 汎用形式", () => {
  const parsed = parseMarkdownArticle(GENERIC_MD);

  it("H1がタイトル、H1直後の段落が導入文になる", () => {
    expect(parsed.title).toBe("汎用的な記事タイトル");
    expect(parsed.lead).toBe("これは導入の段落です。");
  });

  it("H2がセクションになり、H3は本文に畳み込まれる", () => {
    expect(parsed.sections.map((s) => s.heading)).toEqual(["最初の見出し", "次の見出し"]);
    expect(parsed.sections[0].content).toContain("### 小見出し");
  });

  it("「まとめ」見出しはセクションではなくsummaryに入る", () => {
    expect(parsed.summary).toBe("まとめの本文。");
  });

  it("無料記事と判定される", () => {
    expect(parsed.articleType).toBe("free");
  });
});

describe("mdImport: フォールバック", () => {
  it("見出しのないテキストは全文を1セクションとして取り込む", () => {
    const parsed = parseMarkdownArticle("ただの文章です。\n2行目。", "02_メモ.md");
    expect(parsed.title).toBe("メモ");
    expect(parsed.sections).toEqual([
      { heading: "本文", content: "ただの文章です。\n2行目。", isPaid: false },
    ]);
    expect(parsed.warnings.length).toBeGreaterThan(0);
  });

  it("有料表記があるのに境界マーカーがない場合は警告を出す", () => {
    const parsed = parseMarkdownArticle("# 記事【有料・300円】\n\n## 見出し\n\n本文。");
    expect(parsed.articleType).toBe("paid");
    expect(parsed.price).toBe(300);
    expect(parsed.warnings.some((w) => w.includes("有料セクションの境界"))).toBe(true);
  });
});
