import { STATUS_COLORS, STATUS_LABELS, type ArticleStatus } from "@/lib/workflow";

export default function StatusBadge({ status }: { status: string }) {
  const s = status as ArticleStatus;
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
        STATUS_COLORS[s] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {STATUS_LABELS[s] ?? status}
    </span>
  );
}
