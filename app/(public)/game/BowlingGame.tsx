"use client";

import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BottomBar } from "@/components/Flow";
import { Icon } from "@/components/Icon";
import { primaryButton } from "@/components/ui";
import {
  BALL_R,
  BALL_START_Y,
  GUTTER,
  LANE_LENGTH,
  LANE_WIDTH,
  MAX_START,
  MAX_WEIGHT,
  MIN_WEIGHT,
  PIT_Y,
  aimPoint,
  ballSpeed,
  knocked,
  launch,
  rack,
  settled,
  step,
  type Ball,
  type Pin,
  type World,
} from "@/lib/minigame/physics";
import { gameState } from "@/lib/minigame/score";

const STEP = 1 / 240;
const BEST_KEY = "ttegul-minigame-best";

// 이 기기의 최고 점수 (localStorage). 막혀 있으면 그냥 없는 것으로 본다.
function readBest() {
  try {
    const v = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}
const bestListeners = new Set<() => void>();
function saveBest(score: number) {
  try {
    if (score > (readBest() ?? -1)) localStorage.setItem(BEST_KEY, String(score));
  } catch {}
  bestListeners.forEach((l) => l());
}
function subscribeBest(l: () => void) {
  bestListeners.add(l);
  return () => bestListeners.delete(l);
}

/** 한 번 던지기: 위치 → 방향 → 세기 → 회전 순서로 탭해서 멈춘다 */
type Phase = "position" | "aim" | "power" | "spin" | "rolling" | "over";
const STEPS: { key: Phase; label: string }[] = [
  { key: "position", label: "위치" },
  { key: "aim", label: "방향" },
  { key: "power", label: "세기" },
  { key: "spin", label: "회전" },
];
/** 게이지 한 번 왕복 시간 (초) */
const PERIOD = { aim: 2.2, power: 1.6, spin: 2 };

const BALLS = [
  { name: "파랑", light: "#5b8cff", dark: "#0c2a7a", swirl: "rgba(200, 225, 255, 0.55)" },
  { name: "빨강", light: "#ff6b6b", dark: "#7a0c18", swirl: "rgba(255, 210, 160, 0.5)" },
  { name: "검정", light: "#6b6f78", dark: "#0b0c0f", swirl: "rgba(255, 255, 255, 0.22)" },
  { name: "보라", light: "#b07cff", dark: "#3b0f7a", swirl: "rgba(255, 190, 240, 0.5)" },
  { name: "초록", light: "#4fd18b", dark: "#0b5a33", swirl: "rgba(230, 255, 200, 0.5)" },
];
type BallStyle = (typeof BALLS)[number];

/** 0 → 1 → 0 을 period초마다 반복 */
function tri(seconds: number, period: number) {
  const p = (seconds / period) % 1;
  return p < 0.5 ? p * 2 : 2 - p * 2;
}

// ── 카메라: 볼러 뒤에서 레인을 내려다본다. 굴러가면 공을 따라간다. ──
const CAM_START = -2.3;
const CAM_END = LANE_LENGTH - 4;
const CAM_H = 0.92;
const NEAR = 0.35;
const EDGE = LANE_WIDTH / 2;

type Cam = { y: number; f: number; cx: number; horizon: number; width: number; height: number };

function project(c: Cam, x: number, y: number, h = 0) {
  const d = Math.max(NEAR, y - c.y);
  return { x: c.cx + (c.f * x) / d, y: c.horizon + (c.f * (CAM_H - h)) / d, k: c.f / d };
}

/** 바닥(또는 높이 h)에 놓인 사각형 */
function quad(
  ctx: CanvasRenderingContext2D,
  c: Cam,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  fill: string | CanvasGradient,
  h = 0,
) {
  const near = Math.max(y0, c.y + NEAR);
  if (y1 <= near) return;
  const a = project(c, x0, near, h);
  const b = project(c, x1, near, h);
  const e = project(c, x1, y1, h);
  const d = project(c, x0, y1, h);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(e.x, e.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.fill();
}

/** 세워진 벽 (x 고정, y0~y1, 높이 h0~h1) */
function wall(ctx: CanvasRenderingContext2D, c: Cam, x: number, y0: number, y1: number, h1: number, fill: string) {
  const near = Math.max(y0, c.y + NEAR);
  if (y1 <= near) return;
  const pts = [project(c, x, near, 0), project(c, x, y1, 0), project(c, x, y1, h1), project(c, x, near, h1)];
  ctx.fillStyle = fill;
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fill();
}

function drawLane(ctx: CanvasRenderingContext2D, c: Cam) {
  const { width, height, horizon } = c;
  // 천장·뒤 벽
  const sky = ctx.createLinearGradient(0, 0, 0, horizon + 20);
  sky.addColorStop(0, "#0e1017");
  sky.addColorStop(1, "#262a36");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const far = PIT_Y + 0.6;
  // 옆 레인들 (바닥)
  quad(ctx, c, -6, 6, -3, far, "#b48a55");
  for (const side of [-1, 1]) {
    const inner = EDGE + GUTTER + 0.22;
    const x0 = side < 0 ? -inner - LANE_WIDTH : inner;
    quad(ctx, c, x0, x0 + LANE_WIDTH, -3, LANE_LENGTH + 0.95, "#d9b47c");
    const g0 = side < 0 ? x0 - GUTTER : x0 + LANE_WIDTH;
    quad(ctx, c, g0, g0 + GUTTER, -3, far, "#80868f");
    // 공 받침대(캐핑)
    const cap0 = side < 0 ? -inner : EDGE + GUTTER;
    quad(ctx, c, cap0, cap0 + 0.22, -3, far, "#aeb4bd", 0.03);
    quad(ctx, c, cap0 + 0.08, cap0 + 0.14, -3, far, "#e8ecf1", 0.031);
  }
  // 거터 (안쪽이 더 어둡게)
  for (const side of [-1, 1]) {
    const g0 = side < 0 ? -EDGE - GUTTER : EDGE;
    quad(ctx, c, g0, g0 + GUTTER, -3, far, "#8b9199");
    quad(ctx, c, g0 + GUTTER * 0.25, g0 + GUTTER * 0.75, -3, far, "#6c727b");
  }
  // 레인 나무
  const nearY = project(c, 0, c.y + NEAR).y;
  const farY = project(c, 0, LANE_LENGTH + 0.95).y;
  const wood = ctx.createLinearGradient(0, nearY, 0, farY);
  wood.addColorStop(0, "#d6ad74");
  wood.addColorStop(0.5, "#e8c792");
  wood.addColorStop(1, "#f6e2bb");
  quad(ctx, c, -EDGE, EDGE, -3, LANE_LENGTH + 0.95, wood);
  // 기름 반사광
  quad(ctx, c, -EDGE * 0.7, EDGE * 0.7, 2, 11, "rgba(255, 255, 255, 0.10)");
  // 핀 데크
  quad(ctx, c, -EDGE, EDGE, LANE_LENGTH - 0.35, LANE_LENGTH + 0.95, "rgba(255, 248, 230, 0.45)");
  // 판자 줄
  ctx.strokeStyle = "rgba(110, 70, 25, 0.13)";
  ctx.lineWidth = 1;
  const y0 = Math.max(-3, c.y + NEAR);
  for (let b = 1; b < 39; b++) {
    const x = -EDGE + (b * LANE_WIDTH) / 39;
    const a = project(c, x, y0);
    const e = project(c, x, LANE_LENGTH + 0.95);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(e.x, e.y);
    ctx.stroke();
  }
  // 파울라인
  quad(ctx, c, -EDGE, EDGE, -0.015, 0.015, "#c0392b");
  // 스팟 점 + 화살표
  ctx.fillStyle = "rgba(70, 40, 15, 0.6)";
  for (let i = 0; i < 7; i++) {
    const x = -EDGE + ((5 + i * 5) * LANE_WIDTH) / 39;
    const y = 3.7 + (3 - Math.abs(i - 3)) * 0.3;
    if (y - c.y < NEAR + 0.3) continue;
    const tip = project(c, x, y + 0.3);
    const l = project(c, x - 0.025, y);
    const r = project(c, x + 0.025, y);
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(l.x, l.y);
    ctx.lineTo(r.x, r.y);
    ctx.closePath();
    ctx.fill();
  }
  // 피트(검은 구덩이)와 양옆 벽
  quad(ctx, c, -EDGE - GUTTER, EDGE + GUTTER, LANE_LENGTH + 0.95, far, "#07080a");
  for (const side of [-1, 1]) {
    wall(ctx, c, side * (EDGE + GUTTER), LANE_LENGTH - 0.6, far, 0.55, "#2b2f38");
  }
  // 뒤 가림막 (떼굴 로고)
  const bl = project(c, -EDGE - GUTTER - 0.3, far, 0.55);
  const tr = project(c, EDGE + GUTTER + 0.3, far, 1.5);
  ctx.fillStyle = "#151821";
  ctx.fillRect(bl.x, tr.y, tr.x - bl.x, bl.y - tr.y);
  ctx.fillStyle = "#0071e3";
  ctx.fillRect(bl.x, bl.y - 2, tr.x - bl.x, 2);
  const k = project(c, 0, far).k;
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.font = `700 ${Math.min(18, Math.max(7, k * 0.32))}px Inter, "Noto Sans KR", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("떼굴 BOWLING", (bl.x + tr.x) / 2, (bl.y + tr.y) / 2);
}

/** 서 있는 핀 (실루엣) */
function drawPin(ctx: CanvasRenderingContext2D, x: number, y: number, k: number) {
  const s = k;
  // 그림자
  ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
  ctx.beginPath();
  ctx.ellipse(x + 0.02 * s, y, 0.075 * s, 0.022 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // 아래에서 위로: 바닥 0.05 → 배 0.121(높이 0.11) → 목 0.046(0.245) → 머리 0.064(0.33) → 꼭대기 0.381
  const half = (w: number) => (w / 2) * s;
  const at = (h: number) => y - h * s;
  ctx.beginPath();
  ctx.moveTo(x - half(0.05), at(0));
  ctx.quadraticCurveTo(x - half(0.13), at(0.06), x - half(0.121), at(0.12));
  ctx.quadraticCurveTo(x - half(0.11), at(0.2), x - half(0.046), at(0.245));
  ctx.quadraticCurveTo(x - half(0.07), at(0.3), x - half(0.064), at(0.33));
  ctx.quadraticCurveTo(x - half(0.06), at(0.381), x, at(0.381));
  ctx.quadraticCurveTo(x + half(0.06), at(0.381), x + half(0.064), at(0.33));
  ctx.quadraticCurveTo(x + half(0.07), at(0.3), x + half(0.046), at(0.245));
  ctx.quadraticCurveTo(x + half(0.11), at(0.2), x + half(0.121), at(0.12));
  ctx.quadraticCurveTo(x + half(0.13), at(0.06), x + half(0.05), at(0));
  ctx.closePath();
  const g = ctx.createLinearGradient(x - half(0.121), 0, x + half(0.121), 0);
  g.addColorStop(0, "#d9dce2");
  g.addColorStop(0.35, "#ffffff");
  g.addColorStop(1, "#c4c8cf");
  ctx.fillStyle = g;
  ctx.fill();
  // 목의 빨간 줄 두 개
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "#e0353b";
  ctx.fillRect(x - half(0.13), at(0.262), 0.13 * s, 0.011 * s);
  ctx.fillRect(x - half(0.13), at(0.236), 0.13 * s, 0.011 * s);
  ctx.restore();
}

/** 쓰러진 핀: 바닥에 누운 막대 (angle은 바닥 기준 방향) */
function drawFallen(ctx: CanvasRenderingContext2D, c: Cam, x: number, y: number, angle: number) {
  const len = 0.36;
  const hx = x + Math.cos(angle) * len;
  const hy = y + Math.sin(angle) * len;
  if (Math.min(y, hy) - c.y < NEAR) return;
  const base = project(c, x, y, 0.055);
  const head = project(c, hx, hy, 0.04);
  const k = (base.k + head.k) / 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
  ctx.lineWidth = 0.11 * k;
  ctx.beginPath();
  ctx.moveTo(base.x + 2, base.y + 0.05 * k);
  ctx.lineTo(head.x + 2, head.y + 0.05 * k);
  ctx.stroke();
  ctx.strokeStyle = "#f2f3f5";
  ctx.lineWidth = 0.1 * k;
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.lineTo(head.x, head.y);
  ctx.stroke();
  // 목 줄
  const mx = base.x + (head.x - base.x) * 0.66;
  const my = base.y + (head.y - base.y) * 0.66;
  const nx = base.x + (head.x - base.x) * 0.72;
  const ny = base.y + (head.y - base.y) * 0.72;
  ctx.strokeStyle = "#e0353b";
  ctx.lineCap = "butt";
  ctx.lineWidth = 0.075 * k;
  ctx.beginPath();
  ctx.moveTo(mx, my);
  ctx.lineTo(nx, ny);
  ctx.stroke();
}

function drawBall(ctx: CanvasRenderingContext2D, c: Cam, ball: Pick<Ball, "x" | "y">, style: BallStyle, roll: number) {
  if (ball.y - c.y < NEAR + BALL_R) return;
  const ground = project(c, ball.x, ball.y);
  const p = project(c, ball.x, ball.y, BALL_R);
  const r = BALL_R * p.k;
  ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
  ctx.beginPath();
  ctx.ellipse(ground.x + r * 0.15, ground.y, r * 1.05, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  const g = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.4, r * 0.1, p.x, p.y, r);
  g.addColorStop(0, style.light);
  g.addColorStop(1, style.dark);
  ctx.save();
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  // 소용돌이 무늬가 구르면서 위로 넘어간다
  ctx.strokeStyle = style.swirl;
  ctx.lineWidth = r * 0.16;
  for (let i = 0; i < 3; i++) {
    const t = roll + i * 2.1;
    ctx.beginPath();
    ctx.ellipse(
      p.x + Math.cos(t * 0.7) * r * 0.35,
      p.y + Math.sin(t) * r * 0.75,
      r * 0.75,
      r * 0.22,
      t * 0.4,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }
  // 손가락 구멍 (앞쪽에 있을 때만 보인다)
  const front = Math.cos(roll);
  if (front > 0) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    const cy = p.y + Math.sin(roll) * r * 0.55;
    for (const [dx, dy, size] of [
      [-0.16, -0.12, 0.1],
      [0.16, -0.12, 0.1],
      [0, 0.2, 0.12],
    ]) {
      ctx.beginPath();
      ctx.ellipse(p.x + dx * r, cy + dy * r * front, size * r, size * r * front, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  // 반짝임
  ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
  ctx.beginPath();
  ctx.ellipse(p.x - r * 0.38, p.y - r * 0.45, r * 0.22, r * 0.13, -0.6, 0, Math.PI * 2);
  ctx.fill();
}

/** 바닥에 그린 겨냥 화살표 */
function drawArrow(ctx: CanvasRenderingContext2D, c: Cam, startX: number, aim: number, color: string) {
  const from = aimPoint(aim, 0.45, startX);
  const to = aimPoint(aim, 4.2, startX);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const px = uy;
  const py = -ux;
  const shaft = 0.035;
  const head = 0.11;
  const neck = 0.6;
  const pts: [number, number][] = [
    [from.x + px * shaft, from.y + py * shaft],
    [to.x - ux * neck + px * shaft, to.y - uy * neck + py * shaft],
    [to.x - ux * neck + px * head, to.y - uy * neck + py * head],
    [to.x, to.y],
    [to.x - ux * neck - px * head, to.y - uy * neck - py * head],
    [to.x - ux * neck - px * shaft, to.y - uy * neck - py * shaft],
    [from.x - px * shaft, from.y - py * shaft],
  ];
  ctx.fillStyle = color;
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    const p = project(c, x, y, 0.005);
    if (i) ctx.lineTo(p.x, p.y);
    else ctx.moveTo(p.x, p.y);
  });
  ctx.closePath();
  ctx.fill();
}

/** 왼쪽 위 핀 표시 (서 있는 핀은 흰색) */
function drawPinMap(ctx: CanvasRenderingContext2D, standing: Set<number>) {
  const rows = [[7, 8, 9, 10], [4, 5, 6], [2, 3], [1]];
  const r = 8.5;
  const gap = 20;
  rows.forEach((row, ri) => {
    row.forEach((id, i) => {
      const x = 14 + r + ri * (gap / 2) + i * gap;
      const y = 14 + r + ri * (gap * 0.85);
      const up = standing.has(id);
      ctx.fillStyle = up ? "#ffffff" : "rgba(255, 255, 255, 0.14)";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = up ? "#1d1d1f" : "rgba(255, 255, 255, 0.35)";
      ctx.font = `700 10px Inter, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(id), x, y + 0.5);
    });
  });
}

function roundBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** 오른쪽 세로 세기 게이지 */
function drawPowerGauge(ctx: CanvasRenderingContext2D, c: Cam, value: number, active: boolean) {
  const w = 16;
  const x = c.width - w - 14;
  const top = 64;
  const h = c.height * 0.5;
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  roundBox(ctx, x - 4, top - 4, w + 8, h + 8, 12);
  ctx.fill();
  const g = ctx.createLinearGradient(0, top + h, 0, top);
  g.addColorStop(0, "#34c759");
  g.addColorStop(0.55, "#ffcc00");
  g.addColorStop(1, "#ff3b30");
  ctx.fillStyle = g;
  roundBox(ctx, x, top + h * (1 - value), w, h * value, 8);
  ctx.fill();
  ctx.fillStyle = active ? "#ffffff" : "rgba(255, 255, 255, 0.7)";
  ctx.font = `700 11px "Noto Sans KR", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("세기", x + w / 2, top + h + 10);
}

/** 위쪽 가로 회전 게이지 (-1 왼쪽 ~ 1 오른쪽) */
function drawSpinGauge(ctx: CanvasRenderingContext2D, c: Cam, value: number, active: boolean) {
  const x0 = c.width * 0.46;
  const x1 = c.width - 16;
  const y = 30;
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  roundBox(ctx, x0 - 6, y - 14, x1 - x0 + 12, 28, 14);
  ctx.fill();
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  g.addColorStop(0, "#5ac8fa");
  g.addColorStop(0.5, "rgba(255, 255, 255, 0.5)");
  g.addColorStop(1, "#ff9f0a");
  ctx.fillStyle = g;
  roundBox(ctx, x0, y - 3, x1 - x0, 6, 3);
  ctx.fill();
  const mx = x0 + ((value + 1) / 2) * (x1 - x0);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(mx, y, active ? 8 : 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.font = `700 10px "Noto Sans KR", sans-serif`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText("← 왼쪽으로", x0, y + 16);
  ctx.textAlign = "right";
  ctx.fillText("오른쪽으로 →", x1, y + 16);
}

export function BowlingGame() {
  const [rolls, setRolls] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>("position");
  const [message, setMessage] = useState<string>();
  const [weight, setWeight] = useState(12);
  const [ballIndex, setBallIndex] = useState(0);
  const best = useSyncExternalStore(subscribeBest, readBest, () => null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pinsRef = useRef<Pin[]>(rack());
  const worldRef = useRef<World | null>(null);
  const rollsRef = useRef<number[]>([]);
  const phaseRef = useRef<Phase>("position");
  const phaseStartRef = useRef(0);
  const startXRef = useRef(0);
  const aimRef = useRef(0);
  const powerRef = useRef(0);
  const spinRef = useRef(0);
  const ballStyleRef = useRef<BallStyle>(BALLS[0]);
  const weightRef = useRef(12);
  const fallenRef = useRef(new Map<number, { angle: number; spin: number }>());
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    ballStyleRef.current = BALLS[ballIndex];
    weightRef.current = weight;
  }, [ballIndex, weight]);

  function go(next: Phase) {
    phaseRef.current = next;
    phaseStartRef.current = performance.now();
    setPhase(next);
  }

  /** 지금 단계의 게이지를 멈추고 다음 단계로 (마지막이면 공을 굴린다) */
  function lock() {
    const now = performance.now();
    const t = (now - phaseStartRef.current) / 1000;
    switch (phaseRef.current) {
      case "position":
        go("aim");
        break;
      case "aim":
        aimRef.current = tri(t, PERIOD.aim) * 2 - 1;
        go("power");
        break;
      case "power":
        powerRef.current = tri(t, PERIOD.power);
        go("spin");
        break;
      case "spin":
        spinRef.current = tri(t, PERIOD.spin) * 2 - 1;
        worldRef.current = launch(
          {
            startX: startXRef.current,
            aim: aimRef.current,
            hook: spinRef.current,
            power: powerRef.current,
            weight: weightRef.current,
          },
          pinsRef.current,
        );
        setMessage(undefined);
        go("rolling");
        break;
    }
  }
  const lockRef = useRef(lock);
  useEffect(() => {
    lockRef.current = lock;
  });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext("2d")!;
    const cam: Cam = { y: CAM_START, f: 0, cx: 0, horizon: 0, width: 0, height: 0 };
    const resize = () => {
      const width = wrap.clientWidth;
      const height = Math.round(Math.min(Math.max(width * 1.2, 380), 540));
      Object.assign(cam, { width, height, cx: width / 2, f: width * 2, horizon: height * 0.3 });
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

    // 위치 단계: 레인을 좌우로 끌어 출발 위치를 정한다
    let dragging = false;
    const toWorldX = (clientX: number) => {
      const rect = canvas.getBoundingClientRect();
      const d = BALL_START_Y - cam.y;
      return ((clientX - rect.left - cam.cx) * d) / cam.f;
    };
    const onDown = (e: PointerEvent) => {
      if (phaseRef.current === "position") {
        dragging = true;
        canvas.setPointerCapture(e.pointerId);
        startXRef.current = Math.max(-MAX_START, Math.min(MAX_START, toWorldX(e.clientX)));
      } else if (phaseRef.current === "aim" || phaseRef.current === "power" || phaseRef.current === "spin") {
        lockRef.current();
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging || phaseRef.current !== "position") return;
      startXRef.current = Math.max(-MAX_START, Math.min(MAX_START, toWorldX(e.clientX)));
    };
    const onUp = () => {
      dragging = false;
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    function finish(w: World) {
      const startedWith = w.pins.length;
      const n = knocked(w);
      const next = [...rollsRef.current, n];
      rollsRef.current = next;
      setRolls(next);
      setMessage(
        startedWith === 10 && n === 10
          ? "스트라이크!"
          : n === startedWith && n > 0
            ? "스페어!"
            : w.ball.gutter
              ? "거터…"
              : n === 0
                ? "하나도 못 맞혔어요"
                : `${n}개`,
      );
      const state = gameState(next);
      timerRef.current = setTimeout(() => {
        fallenRef.current.clear();
        worldRef.current = null;
        if (state.over) {
          pinsRef.current = w.pins;
          saveBest(state.frames[9].total ?? 0);
          setMessage(undefined);
          go("over");
          return;
        }
        pinsRef.current = state.freshRack ? rack() : w.pins.filter((p) => !p.down && !p.gone);
        setMessage(undefined);
        go("position");
      }, 1400);
    }

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    // 투구마다 따로 끝났는지 본다 (끝나자마자 다음 공을 굴려도 멈추지 않게)
    let finished: World | null = null;
    let running: World | null = null;
    let roll = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const w = worldRef.current;
      const phase = phaseRef.current;
      const t = (now - phaseStartRef.current) / 1000;

      if (w) {
        if (w !== running) {
          running = w;
          acc = 0;
        }
        if (finished !== w) {
          // 공이 지나간 뒤 핀이 굴러다니는 동안은 빨리 감는다
          acc += w.ball.gone ? dt * 3 : dt;
          while (acc >= STEP) {
            step(w, STEP);
            acc -= STEP;
          }
          if (settled(w)) {
            finished = w;
            finish(w);
          }
        }
        if (!w.ball.gone) roll += (Math.hypot(w.ball.vx, w.ball.vy) * dt) / BALL_R;
      }

      // 카메라: 굴러가면 공을 따라가고, 다음 투구 때는 볼러 자리로 돌아온다
      const target = w ? Math.min(CAM_END, Math.max(CAM_START, w.ball.y - 2.4)) : CAM_START;
      cam.y += (target - cam.y) * Math.min(1, dt * (w ? 6 : 3));

      const pins = w ? w.pins : pinsRef.current;
      drawLane(ctx, cam);

      // 먼 것부터 그린다
      const ball = w ? w.ball : { x: startXRef.current, y: BALL_START_Y };
      const items: { y: number; draw: () => void }[] = [];
      for (const p of pins) {
        if (p.gone || p.y - cam.y < NEAR) continue;
        if (p.down) {
          let f = fallenRef.current.get(p.id);
          if (!f) {
            f = { angle: Math.atan2(p.vy, p.vx), spin: (Math.random() - 0.5) * 10 };
            fallenRef.current.set(p.id, f);
          }
          const speed = Math.hypot(p.vx, p.vy);
          f.angle += f.spin * dt * Math.min(1, speed);
          const angle = f.angle;
          items.push({ y: p.y, draw: () => drawFallen(ctx, cam, p.x, p.y, angle) });
        } else {
          items.push({
            y: p.y,
            draw: () => {
              const g = project(cam, p.x, p.y);
              drawPin(ctx, g.x, g.y, g.k);
            },
          });
        }
      }
      if (!(w && (w.ball.gone || w.ball.y > PIT_Y))) {
        const style = ballStyleRef.current;
        items.push({ y: ball.y, draw: () => drawBall(ctx, cam, ball, style, roll) });
      }
      // 겨냥 화살표는 공보다 먼저(아래에) 그린다
      if (phase === "aim" || phase === "power" || phase === "spin") {
        const aim = phase === "aim" ? tri(t, PERIOD.aim) * 2 - 1 : aimRef.current;
        drawArrow(
          ctx,
          cam,
          startXRef.current,
          aim,
          phase === "aim" ? "rgba(255, 204, 0, 0.9)" : "rgba(255, 204, 0, 0.55)",
        );
      }
      items.sort((a, b) => b.y - a.y).forEach((i) => i.draw());

      // 위치 단계: 공 양옆 화살표
      if (phase === "position") {
        const p = project(cam, startXRef.current, BALL_START_Y, BALL_R);
        const r = BALL_R * p.k;
        const pulse = 4 * Math.sin(now / 200);
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        for (const side of [-1, 1]) {
          const x = p.x + side * (r + 16 + pulse);
          ctx.beginPath();
          ctx.moveTo(x + side * 10, p.y);
          ctx.lineTo(x, p.y - 9);
          ctx.lineTo(x, p.y + 9);
          ctx.closePath();
          ctx.fill();
        }
      }

      const standing = new Set(pins.filter((p) => !p.down && !p.gone).map((p) => p.id));
      drawPinMap(ctx, standing);
      if (phase === "power" || phase === "spin") {
        drawPowerGauge(ctx, cam, phase === "power" ? tri(t, PERIOD.power) : powerRef.current, phase === "power");
      }
      if (phase === "spin") drawSpinGauge(ctx, cam, tri(t, PERIOD.spin) * 2 - 1, true);

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      clearTimeout(timerRef.current);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
  }, []);

  function restart() {
    clearTimeout(timerRef.current);
    rollsRef.current = [];
    pinsRef.current = rack();
    worldRef.current = null;
    fallenRef.current.clear();
    setRolls([]);
    setMessage(undefined);
    go("position");
  }

  const state = gameState(rolls);
  const total = [...state.frames].reverse().find((f) => f.total !== null)?.total ?? 0;
  const choosing = phase === "position";
  const stepIndex = STEPS.findIndex((s) => s.key === phase);

  return (
    <div className="flex flex-col gap-3 px-5 pt-4">
      <ScoreSheet frames={state.frames} current={state.over ? -1 : state.frameIndex} />

      <div ref={wrapRef} className="relative overflow-hidden rounded-2xl bg-black">
        <canvas
          ref={canvasRef}
          className="block w-full touch-none select-none"
          aria-label="볼링 레인. 위치를 끌어서 정하고, 화면을 눌러 방향·세기·회전을 멈추세요"
          role="img"
        />
        {message && (
          <div className="pointer-events-none absolute inset-x-0 top-[34%] flex justify-center">
            <span className="rounded-full bg-black/70 px-6 py-2.5 text-2xl font-bold text-white">{message}</span>
          </div>
        )}
        <div className="pointer-events-none absolute right-3 bottom-2 text-right text-xs font-semibold text-white/75">
          {state.over ? "게임 끝" : `${state.frameIndex + 1}프레임`}
          {best !== null && <div>최고 {best}</div>}
        </div>
      </div>

      {/* 단계 표시 */}
      <ol className="flex items-center justify-center gap-1.5 text-[13px]">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-muted">›</span>}
            <span
              className={`rounded-full px-2.5 py-1 ${
                s.key === phase
                  ? "bg-foreground font-semibold text-white"
                  : stepIndex > i || phase === "rolling"
                    ? "text-foreground"
                    : "text-muted"
              }`}
            >
              {i + 1} {s.label}
            </span>
          </li>
        ))}
      </ol>
      <p className="min-h-10 px-1 text-center text-[13px] leading-[1.5] text-muted">
        {phase === "position" && "레인을 좌우로 끌어 공을 놓을 자리를 정하세요. 무거운 공은 느리지만 핀을 세게 쳐요."}
        {phase === "aim" && "노란 화살표가 원하는 방향을 가리킬 때 화면을 누르세요."}
        {phase === "power" && "오른쪽 게이지가 원하는 만큼 찼을 때 누르세요. 약할수록 더 휘어요."}
        {phase === "spin" && "위쪽 점이 원하는 쪽에 왔을 때 누르면 공이 굴러가요. 휘는 건 레인 뒤쪽부터예요."}
        {phase === "rolling" && "굴러가는 중…"}
        {phase === "over" && "수고했어요! 한 판 더 해볼까요?"}
      </p>

      {/* 공 고르기 (위치 단계에서만) */}
      <div className="grid grid-cols-2 gap-2.5">
        <Chooser
          label="공 무게"
          value={`${weight}파운드`}
          disabled={!choosing}
          onPrev={() => setWeight((w) => Math.max(MIN_WEIGHT, w - 1))}
          onNext={() => setWeight((w) => Math.min(MAX_WEIGHT, w + 1))}
          note={`${Math.round(ballSpeed(0.7, weight) * 3.6)}km/h 정도`}
        />
        <Chooser
          label="공 색"
          value={
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block size-4 rounded-full"
                style={{
                  background: `radial-gradient(circle at 35% 30%, ${BALLS[ballIndex].light}, ${BALLS[ballIndex].dark})`,
                }}
              />
              {BALLS[ballIndex].name}
            </span>
          }
          disabled={!choosing}
          onPrev={() => setBallIndex((i) => (i + BALLS.length - 1) % BALLS.length)}
          onNext={() => setBallIndex((i) => (i + 1) % BALLS.length)}
          note="색만 달라요"
        />
      </div>

      <BottomBar>
        {phase === "over" ? (
          <>
            <div className="text-center text-[15px]">
              최종 <span className="text-xl font-bold">{total}</span>점
              {best !== null && total >= best && total > 0 ? " · 이 기기 최고 기록!" : ""}
            </div>
            <button type="button" onClick={restart} className={primaryButton}>
              새 게임
            </button>
          </>
        ) : (
          <button type="button" onClick={lock} disabled={phase === "rolling"} className={primaryButton}>
            {phase === "position" && "이 자리에서 던지기"}
            {phase === "aim" && "방향 멈추기"}
            {phase === "power" && "세기 멈추기"}
            {phase === "spin" && "회전 멈추고 굴리기"}
            {phase === "rolling" && "굴러가는 중…"}
          </button>
        )}
      </BottomBar>
    </div>
  );
}

function Chooser({
  label,
  value,
  note,
  disabled,
  onPrev,
  onNext,
}: {
  label: string;
  value: ReactNode;
  note: string;
  disabled: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const arrow =
    "flex size-11 shrink-0 items-center justify-center rounded-full text-link active:bg-fill disabled:text-muted disabled:opacity-40";
  return (
    <div className={`flex flex-col gap-0.5 rounded-2xl bg-surface px-1.5 py-2 ${disabled ? "opacity-60" : ""}`}>
      <div className="px-2 text-xs font-semibold text-muted">{label}</div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={onPrev} disabled={disabled} aria-label={`${label} 이전`} className={arrow}>
          <Icon name="chevronLeft" size={20} strokeWidth={2.2} />
        </button>
        <span className="text-[15px] font-semibold">{value}</span>
        <button type="button" onClick={onNext} disabled={disabled} aria-label={`${label} 다음`} className={arrow}>
          <Icon name="chevronRight" size={20} strokeWidth={2.2} />
        </button>
      </div>
      <div className="truncate px-2 text-[11px] text-muted">{note}</div>
    </div>
  );
}

function ScoreSheet({ frames, current }: { frames: ReturnType<typeof gameState>["frames"]; current: number }) {
  return (
    <div
      className="grid overflow-hidden rounded-xl border border-edge bg-surface text-center"
      style={{ gridTemplateColumns: "repeat(9, minmax(0, 1fr)) minmax(0, 1.45fr)" }}
      aria-label="점수표"
    >
      {Array.from({ length: 10 }, (_, i) => {
        const f = frames[i];
        const slots = i === 9 ? 3 : 2;
        return (
          <div
            key={i}
            className={`flex flex-col border-r border-separator last:border-r-0 ${i === current ? "bg-accent-soft" : ""}`}
          >
            <div className="text-[10px] text-muted">{i + 1}</div>
            <div className="flex h-5 justify-end">
              {Array.from({ length: slots }, (_, j) => {
                // 1~9프레임 스트라이크는 오른쪽 칸에 X
                const m = f?.marks[i < 9 && f.marks[0] === "X" ? j - 1 : j] ?? "";
                return (
                  <span
                    key={j}
                    className={`flex items-center justify-center text-[12px] font-semibold ${
                      i === 9 ? "w-1/3" : "w-1/2"
                    } ${j > 0 || i === 9 ? "border-l border-separator" : ""} ${
                      m === "X" || m === "/" ? "text-accent" : ""
                    }`}
                  >
                    {m}
                  </span>
                );
              })}
            </div>
            <div className="h-6 text-[13px] leading-6 font-bold tabular-nums">{f?.total ?? ""}</div>
          </div>
        );
      })}
    </div>
  );
}
