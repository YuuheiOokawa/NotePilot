import { describe, expect, it } from "vitest";
import { convertMarkdownTablesForNote, formatHeading, normalizeBlankLines } from "./noteFormat";

describe("formatHeading", () => {
  it("level2は##を付与する", () => {
    expect(formatHeading("導入文", 2)).toBe("## 導入文");
  });

  it("level3は###、level4は####を付与する", () => {
    expect(formatHeading("小見出し", 3)).toBe("### 小見出し");
    expect(formatHeading("T-01|要件定義", 4)).toBe("#### T-01|要件定義");
  });

  it("levelがnull/undefinedの場合は2として扱う", () => {
    expect(formatHeading("見出し", null)).toBe("## 見出し");
    expect(formatHeading("見出し", undefined)).toBe("## 見出し");
  });
});

describe("normalizeBlankLines", () => {
  it("3行以上連続する空行を1行に揃える", () => {
    expect(normalizeBlankLines("A\n\n\n\nB")).toBe("A\n\nB");
  });

  it("1行・2行の空行はそのまま保つ", () => {
    expect(normalizeBlankLines("A\nB\n\nC")).toBe("A\nB\n\nC");
  });
});

describe("convertMarkdownTablesForNote", () => {
  it("テーブルを含まないテキストはそのまま返す", () => {
    const text = "普通の文章です。\n2行目。";
    expect(convertMarkdownTablesForNote(text)).toBe(text);
  });

  it("2列の表(用語集)を「・A：B」の箇条書きに変換する", () => {
    const input = [
      "| 用語 | 意味 |",
      "|---|---|",
      "| 生成AI | 文章・画像などを新たに作り出すAI |",
      "| ハルシネーション | もっともらしい間違いを出力する現象 |",
    ].join("\n");
    expect(convertMarkdownTablesForNote(input)).toBe(
      [
        "・生成AI：文章・画像などを新たに作り出すAI",
        "・ハルシネーション：もっともらしい間違いを出力する現象",
      ].join("\n"),
    );
  });

  it("3列以上の表を「見出し: 値／見出し: 値」の箇条書きに変換する", () => {
    const input = [
      "| # | タイトル | カテゴリ |",
      "|---|---|---|",
      "| T-01 | 依頼メール | メール編 |",
      "| T-02 | 催促メール | メール編 |",
    ].join("\n");
    expect(convertMarkdownTablesForNote(input)).toBe(
      [
        "・#: T-01／タイトル: 依頼メール／カテゴリ: メール編",
        "・#: T-02／タイトル: 催促メール／カテゴリ: メール編",
      ].join("\n"),
    );
  });

  it("前後の文章を保ったまま、表の部分だけを変換する", () => {
    const input = [
      "表の前の説明文。",
      "",
      "| 用語 | 意味 |",
      "|---|---|",
      "| A | B |",
      "",
      "表の後の説明文。",
    ].join("\n");
    expect(convertMarkdownTablesForNote(input)).toBe(
      ["表の前の説明文。", "", "・A：B", "", "表の後の説明文。"].join("\n"),
    );
  });

  it("1つの本文に複数の表があっても、それぞれ変換する", () => {
    const input = [
      "| 用語 | 意味 |",
      "|---|---|",
      "| A | B |",
      "",
      "中間の文章。",
      "",
      "| 型 | 例 |",
      "|---|---|",
      "| 数字型 | 5つの仕組み |",
    ].join("\n");
    expect(convertMarkdownTablesForNote(input)).toBe(
      ["・A：B", "", "中間の文章。", "", "・数字型：5つの仕組み"].join("\n"),
    );
  });

  it("区切り線(左寄せ・中央・右寄せ指定の:付き)も表として認識する", () => {
    const input = ["| 左 | 中央 | 右 |", "|:---|:---:|---:|", "| a | b | c |"].join("\n");
    expect(convertMarkdownTablesForNote(input)).toBe("・左: a／中央: b／右: c");
  });

  it("セル数が見出しより少ない行があってもクラッシュしない", () => {
    const input = ["| a | b | c |", "|---|---|---|", "| 1 | 2 |"].join("\n");
    expect(convertMarkdownTablesForNote(input)).toBe("・a: 1／b: 2／c: ");
  });

  it("区切り線を伴わない単発の「| で始まらない」パイプ文字は変換しない", () => {
    const input = "AとBのどちらか(A|B)を選んでください。";
    expect(convertMarkdownTablesForNote(input)).toBe(input);
  });

  it("表らしき行があっても、直後が区切り線でなければ変換しない", () => {
    const input = ["| a | b |", "普通の次の行です。"].join("\n");
    expect(convertMarkdownTablesForNote(input)).toBe(input);
  });
});
