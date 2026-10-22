import { describe, expect, it } from "vitest";
import { isCompleteScore, parseScore } from "./score";

describe("parseScore", () => {
  it("빈칸은 미입력(null)", () => {
    expect(parseScore("")).toEqual({ score: null });
    expect(parseScore("  ")).toEqual({ score: null });
  });

  it("0~300 정수", () => {
    expect(parseScore("0")).toEqual({ score: 0 });
    expect(parseScore("187")).toEqual({ score: 187 });
    expect(parseScore("300")).toEqual({ score: 300 });
  });

  it("300 초과, 문자, 소수, 음수는 에러", () => {
    expect(parseScore("301")).toHaveProperty("error");
    expect(parseScore("1a")).toHaveProperty("error");
    expect(parseScore("12.5")).toHaveProperty("error");
    expect(parseScore("-5")).toHaveProperty("error");
    expect(parseScore("1000")).toHaveProperty("error");
  });
});

describe("isCompleteScore (자동으로 다음 칸)", () => {
  it("3자리면 완료", () => {
    expect(isCompleteScore("187")).toBe(true);
    expect(isCompleteScore("100")).toBe(true);
  });

  it("두 자리라도 한 자리 더 붙이면 300을 넘으면 완료 (31~99)", () => {
    expect(isCompleteScore("31")).toBe(true);
    expect(isCompleteScore("98")).toBe(true);
  });

  it("더 입력될 수 있으면 아직 아님", () => {
    expect(isCompleteScore("1")).toBe(false);
    expect(isCompleteScore("25")).toBe(false);
    expect(isCompleteScore("30")).toBe(false);
    expect(isCompleteScore("")).toBe(false);
  });
});
