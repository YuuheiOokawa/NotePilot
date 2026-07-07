import { describe, expect, it } from "vitest";
import { canTransition, isStatus, STATUSES, USER_ONLY_TARGETS } from "./workflow";

describe("workflow: ステータス遷移ガード", () => {
  it("正常系: 標準フローの遷移がすべて許可される", () => {
    expect(canTransition("idea", "draft")).toBe(true);
    expect(canTransition("draft", "review")).toBe(true);
    expect(canTransition("review", "approved")).toBe(true);
    expect(canTransition("approved", "copied")).toBe(true);
    expect(canTransition("copied", "posted")).toBe(true);
    expect(canTransition("posted", "archived")).toBe(true);
  });

  it("差し戻し: review→draft, approved→draft, copied→approved が許可される", () => {
    expect(canTransition("review", "draft")).toBe(true);
    expect(canTransition("approved", "draft")).toBe(true);
    expect(canTransition("copied", "approved")).toBe(true);
  });

  it("承認スキップ禁止: draft から approved / copied / posted へ直接遷移できない", () => {
    expect(canTransition("draft", "approved")).toBe(false);
    expect(canTransition("draft", "copied")).toBe(false);
    expect(canTransition("draft", "posted")).toBe(false);
  });

  it("承認前の投稿禁止: review / approved から posted へ直接遷移できない", () => {
    expect(canTransition("review", "posted")).toBe(false);
    expect(canTransition("approved", "posted")).toBe(false);
  });

  it("逆行禁止: posted から draft / review へ戻れない", () => {
    expect(canTransition("posted", "draft")).toBe(false);
    expect(canTransition("posted", "review")).toBe(false);
  });

  it("アーカイブ: posted 以外の全ステータスからも archived にでき、復元は draft のみ", () => {
    for (const s of STATUSES.filter((s) => s !== "archived")) {
      expect(canTransition(s, "archived")).toBe(true);
    }
    expect(canTransition("archived", "draft")).toBe(true);
    expect(canTransition("archived", "approved")).toBe(false);
    expect(canTransition("archived", "posted")).toBe(false);
  });

  it("同一ステータスへの遷移は不可", () => {
    for (const s of STATUSES) {
      expect(canTransition(s, s)).toBe(false);
    }
  });

  it("isStatus: 未知の値を拒否する", () => {
    expect(isStatus("draft")).toBe(true);
    expect(isStatus("published")).toBe(false);
    expect(isStatus("")).toBe(false);
  });

  it("ユーザー操作限定の遷移先が定義されている（R2）", () => {
    expect(USER_ONLY_TARGETS).toContain("approved");
    expect(USER_ONLY_TARGETS).toContain("posted");
  });
});
