import { describe, expect, it } from "vitest";
import { monthKeyJst, recentMonthKeys, summarizeRevenues, type RevenueEntry } from "./revenue";

const entry = (over: Partial<RevenueEntry>): RevenueEntry => ({
  date: new Date(Date.UTC(2026, 6, 1)),
  count: 1,
  amount: 500,
  articleId: "a1",
  articleTitle: "記事1",
  articleType: "paid",
  ...over,
});

describe("revenue: 売上分析の集計", () => {
  it("monthKeyJst: JST基準で月キーを作る（月境界の日付またぎ）", () => {
    // UTC 2026-06-30 20:00 = JST 2026-07-01 05:00 → 7月扱い
    expect(monthKeyJst(new Date(Date.UTC(2026, 5, 30, 20, 0)))).toBe("2026-07");
    expect(monthKeyJst(new Date(Date.UTC(2026, 6, 15, 0, 0)))).toBe("2026-07");
  });

  it("recentMonthKeys: 年またぎを含む直近nヶ月を古い順に返す", () => {
    const now = new Date(Date.UTC(2026, 1, 15)); // JST 2026-02
    expect(recentMonthKeys(now, 4)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });

  it("summarizeRevenues: 合計・今月/先月・月別・記事ランキングを集計する", () => {
    const now = new Date(Date.UTC(2026, 6, 7, 3, 0)); // JST 2026-07-07
    const entries: RevenueEntry[] = [
      entry({ amount: 1000, count: 2 }), // 7月 a1
      entry({ amount: 300, date: new Date(Date.UTC(2026, 5, 10)) }), // 6月 a1
      entry({
        amount: 5000,
        articleId: "a2",
        articleTitle: "記事2",
        date: new Date(Date.UTC(2026, 6, 3)),
      }), // 7月 a2
      entry({ amount: 100, date: new Date(Date.UTC(2020, 0, 1)) }), // 集計期間外(合計には含む)
    ];
    const s = summarizeRevenues(entries, now);

    expect(s.totalAmount).toBe(6400);
    expect(s.totalCount).toBe(5);
    expect(s.thisMonthAmount).toBe(6000);
    expect(s.lastMonthAmount).toBe(300);
    expect(s.monthly).toHaveLength(6);
    expect(s.monthly[5]).toEqual({ month: "2026-07", amount: 6000, count: 3 });
    expect(s.monthly[4]).toEqual({ month: "2026-06", amount: 300, count: 1 });
    // ランキングは売上額の降順
    expect(s.topArticles.map((a) => a.articleId)).toEqual(["a2", "a1"]);
    expect(s.topArticles[0].amount).toBe(5000);
    expect(s.topArticles[1].amount).toBe(1400);
  });

  it("summarizeRevenues: 空でも6ヶ月分のゼロ集計を返す", () => {
    const s = summarizeRevenues([], new Date(Date.UTC(2026, 6, 7)));
    expect(s.totalAmount).toBe(0);
    expect(s.monthly).toHaveLength(6);
    expect(s.monthly.every((m) => m.amount === 0 && m.count === 0)).toBe(true);
    expect(s.topArticles).toEqual([]);
  });
});
