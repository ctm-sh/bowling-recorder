import { describe, expect, it } from "vitest";
import { readSwipe, type SwipePoint } from "./swipe";

const H = 500;
/** (x, y) 점들을 일정한 간격(ms)으로 */
const path = (xy: [number, number][], every = 16): SwipePoint[] => xy.map(([x, y], i) => ({ x, y, t: i * every }));
const line = (x0: number, y0: number, x1: number, y1: number, n = 12, every = 16) =>
  path(
    Array.from({ length: n }, (_, i) => [x0 + ((x1 - x0) * i) / (n - 1), y0 + ((y1 - y0) * i) / (n - 1)]),
    every,
  );

describe("밀어 던지기", () => {
  it("짧게 밀거나 아래로 밀면 던지지 않는다", () => {
    expect(readSwipe(line(200, 400, 200, 380), H)).toBeNull();
    expect(readSwipe(line(200, 300, 200, 450), H)).toBeNull();
    expect(readSwipe([{ x: 0, y: 0, t: 0 }], H)).toBeNull();
  });

  it("똑바로 위로 밀면 가운데", () => {
    const s = readSwipe(line(200, 450, 200, 200), H)!;
    expect(s.aim).toBeCloseTo(0);
  });

  it("오른쪽으로 기울여 밀면 방향이 오른쪽", () => {
    expect(readSwipe(line(200, 450, 260, 200), H)!.aim).toBeGreaterThan(0.3);
    expect(readSwipe(line(200, 450, 140, 200), H)!.aim).toBeLessThan(-0.3);
  });

  it("빠르게 밀수록 세다", () => {
    const slow = readSwipe(line(200, 450, 200, 200, 12, 60), H)!;
    const fast = readSwipe(line(200, 450, 200, 200, 12, 8), H)!;
    expect(fast.power).toBeGreaterThan(slow.power);
    expect(fast.power).toBe(1);
    expect(slow.power).toBeLessThan(0.2);
  });

  it("떼는 순간 같은 자리에 찍힌 점 때문에 약해지지 않는다", () => {
    const moves = line(200, 450, 200, 200, 10, 12);
    const end = moves[moves.length - 1];
    const s = readSwipe([...moves, { ...end, t: end.t + 25 }], H)!;
    expect(s.power).toBe(1);
  });

  it("밀다가 멈춰서 한참 있다 떼면 약하다", () => {
    const moves = line(200, 450, 200, 200, 10, 12);
    const end = moves[moves.length - 1];
    const s = readSwipe([...moves, { ...end, t: end.t + 400 }], H)!;
    expect(s.power).toBeLessThan(0.2);
  });
});
