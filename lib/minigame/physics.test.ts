import { describe, expect, it } from "vitest";
import { knocked, launch, rack, simulate, step, wobble } from "./physics";

describe("미니게임 물리", () => {
  it("핀 10개를 삼각형으로 세운다", () => {
    const pins = rack();
    expect(pins).toHaveLength(10);
    expect(pins[0].x).toBe(0);
    expect(pins.slice(6).map((p) => p.id)).toEqual([7, 8, 9, 10]);
  });

  it("끝까지 옆으로 던지면 거터라 하나도 못 쓰러뜨린다", () => {
    const w = simulate({ aim: 1, hook: 0, power: 0.5 });
    expect(w.ball.gutter).toBe(true);
    expect(knocked(w)).toBe(0);
  });

  it("한가운데 직구는 핀을 여러 개 쓰러뜨린다", () => {
    expect(knocked(simulate({ aim: 0, hook: 0, power: 0.5 }))).toBeGreaterThanOrEqual(7);
  });

  it("오른쪽으로 휘면 공이 오른쪽으로 간다", () => {
    const run = (hook: number) => {
      const w = launch({ aim: 0, hook, power: 0.5 }, rack());
      while (w.ball.y < 18) step(w, 1 / 240);
      return w.ball.x;
    };
    expect(run(0.5)).toBeGreaterThan(0.1);
    expect(run(-0.5)).toBeLessThan(-0.1);
    expect(Math.abs(run(0))).toBeLessThan(0.001);
  });

  it("두 번째 투구는 서 있던 핀만 다시 세운다", () => {
    const first = simulate({ aim: 0.3, hook: 0, power: 0.5 });
    const left = first.pins.filter((p) => !p.down && !p.gone);
    const second = launch({ aim: 0, hook: 0, power: 0.5 }, first.pins);
    expect(second.pins.map((p) => p.id)).toEqual(left.map((p) => p.id));
  });

  it("흔들림은 범위를 넘지 않는다", () => {
    expect(wobble({ aim: 1, hook: -1, power: 1 }, () => 1)).toEqual({
      aim: 1,
      hook: -0.94,
      power: 1,
    });
    expect(wobble({ aim: 0, hook: 0, power: 0 }, () => 0)).toEqual({
      aim: -0.04,
      hook: -0.06,
      power: 0,
    });
  });
});
