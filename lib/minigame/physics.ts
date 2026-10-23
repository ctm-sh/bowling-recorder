// 미니게임 물리: 위에서 내려다본 레인 (단위 m). x = 레인 가운데 0 기준 좌우, y = 파울라인 0에서 핀 쪽으로.
// 실제 규격을 따르되 재미를 위해 훅(휘는 힘)만 조금 과장했다.

export const LANE_WIDTH = 1.054;
export const GUTTER = 0.24;
/** 파울라인 ~ 1번 핀 */
export const LANE_LENGTH = 18.29;
const PIN_SPACING = 0.3048;
const ROW_GAP = PIN_SPACING * Math.cos(Math.PI / 6);
export const BALL_R = 0.109;
export const PIN_R = 0.06;
const FALLEN_R = 0.07;
const PIN_MASS = 1.5;
/** 기름이 끝나 공이 휘기 시작하는 구간 */
const HOOK_START = 9;
const HOOK_FULL = 13;
const HOOK_ACCEL = 0.9;
/** 핀이 쓰러지는 충격 속도 (m/s) */
const TOPPLE_SPEED = 0.25;
/** 핀 데크 끝 (넘어가면 핀이 피트로 떨어진다) */
export const PIT_Y = LANE_LENGTH + 3 * ROW_GAP + 0.35;
export const BALL_START_Y = 0.3;
/** 출발 위치 좌우 한계 (공이 레인 안에 있도록) */
export const MAX_START = LANE_WIDTH / 2 - BALL_R - 0.04;
/** 고를 수 있는 공 무게 (파운드) */
export const MIN_WEIGHT = 8;
export const MAX_WEIGHT = 16;

export type Pin = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  down: boolean;
  gone: boolean;
};
export type Ball = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gutter: boolean;
  gone: boolean;
  /** kg */
  mass: number;
};
export type Throw = {
  /** 출발 위치 (m, 레인 가운데 0). 없으면 가운데 */
  startX?: number;
  /** 공 무게 (파운드). 없으면 12 */
  weight?: number;
  /** 방향 -1 ~ 1 (왼쪽 ~ 오른쪽) */
  aim: number;
  /** 휘는 정도 -1 ~ 1 (왼쪽으로 ~ 오른쪽으로) */
  hook: number;
  /** 세기 0 ~ 1 */
  power: number;
};
export type World = { ball: Ball; pins: Pin[]; hook: number; time: number };

/** 방향 최대 각도 (라디안). 끝까지 돌리면 거의 거터로 간다 */
const MAX_AIM = (2.6 * Math.PI) / 180;

/** 1번 핀이 앞, 7~10번이 맨 뒤 줄 */
export function rack(): Pin[] {
  const pins: Pin[] = [];
  let id = 1;
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i <= row; i++) {
      pins.push({
        id: id++,
        x: (i - row / 2) * PIN_SPACING,
        y: LANE_LENGTH + row * ROW_GAP,
        vx: 0,
        vy: 0,
        down: false,
        gone: false,
      });
    }
  }
  return pins;
}

/** 무거운 공은 조금 느리게 나간다 */
export function ballSpeed(power: number, weight = 12) {
  return (5.5 + power * 4.5) * (1 - (weight - 12) * 0.02);
}

export function launch(t: Throw, pins: Pin[]): World {
  const weight = t.weight ?? 12;
  const speed = ballSpeed(t.power, weight);
  const angle = t.aim * MAX_AIM;
  return {
    ball: {
      x: Math.max(-MAX_START, Math.min(MAX_START, t.startX ?? 0)),
      mass: weight * 0.4536,
      y: BALL_START_Y,
      vx: speed * Math.sin(angle),
      vy: speed * Math.cos(angle),
      gutter: false,
      gone: false,
    },
    // 쓰러진 핀은 치우고, 서 있는 핀만 그 자리에 다시 둔다
    pins: pins.filter((p) => !p.down && !p.gone).map((p) => ({ ...p, vx: 0, vy: 0 })),
    hook: t.hook,
    time: 0,
  };
}

/** 겨냥 화살표 끝점 (휘기 전 직선 방향) */
export function aimPoint(aim: number, distance: number, startX = 0) {
  const angle = aim * MAX_AIM;
  return {
    x: startX + distance * Math.sin(angle),
    y: BALL_START_Y + distance * Math.cos(angle),
  };
}

function collide(
  a: { x: number; y: number; vx: number; vy: number },
  ra: number,
  ma: number,
  b: { x: number; y: number; vx: number; vy: number },
  rb: number,
  mb: number,
  restitution: number,
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const minDist = ra + rb;
  if (dist >= minDist || dist === 0) return 0;
  const nx = dx / dist;
  const ny = dy / dist;
  // 겹친 만큼 질량 비율로 밀어낸다
  const overlap = minDist - dist;
  const total = ma + mb;
  a.x -= nx * overlap * (mb / total);
  a.y -= ny * overlap * (mb / total);
  b.x += nx * overlap * (ma / total);
  b.y += ny * overlap * (ma / total);
  const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
  if (rel <= 0) return 0;
  const j = ((1 + restitution) * rel) / (1 / ma + 1 / mb);
  a.vx -= (j / ma) * nx;
  a.vy -= (j / ma) * ny;
  b.vx += (j / mb) * nx;
  b.vy += (j / mb) * ny;
  return rel;
}

const deckEdge = LANE_WIDTH / 2 + GUTTER;

/** dt초 진행. 공·핀 상태를 그 자리에서 바꾼다. */
export function step(w: World, dt: number) {
  const { ball, pins } = w;
  w.time += dt;

  if (!ball.gone) {
    if (!ball.gutter) {
      // 기름이 끝나는 구간부터 휜다. 느릴수록 더 휜다.
      const t = Math.min(1, Math.max(0, (ball.y - HOOK_START) / (HOOK_FULL - HOOK_START)));
      const slow = Math.sqrt(8 / Math.max(5, Math.hypot(ball.vx, ball.vy)));
      if (ball.y < LANE_LENGTH + 0.2) ball.vx += w.hook * HOOK_ACCEL * t * slow * dt;
    }
    ball.vy -= 0.12 * dt;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    if (!ball.gutter && Math.abs(ball.x) > LANE_WIDTH / 2 && ball.y < LANE_LENGTH - 0.15) {
      ball.gutter = true;
      ball.x = Math.sign(ball.x) * (LANE_WIDTH / 2 + GUTTER / 2);
      ball.vx = 0;
    }
    if (Math.abs(ball.x) > deckEdge - BALL_R) {
      ball.x = Math.sign(ball.x) * (deckEdge - BALL_R);
      ball.vx *= -0.3;
    }
    if (ball.y > PIT_Y + 0.3 || ball.vy <= 0) ball.gone = true;
  }

  for (const p of pins) {
    if (p.gone) continue;
    if (!ball.gone && !ball.gutter) {
      const hit = collide(ball, BALL_R, ball.mass, p, PIN_R, PIN_MASS, 0.75);
      if (hit > 0) p.down = true;
    }
  }
  for (let i = 0; i < pins.length; i++) {
    const a = pins[i];
    if (a.gone) continue;
    for (let j = i + 1; j < pins.length; j++) {
      const b = pins[j];
      if (b.gone) continue;
      // 쓰러진 핀은 길게 누워 구르므로 더 넓게 부딪힌다
      const hit = collide(a, a.down ? FALLEN_R : PIN_R, PIN_MASS, b, b.down ? FALLEN_R : PIN_R, PIN_MASS, 0.8);
      if (hit > TOPPLE_SPEED) {
        a.down = true;
        b.down = true;
      } else if (hit > 0) {
        // 살짝 스친 정도면 움직이던 쪽만 쓰러진 것으로 본다
        if (Math.hypot(a.vx, a.vy) > TOPPLE_SPEED) a.down = true;
        if (Math.hypot(b.vx, b.vy) > TOPPLE_SPEED) b.down = true;
      }
    }
  }
  for (const p of pins) {
    if (p.gone) continue;
    // 쓰러진 핀은 바닥에 끌리며 느려진다
    const damp = Math.exp(-(p.down ? 1.3 : 6) * dt);
    p.vx *= damp;
    p.vy *= damp;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    // 옆 벽에 튕긴다
    if (Math.abs(p.x) > deckEdge - PIN_R) {
      p.x = Math.sign(p.x) * (deckEdge - PIN_R);
      p.vx *= -0.6;
      p.down = true;
    }
    if (p.y > PIT_Y || p.y < LANE_LENGTH - 0.4) {
      p.gone = true;
      p.down = true;
    }
  }
}

/** 공이 지나갔고 핀이 거의 멈췄으면 끝 */
export function settled(w: World) {
  if (w.time > 7) return true;
  if (!w.ball.gone) return false;
  return w.pins.every((p) => p.gone || Math.hypot(p.vx, p.vy) < 0.1);
}

/** 이번 투구로 쓰러진 핀 수 */
export function knocked(w: World) {
  return w.pins.filter((p) => p.down || p.gone).length;
}

/** 화면 없이 끝까지 굴려 본다 (테스트용) */
export function simulate(t: Throw, pins: Pin[] = rack(), dt = 1 / 240) {
  const w = launch(t, pins);
  while (!settled(w)) step(w, dt);
  return w;
}

/** 사람 손처럼 매번 조금씩 흔들린다 (같은 설정이어도 결과가 조금 다르다) */
export function wobble(t: Throw, random: () => number = Math.random): Throw {
  const noise = (size: number) => (random() * 2 - 1) * size;
  const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
  return {
    aim: clamp(t.aim + noise(0.04), -1, 1),
    hook: clamp(t.hook + noise(0.06), -1, 1),
    power: clamp(t.power + noise(0.04), 0, 1),
  };
}
