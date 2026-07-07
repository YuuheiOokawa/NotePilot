// 投稿スケジュール管理。
// 1時間あたり最大3投稿はスケジュール管理上の目安であり、
// 実際の投稿は必ずユーザー承認後に手動で行う（自動スパム投稿はしない）。
export const MAX_POSTS_PER_HOUR = 3;

// 自動割当の対象時間帯（JST）。読者が活動している時間に配置する。
export const AUTO_ASSIGN_HOURS_JST = [9, 10, 11, 12, 15, 18, 19, 20, 21];

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 日時から時間バケツのキーを作る（例: "2026-07-07T10"）。
// サーバーのタイムゾーンに依存しないよう常にJST基準で計算する
// （ローカル=JST / Vercel=UTC が同じDBを共有しても集計がずれないため）。
export function hourKey(date: Date): string {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${jst.getUTCFullYear()}-${pad(jst.getUTCMonth() + 1)}-${pad(jst.getUTCDate())}T${pad(jst.getUTCHours())}`;
}

// JSTの (今日からdayOffset日後, hour時) を表すDateを返す
export function jstSlotDate(base: Date, dayOffset: number, hourJst: number): Date {
  const jst = new Date(base.getTime() + JST_OFFSET_MS);
  return new Date(
    Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth(), jst.getUTCDate() + dayOffset, hourJst - 9, 0, 0),
  );
}

// 同一時間帯にあと何枠あるか
export function remainingSlots(countInSameHour: number): number {
  return Math.max(0, MAX_POSTS_PER_HOUR - countInSameHour);
}

// この時間帯に追加スケジュール可能か
export function canScheduleInHour(countInSameHour: number): boolean {
  return countInSameHour < MAX_POSTS_PER_HOUR;
}

// 空きスロットを順に列挙する（翌日から maxDays 日先まで、1時間1件で分散配置）。
// usedKeys: すでに使用済みの時間バケツ（DB上の予定＋今回割当済み）
export function findOpenSlots(base: Date, count: number, usedKeys: Set<string>, maxDays = 30): Date[] {
  const slots: Date[] = [];
  for (let day = 1; day <= maxDays && slots.length < count; day++) {
    for (const hour of AUTO_ASSIGN_HOURS_JST) {
      if (slots.length >= count) break;
      const slot = jstSlotDate(base, day, hour);
      const key = hourKey(slot);
      if (!usedKeys.has(key)) {
        usedKeys.add(key);
        slots.push(slot);
      }
    }
  }
  return slots;
}
