// 投稿スケジュール管理。
// 1時間あたり最大3投稿はスケジュール管理上の目安であり、
// 実際の投稿は必ずユーザー承認後に手動で行う（自動スパム投稿はしない）。
export const MAX_POSTS_PER_HOUR = 3;

// 日時から時間バケツのキーを作る（例: "2026-07-07T10"）。
// postFrequencyGroup に保存し、同一キーの記事数で時間あたり投稿数を管理する。
export function hourKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}`;
}

// 同一時間帯にあと何枠あるか
export function remainingSlots(countInSameHour: number): number {
  return Math.max(0, MAX_POSTS_PER_HOUR - countInSameHour);
}

// この時間帯に追加スケジュール可能か
export function canScheduleInHour(countInSameHour: number): boolean {
  return countInSameHour < MAX_POSTS_PER_HOUR;
}
