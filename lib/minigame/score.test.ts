import { describe, expect, it } from "vitest";
import { finalScore, gameState } from "./score";

const lastTotal = (rolls: number[]) => gameState(rolls).frames.at(-1)?.total;

describe("미니게임 점수", () => {
  it("퍼펙트 게임은 300", () => {
    const s = gameState(Array(12).fill(10));
    expect(s.over).toBe(true);
    expect(s.frames[9].total).toBe(300);
    expect(s.frames[9].marks).toEqual(["X", "X", "X"]);
  });

  it("전부 거터는 0, 20구에서 끝", () => {
    expect(gameState(Array(19).fill(0)).over).toBe(false);
    const s = gameState(Array(20).fill(0));
    expect(s.over).toBe(true);
    expect(s.frames[0].marks).toEqual(["-", "-"]);
    expect(lastTotal(Array(20).fill(0))).toBe(0);
  });

  it("전부 5-5 스페어 + 마지막 5는 150", () => {
    const s = gameState(Array(21).fill(5));
    expect(s.over).toBe(true);
    expect(s.frames[9].total).toBe(150);
    expect(s.frames[0].marks).toEqual(["5", "/"]);
  });

  it("스트라이크 보너스가 정해지기 전에는 누적 점수를 비운다", () => {
    const s = gameState([10, 3]);
    expect(s.frames[0].total).toBeNull();
    expect(s.frames[1].total).toBeNull();
    expect(s.frameIndex).toBe(1);
    expect(s.freshRack).toBe(false);
    expect(gameState([10, 3, 4]).frames.map((f) => f.total)).toEqual([17, 24]);
  });

  it("프레임 첫 구 전에는 핀을 새로 세운다", () => {
    expect(gameState([]).freshRack).toBe(true);
    expect(gameState([3, 4]).freshRack).toBe(true);
    expect(gameState([3]).freshRack).toBe(false);
  });

  it("10프레임: 첫 구 스트라이크면 다시 세우고, 2구가 남으면 그대로", () => {
    const nine = Array(18).fill(0);
    expect(gameState([...nine, 10]).freshRack).toBe(true);
    expect(gameState([...nine, 10, 3]).freshRack).toBe(false);
    expect(gameState([...nine, 10, 3]).over).toBe(false);
    const s = gameState([...nine, 10, 3, 7]);
    expect(s.over).toBe(true);
    expect(s.frames[9].marks).toEqual(["X", "3", "/"]);
    expect(s.frames[9].total).toBe(20);
  });

  it("10프레임: 오픈이면 2구로 끝", () => {
    const s = gameState([...Array(18).fill(0), 4, 5]);
    expect(s.over).toBe(true);
    expect(s.frames[9].total).toBe(9);
  });
});

describe("랭킹에 올릴 점수 확인", () => {
  it("끝까지 친 정상 게임은 점수를 돌려준다", () => {
    expect(finalScore(Array(12).fill(10))).toBe(300);
    expect(finalScore(Array(21).fill(5))).toBe(150);
    expect(finalScore([...Array(18).fill(0), 10, 3, 7])).toBe(20);
  });

  it("덜 끝났거나, 더 쳤거나, 말이 안 되는 기록은 거절한다", () => {
    expect(finalScore(Array(11).fill(10))).toBeNull();
    expect(finalScore(Array(13).fill(10))).toBeNull();
    expect(finalScore([7, 7, ...Array(18).fill(0)])).toBeNull();
    expect(finalScore([...Array(18).fill(0), 10, 3, 8])).toBeNull();
    expect(finalScore([11, ...Array(19).fill(0)])).toBeNull();
    expect(finalScore([1.5, ...Array(19).fill(0)])).toBeNull();
  });
});
