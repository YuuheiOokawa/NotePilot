// 売上分析の集計ロジック。
// スケジュール(schedule.ts)と同様、サーバーのタイムゾーンに依存しないよう
// 月の区切りは常にJST基準で計算する。
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export interface RevenueEntry {
  date: Date;
  count: number;
  amount: number;
  articleId: string;
  articleTitle: string;
  articleType: string;
}

export interface MonthlySummary {
  month: string; // 例: "2026-07"
  amount: number;
  count: number;
}

export interface ArticleRanking {
  articleId: string;
  title: string;
  articleType: string;
  amount: number;
  count: number;
}

export interface RevenueSummary {
  totalAmount: number;
  totalCount: number;
  thisMonthAmount: number;
  lastMonthAmount: number;
  monthly: MonthlySummary[]; // 直近6ヶ月（古い順）
  topArticles: ArticleRanking[]; // 売上額の上位5記事
}

// 日時から月キーを作る（例: "2026-07"）。常にJST基準。
export function monthKeyJst(date: Date): string {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  return `${jst.getUTCFullYear()}-${String(jst.getUTCMonth() + 1).padStart(2, "0")}`;
}

// now を含む直近 n ヶ月の月キーを古い順に返す
export function recentMonthKeys(now: Date, n: number): string[] {
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth() - i, 1));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

export function summarizeRevenues(entries: RevenueEntry[], now: Date): RevenueSummary {
  const months = recentMonthKeys(now, 6);
  const monthlyMap = new Map<string, MonthlySummary>(
    months.map((m) => [m, { month: m, amount: 0, count: 0 }]),
  );
  const articleMap = new Map<string, ArticleRanking>();

  let totalAmount = 0;
  let totalCount = 0;

  for (const e of entries) {
    totalAmount += e.amount;
    totalCount += e.count;

    const monthly = monthlyMap.get(monthKeyJst(e.date));
    if (monthly) {
      monthly.amount += e.amount;
      monthly.count += e.count;
    }

    const article = articleMap.get(e.articleId) ?? {
      articleId: e.articleId,
      title: e.articleTitle,
      articleType: e.articleType,
      amount: 0,
      count: 0,
    };
    article.amount += e.amount;
    article.count += e.count;
    articleMap.set(e.articleId, article);
  }

  const monthly = months.map((m) => monthlyMap.get(m)!);
  const topArticles = [...articleMap.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    totalAmount,
    totalCount,
    thisMonthAmount: monthly[monthly.length - 1].amount,
    lastMonthAmount: monthly[monthly.length - 2].amount,
    monthly,
    topArticles,
  };
}
