import { describe, expect, it } from "vitest";
import { MockProvider } from "./mock";
import type { AutoFixRequest } from "../types";

const provider = new MockProvider();

function makeRequest(overrides: Partial<AutoFixRequest> = {}): AutoFixRequest {
  return {
    title: "テスト記事",
    articleType: "free",
    lead: "この記事はは違い、誰でも簡単に稼げる方法を紹介します。",
    sections: [
      {
        heading: "絶対にやるべきこと",
        content: "このの方法なら必ず稼げるです。です。まずは  始めましょう。",
        isPaid: false,
      },
      { heading: "次のステップ", content: "間違いなく成果が出ます。", isPaid: true },
    ],
    summary: "100%成功する方法を保証します。",
    issues: {
      typoIssues: ["「のの」（助詞の重複） が見つかりました。"],
      grammarIssues: [],
      expressionIssues: ["誇大・断定表現「絶対に」が含まれています。"],
      duplicationIssues: [],
    },
    ...overrides,
  };
}

describe("MockProvider.fixArticle: 自動修正", () => {
  it("誤字パターン(助詞・文末の重複、連続スペース)を修正する", async () => {
    const result = await provider.fixArticle(makeRequest());
    expect(result.sections[0].content).not.toContain("のの");
    expect(result.sections[0].content).not.toContain("です。です");
    expect(result.sections[0].content).not.toContain("  ");
  });

  it("誇大表現を体験ベースの表現に言い換える", async () => {
    const result = await provider.fixArticle(makeRequest());
    expect(result.lead).not.toContain("誰でも簡単に稼げる");
    expect(result.sections[0].heading).not.toContain("絶対に");
    expect(result.sections[0].content).not.toContain("必ず稼げる");
    expect(result.sections[1].content).not.toContain("間違いなく");
    expect(result.summary).not.toContain("100%");
    expect(result.summary).not.toContain("保証します");
  });

  it("セクションの数・順序・isPaidを変更しない", async () => {
    const req = makeRequest();
    const result = await provider.fixArticle(req);
    expect(result.sections.length).toBe(req.sections.length);
    expect(result.sections.map((s) => s.isPaid)).toEqual(req.sections.map((s) => s.isPaid));
  });

  it("changeNotesに修正内容の説明が入る", async () => {
    const result = await provider.fixArticle(makeRequest());
    expect(result.changeNotes.length).toBeGreaterThan(0);
    expect(result.changeNotes.some((n) => n.includes("誇大表現"))).toBe(true);
  });

  it("重複の指摘がある場合は「自動修正の対象外」と明示する", async () => {
    const result = await provider.fixArticle(
      makeRequest({
        issues: {
          typoIssues: [],
          grammarIssues: [],
          expressionIssues: [],
          duplicationIssues: ["複数セクションで同じ文が使われています"],
        },
      }),
    );
    expect(result.changeNotes.some((n) => n.includes("自動修正していません"))).toBe(true);
  });

  it("修正後の記事を再チェックすると誤字・誇大表現の指摘が消える", async () => {
    const req = makeRequest();
    const fixed = await provider.fixArticle(req);
    const review = await provider.reviewArticle({
      title: req.title,
      articleType: req.articleType,
      lead: fixed.lead,
      sections: fixed.sections,
      summary: fixed.summary,
    });
    expect(review.typoIssues).toEqual([]);
    expect(review.expressionIssues).toEqual([]);
  });
});
