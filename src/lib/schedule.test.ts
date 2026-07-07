import { describe, expect, it } from "vitest";
import { canScheduleInHour, hourKey, MAX_POSTS_PER_HOUR, remainingSlots } from "./schedule";

describe("schedule: 投稿頻度管理（1時間に最大3投稿）", () => {
  it("上限は3件", () => {
    expect(MAX_POSTS_PER_HOUR).toBe(3);
  });

  it("同一時間帯が2件以下なら追加スケジュール可能", () => {
    expect(canScheduleInHour(0)).toBe(true);
    expect(canScheduleInHour(1)).toBe(true);
    expect(canScheduleInHour(2)).toBe(true);
  });

  it("同一時間帯が3件以上なら追加不可", () => {
    expect(canScheduleInHour(3)).toBe(false);
    expect(canScheduleInHour(4)).toBe(false);
  });

  it("残り枠を正しく計算する", () => {
    expect(remainingSlots(0)).toBe(3);
    expect(remainingSlots(2)).toBe(1);
    expect(remainingSlots(3)).toBe(0);
    expect(remainingSlots(5)).toBe(0);
  });

  it("hourKey: 同じ時間帯なら同じキー、別の時間帯なら別のキー", () => {
    const a = new Date(2026, 6, 7, 10, 5); // 2026-07-07 10:05
    const b = new Date(2026, 6, 7, 10, 59);
    const c = new Date(2026, 6, 7, 11, 0);
    expect(hourKey(a)).toBe("2026-07-07T10");
    expect(hourKey(a)).toBe(hourKey(b));
    expect(hourKey(a)).not.toBe(hourKey(c));
  });

  it("hourKey: 1桁の月・日・時をゼロ埋めする", () => {
    const d = new Date(2026, 0, 5, 9, 0); // 2026-01-05 09:00
    expect(hourKey(d)).toBe("2026-01-05T09");
  });
});
