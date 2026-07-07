import Link from "next/link";
import StatusBadge from "./StatusBadge";

export interface ArticleSummary {
  id: string;
  title: string;
  articleType: "free" | "paid";
  status: string;
  price?: number | null;
  updatedAt: string;
}

export default function ArticleCard({ article }: { article: ArticleSummary }) {
  return (
    <Link href={`/articles/${article.id}`} className="card block active:bg-gray-50">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
            article.articleType === "paid"
              ? "bg-amber-100 text-amber-700"
              : "bg-sky-100 text-sky-700"
          }`}
        >
          {article.articleType === "paid" ? `有料${article.price ? ` ¥${article.price}` : ""}` : "無料"}
        </span>
        <StatusBadge status={article.status} />
      </div>
      <p className="line-clamp-2 text-sm font-bold">{article.title}</p>
      <p className="mt-1 text-[10px] text-gray-400">
        更新: {new Date(article.updatedAt).toLocaleString("ja-JP")}
      </p>
    </Link>
  );
}
