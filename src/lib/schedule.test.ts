import { describe, expect, it } from "vitest";
import {
  canScheduleInHour,
  findOpenSlots,
  hourKey,
  jstSlotDate,
  MAX_POSTS_PER_HOUR,
  remainingSlots,
} from "./schedule";

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

  it("hourKey: サーバーのタイムゾーンに依存せずJST基準で計算する", () => {
    // UTC 2026-07-07 01:05 = JST 2026-07-07 10:05
    const utc = new Date(Date.UTC(2026, 6, 7, 1, 5));
    expect(hourKey(utc)).toBe("2026-07-07T10");
    // UTC 2026-07-07 23:00 = JST 2026-07-08 08:00（日付をまたぐ）
    const crossDay = new Date(Date.UTC(2026, 6, 7, 23, 0));
    expect(hourKey(crossDay)).toBe("2026-07-08T08");
  });

  it("jstSlotDate: 指定日数後のJST時刻を正しく作る", () => {
    const base = new Date(Date.UTC(2026, 6, 7, 3, 0)); // JST 7/7 12:00
    const slot = jstSlotDate(base, 1, 9); // 翌日 JST 9:00
    expect(hourKey(slot)).toBe("2026-07-08T09");
  });

  it("findOpenSlots: 使用済み時間帯を避けて1時間1件で分散配置する", () => {
    const base = new Date(Date.UTC(2026, 6, 7, 3, 0)); // JST 7/7 12:00
    const used = new Set<string>(["2026-07-08T09"]); // 翌日9時は使用済み
    const slots = findOpenSlots(base, 3, used);
    expect(slots).toHaveLength(3);
    const keys = slots.map(hourKey);
    // 使用済みの9時は避けられる
    expect(keys).not.toContain("2026-07-08T09");
    // すべて異なる時間帯（1時間1件で分散）
    expect(new Set(keys).size).toBe(3);
    // 先頭は翌日の10時（9時がスキップされた次の枠）
    expect(keys[0]).toBe("2026-07-08T10");
  });

  it("findOpenSlots: 大量でも複数日に分散して全件割当できる", () => {
    const base = new Date(Date.UTC(2026, 6, 7, 3, 0));
    const slots = findOpenSlots(base, 20, new Set());
    expect(slots).toHaveLength(20);
    expect(new Set(slots.map(hourKey)).size).toBe(20);
  });
});
