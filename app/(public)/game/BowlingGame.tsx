"use client";

import { type ReactNode, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BottomBar } from "@/components/Flow";
import { Icon } from "@/components/Icon";
import { MinigameRanking } from "@/components/MinigameRanking";
import { Segmented, primaryButton, secondaryButton } from "@/components/ui";
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
import { readSwipe, swipeAim, type SwipePoint } from "@/lib/minigame/swipe";
import { saveMinigameScore, type SaveResult } from "./actions";

const STEP = 1 / 240;
const THEME_KEY = "ttegul-minigame-theme";

// 볼링장 분위기는 이 기기에만 기억한다 (localStorage). 저장이 막혀 있으면 이번 화면에서만 바뀐다.
let memoryTheme: ThemeKey = "bright";
const themeListeners = new Set<() => void>();
function readTheme(): ThemeKey {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "rock" || v === "bright") return v;
  } catch {}
  return memoryTheme;
}
function saveTheme(key: ThemeKey) {
  memoryTheme = key;
  try {
    localStorage.setItem(THEME_KEY, key);
  } catch {}
  themeListeners.forEach((l) => l());
}
function subscribeTheme(l: () => void) {
  themeListeners.add(l);
  return () => themeListeners.delete(l);
}

/** before: 이번 게임 전 내 최고 점수 (기록 갱신 표시용). 서버에 못 닿으면 error만 있다. */
type Saved = Partial<SaveResult> & { before?: number | null };

/** 던지기 전 → 굴러가는 중 → (10프레임 끝) */
type Phase = "ready" | "rolling" | "over";

const BALLS = [
  { name: "파랑", light: "#5b8cff", dark: "#0c2a7a", swirl: "rgba(200, 225, 255, 0.55)" },
  { name: "빨강", light: "#ff6b6b", dark: "#7a0c18", swirl: "rgba(255, 210, 160, 0.5)" },
  { name: "검정", light: "#6b6f78", dark: "#0b0c0f", swirl: "rgba(255, 255, 255, 0.22)" },
  { name: "보라", light: "#b07cff", dark: "#3b0f7a", swirl: "rgba(255, 190, 240, 0.5)" },
  { name: "초록", light: "#4fd18b", dark: "#0b5a33", swirl: "rgba(230, 255, 200, 0.5)" },
];
type BallStyle = (typeof BALLS)[number];

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

// ── 볼링장 분위기: 밝은 볼링장 / 락 볼링장(어두운 조명 + 네온) ──
type Theme = {
  sky: [string, string];
  floor: string;
  neighbor: string;
  gutter: string;
  gutterInner: string;
  capping: string;
  cappingLine: string;
  wood: [string, string, string];
  oil: string;
  deck: string;
  boards: string;
  foul: string;
  arrows: string;
  pit: string;
  wall: string;
  mask: string;
  maskLine: string;
  maskText: string;
  logo: string;
  pin: [string, string, string];
  pinStripe: string;
  fallen: string;
  shadow: string;
  /** 네온 빛 번짐 + 움직이는 조명 */
  party: boolean;
};

const THEMES = {
  bright: {
    sky: ["#e9eef4", "#c4ccd6"],
    floor: "#c9a26b",
    neighbor: "#e2c08b",
    gutter: "#9aa1aa",
    gutterInner: "#7f868f",
    capping: "#c3c9d1",
    cappingLine: "#f4f6f9",
    wood: ["#dcb57d", "#ecce9c", "#f8e8c6"],
    oil: "rgba(255, 255, 255, 0.16)",
    deck: "rgba(255, 250, 235, 0.5)",
    boards: "rgba(110, 70, 25, 0.13)",
    foul: "#c0392b",
    arrows: "rgba(70, 40, 15, 0.6)",
    pit: "#1b1d22",
    wall: "#a7afb9",
    mask: "#ffffff",
    maskLine: "#0071e3",
    maskText: "#1d1d1f",
    logo: "떼굴 BOWLING",
    pin: ["#d9dce2", "#ffffff", "#c4c8cf"],
    pinStripe: "#e0353b",
    fallen: "#f2f3f5",
    shadow: "rgba(0, 0, 0, 0.18)",
    party: false,
  },
  rock: {
    sky: ["#04010b", "#1d0638"],
    floor: "#0c0716",
    neighbor: "#1a1030",
    gutter: "#17112a",
    gutterInner: "#0b0716",
    capping: "#261a3f",
    cappingLine: "#ff2bd6",
    wood: ["#160f2b", "#22173f", "#2d1f55"],
    oil: "rgba(140, 100, 255, 0.08)",
    deck: "rgba(120, 80, 255, 0.16)",
    boards: "rgba(150, 110, 255, 0.10)",
    foul: "#ff2bd6",
    arrows: "#22e6ff",
    pit: "#000000",
    wall: "#140b26",
    mask: "#0a0514",
    maskLine: "#22e6ff",
    maskText: "#ff4fe0",
    logo: "떼굴 ROCK BOWLING",
    pin: ["#d9ccff", "#ffffff", "#bba8f5"],
    pinStripe: "#ff2bd6",
    fallen: "#e6dcff",
    shadow: "rgba(0, 0, 0, 0.45)",
    party: true,
  },
} satisfies Record<string, Theme>;
type ThemeKey = keyof typeof THEMES;

/** 빛 번짐 켜기 (락 볼링장만) */
function glow(ctx: CanvasRenderingContext2D, t: Theme, color: string, blur: number) {
  if (!t.party) return;
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}
function noGlow(ctx: CanvasRenderingContext2D) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
}

const NEON = ["#ff2bd6", "#22e6ff", "#b6ff3b", "#ffd60a", "#8f5bff"];

function drawLane(ctx: CanvasRenderingContext2D, c: Cam, t: Theme, now: number) {
  const { width, height, horizon } = c;
  // 천장·뒤 벽
  const sky = ctx.createLinearGradient(0, 0, 0, horizon + 20);
  sky.addColorStop(0, t.sky[0]);
  sky.addColorStop(1, t.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // 락: 천장에서 흔들리는 조명 빔
  if (t.party) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 3; i++) {
      const sway = Math.sin(now / 1400 + i * 2.1);
      const topX = width * (0.2 + i * 0.3);
      const footX = topX + sway * width * 0.35;
      const footY = horizon + height * 0.35;
      const beam = ctx.createLinearGradient(topX, 0, footX, footY);
      beam.addColorStop(0, `${NEON[i]}55`);
      beam.addColorStop(1, `${NEON[i]}00`);
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(topX - 4, 0);
      ctx.lineTo(topX + 4, 0);
      ctx.lineTo(footX + width * 0.14, footY);
      ctx.lineTo(footX - width * 0.14, footY);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  const far = PIT_Y + 0.6;
  // 옆 레인들 (바닥)
  quad(ctx, c, -6, 6, -3, far, t.floor);
  for (const side of [-1, 1]) {
    const inner = EDGE + GUTTER + 0.22;
    const x0 = side < 0 ? -inner - LANE_WIDTH : inner;
    quad(ctx, c, x0, x0 + LANE_WIDTH, -3, LANE_LENGTH + 0.95, t.neighbor);
    const g0 = side < 0 ? x0 - GUTTER : x0 + LANE_WIDTH;
    quad(ctx, c, g0, g0 + GUTTER, -3, far, t.gutter);
    // 공 받침대(캐핑)
    const cap0 = side < 0 ? -inner : EDGE + GUTTER;
    quad(ctx, c, cap0, cap0 + 0.22, -3, far, t.capping, 0.03);
    glow(ctx, t, t.cappingLine, 10);
    quad(ctx, c, cap0 + 0.08, cap0 + 0.14, -3, far, t.cappingLine, 0.031);
    noGlow(ctx);
  }
  // 거터 (안쪽이 더 어둡게)
  for (const side of [-1, 1]) {
    const g0 = side < 0 ? -EDGE - GUTTER : EDGE;
    quad(ctx, c, g0, g0 + GUTTER, -3, far, t.gutter);
    quad(ctx, c, g0 + GUTTER * 0.25, g0 + GUTTER * 0.75, -3, far, t.gutterInner);
  }
  // 레인 나무
  const nearY = project(c, 0, c.y + NEAR).y;
  const farY = project(c, 0, LANE_LENGTH + 0.95).y;
  const wood = ctx.createLinearGradient(0, nearY, 0, farY);
  wood.addColorStop(0, t.wood[0]);
  wood.addColorStop(0.5, t.wood[1]);
  wood.addColorStop(1, t.wood[2]);
  quad(ctx, c, -EDGE, EDGE, -3, LANE_LENGTH + 0.95, wood);
  // 기름 반사광
  quad(ctx, c, -EDGE * 0.7, EDGE * 0.7, 2, 11, t.oil);
  // 핀 데크
  quad(ctx, c, -EDGE, EDGE, LANE_LENGTH - 0.35, LANE_LENGTH + 0.95, t.deck);
  // 판자 줄
  ctx.strokeStyle = t.boards;
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

  // 락: 레인 위를 돌아다니는 색 조명
  if (t.party) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 4; i++) {
      const x = Math.sin(now / 900 + i * 1.7) * EDGE * 0.8;
      const y = c.y + 3 + ((now / 400 + i * 5) % 16);
      if (y > LANE_LENGTH + 0.9 || y - c.y < NEAR + 0.5) continue;
      const p = project(c, x, y);
      const r = 0.45 * p.k;
      const spot = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      spot.addColorStop(0, `${NEON[i]}66`);
      spot.addColorStop(1, `${NEON[i]}00`);
      ctx.fillStyle = spot;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r, r * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // 레인 양쪽 끝 네온 줄
    glow(ctx, t, "#22e6ff", 12);
    quad(ctx, c, -EDGE - 0.012, -EDGE + 0.006, -3, LANE_LENGTH + 0.95, "#22e6ff");
    quad(ctx, c, EDGE - 0.006, EDGE + 0.012, -3, LANE_LENGTH + 0.95, "#22e6ff");
    noGlow(ctx);
  }

  // 파울라인
  glow(ctx, t, t.foul, 12);
  quad(ctx, c, -EDGE, EDGE, -0.015, 0.015, t.foul);
  // 스팟 점 + 화살표
  glow(ctx, t, t.arrows, 10);
  for (let i = 0; i < 7; i++) {
    const x = -EDGE + ((5 + i * 5) * LANE_WIDTH) / 39;
    const y = 3.7 + (3 - Math.abs(i - 3)) * 0.3;
    if (y - c.y < NEAR + 0.3) continue;
    const tip = project(c, x, y + 0.3);
    const l = project(c, x - 0.025, y);
    const r = project(c, x + 0.025, y);
    // 락에서는 화살표가 차례로 색이 바뀐다
    ctx.fillStyle = t.party ? NEON[(i + Math.floor(now / 500)) % NEON.length] : t.arrows;
    ctx.beginPath();
    ctx.moveTo(tip.x, tip.y);
    ctx.lineTo(l.x, l.y);
    ctx.lineTo(r.x, r.y);
    ctx.closePath();
    ctx.fill();
  }
  noGlow(ctx);
  // 피트(검은 구덩이)와 양옆 벽
  quad(ctx, c, -EDGE - GUTTER, EDGE + GUTTER, LANE_LENGTH + 0.95, far, t.pit);
  for (const side of [-1, 1]) {
    wall(ctx, c, side * (EDGE + GUTTER), LANE_LENGTH - 0.6, far, 0.55, t.wall);
  }
  // 뒤 가림막 (떼굴 로고)
  const bl = project(c, -EDGE - GUTTER - 0.3, far, 0.55);
  const tr = project(c, EDGE + GUTTER + 0.3, far, 1.5);
  ctx.fillStyle = t.mask;
  ctx.fillRect(bl.x, tr.y, tr.x - bl.x, bl.y - tr.y);
  glow(ctx, t, t.maskLine, 10);
  ctx.fillStyle = t.maskLine;
  ctx.fillRect(bl.x, bl.y - 2, tr.x - bl.x, 2);
  const k = project(c, 0, far).k;
  ctx.fillStyle = t.maskText;
  glow(ctx, t, t.maskText, 14);
  ctx.font = `700 ${Math.min(18, Math.max(7, k * 0.32))}px Inter, "Noto Sans KR", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(t.logo, (bl.x + tr.x) / 2, (bl.y + tr.y) / 2);
  noGlow(ctx);
  // 락: 가림막 위 반짝이는 디스코 전구
  if (t.party) {
    const n = 14;
    for (let i = 0; i < n; i++) {
      const x = bl.x + ((i + 0.5) / n) * (tr.x - bl.x);
      const on = (i + Math.floor(now / 180)) % 3 === 0;
      ctx.fillStyle = on ? NEON[i % NEON.length] : "rgba(255, 255, 255, 0.15)";
      ctx.beginPath();
      ctx.arc(x, tr.y + 4, Math.max(1.5, k * 0.025), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** 서 있는 핀 (실루엣) */
function drawPin(ctx: CanvasRenderingContext2D, x: number, y: number, k: number, t: Theme) {
  const s = k;
  // 그림자
  ctx.fillStyle = t.shadow;
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
  g.addColorStop(0, t.pin[0]);
  g.addColorStop(0.35, t.pin[1]);
  g.addColorStop(1, t.pin[2]);
  ctx.fillStyle = g;
  glow(ctx, t, "rgba(190, 150, 255, 0.9)", 12);
  ctx.fill();
  noGlow(ctx);
  // 목의 줄 두 개
  ctx.save();
  ctx.clip();
  ctx.fillStyle = t.pinStripe;
  ctx.fillRect(x - half(0.13), at(0.262), 0.13 * s, 0.011 * s);
  ctx.fillRect(x - half(0.13), at(0.236), 0.13 * s, 0.011 * s);
  ctx.restore();
}

/** 쓰러진 핀: 바닥에 누운 막대 (angle은 바닥 기준 방향) */
function drawFallen(ctx: CanvasRenderingContext2D, c: Cam, x: number, y: number, angle: number, t: Theme) {
  const len = 0.36;
  const hx = x + Math.cos(angle) * len;
  const hy = y + Math.sin(angle) * len;
  if (Math.min(y, hy) - c.y < NEAR) return;
  const base = project(c, x, y, 0.055);
  const head = project(c, hx, hy, 0.04);
  const k = (base.k + head.k) / 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = t.shadow;
  ctx.lineWidth = 0.11 * k;
  ctx.beginPath();
  ctx.moveTo(base.x + 2, base.y + 0.05 * k);
  ctx.lineTo(head.x + 2, head.y + 0.05 * k);
  ctx.stroke();
  ctx.strokeStyle = t.fallen;
  ctx.lineWidth = 0.1 * k;
  glow(ctx, t, "rgba(190, 150, 255, 0.9)", 10);
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.lineTo(head.x, head.y);
  ctx.stroke();
  noGlow(ctx);
  // 목 줄
  const mx = base.x + (head.x - base.x) * 0.66;
  const my = base.y + (head.y - base.y) * 0.66;
  const nx = base.x + (head.x - base.x) * 0.72;
  const ny = base.y + (head.y - base.y) * 0.72;
  ctx.strokeStyle = t.pinStripe;
  ctx.lineCap = "butt";
  ctx.lineWidth = 0.075 * k;
  ctx.beginPath();
  ctx.moveTo(mx, my);
  ctx.lineTo(nx, ny);
  ctx.stroke();
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  c: Cam,
  ball: Pick<Ball, "x" | "y">,
  style: BallStyle,
  roll: number,
  t: Theme,
) {
  if (ball.y - c.y < NEAR + BALL_R) return;
  const ground = project(c, ball.x, ball.y);
  const p = project(c, ball.x, ball.y, BALL_R);
  const r = BALL_R * p.k;
  ctx.fillStyle = t.shadow;
  ctx.beginPath();
  ctx.ellipse(ground.x + r * 0.15, ground.y, r * 1.05, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  const g = ctx.createRadialGradient(p.x - r * 0.35, p.y - r * 0.4, r * 0.1, p.x, p.y, r);
  g.addColorStop(0, style.light);
  g.addColorStop(1, style.dark);
  // 락에서는 공이 자기 색으로 빛난다
  glow(ctx, t, style.light, 22);
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  noGlow(ctx);
  ctx.save();
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
  // 밝은 볼링장에서도 보이도록 어두운 바탕
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.beginPath();
  ctx.roundRect(8, 8, gap * 3 + r * 2 + 12, gap * 0.85 * 3 + r * 2 + 12, 14);
  ctx.fill();
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

/** 손가락 자국 (밀어 올린 길) */
function drawTrail(ctx: CanvasRenderingContext2D, points: SwipePoint[]) {
  if (points.length < 2) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.stroke();
  ctx.restore();
}

/** 화면 왼쪽 아래: 방금 던진 공의 세기·방향 */
function describeThrow(aim: number, power: number) {
  const dir = Math.round(aim * 10);
  return `세기 ${Math.round(power * 9) + 1} · 방향 ${dir === 0 ? "가운데" : `${dir < 0 ? "왼쪽" : "오른쪽"} ${Math.abs(dir)}`}`;
}

export function BowlingGame({ meName, myBest }: { meName: string | null; myBest: number | null }) {
  const router = useRouter();
  const [rolls, setRolls] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>("ready");
  const [message, setMessage] = useState<string>();
  const [lastThrow, setLastThrow] = useState<string>();
  const [weight, setWeight] = useState(12);
  const [ballIndex, setBallIndex] = useState(0);
  const themeKey = useSyncExternalStore(subscribeTheme, readTheme, () => "bright" as ThemeKey);
  const [saved, setSaved] = useState<Saved | "saving">();
  /** 게임이 끝나면 결과·랭킹 창을 바로 띄운다 (닫으면 점수판을 볼 수 있다) */
  const [showResult, setShowResult] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pinsRef = useRef<Pin[]>(rack());
  const worldRef = useRef<World | null>(null);
  const rollsRef = useRef<number[]>([]);
  const phaseRef = useRef<Phase>("ready");
  const startXRef = useRef(0);
  const ballStyleRef = useRef<BallStyle>(BALLS[0]);
  const weightRef = useRef(12);
  const themeRef = useRef<Theme>(THEMES.bright);
  const fallenRef = useRef(new Map<number, { angle: number; spin: number }>());
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    ballStyleRef.current = BALLS[ballIndex];
    weightRef.current = weight;
    themeRef.current = THEMES[themeKey];
  }, [ballIndex, weight, themeKey]);

  function go(next: Phase) {
    phaseRef.current = next;
    setPhase(next);
  }
  const goRef = useRef(go);
  const setLastThrowRef = useRef(setLastThrow);

  /** 끝난 게임을 랭킹에 남긴다 (서버가 투구 기록으로 점수를 다시 계산) */
  function save(finished: number[]) {
    setSaved("saving");
    setShowResult(true);
    const before = myBest;
    saveMinigameScore(finished)
      .then((r) => {
        setSaved({ ...r, before });
        router.refresh();
      })
      .catch(() => setSaved({ error: "랭킹에 저장하지 못했어요. 잠시 후 다시 해 주세요." }));
  }
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
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

    // 공 드래그: 옆으로 끌면 공이 따라오고, 위로 밀어 올리고 떼면 던진다
    let gesture: { id: number; startX: number; fromX: number; swipe: SwipePoint[] | null } | null = null;
    let downAt: SwipePoint | null = null;
    const local = (e: PointerEvent): SwipePoint => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top, t: performance.now() };
    };
    /** 손가락 x를 공이 있는 거리의 레인 위치로 */
    const worldDx = (px: number) => (px * (BALL_START_Y - cam.y)) / cam.f;
    const clampX = (x: number) => Math.max(-MAX_START, Math.min(MAX_START, x));

    const onDown = (e: PointerEvent) => {
      if (phaseRef.current !== "ready" || gesture) return;
      canvas.setPointerCapture(e.pointerId);
      const p = local(e);
      gesture = { id: e.pointerId, startX: startXRef.current, fromX: p.x, swipe: null };
      downAt = p;
    };
    const onMove = (e: PointerEvent) => {
      if (!gesture || e.pointerId !== gesture.id || !downAt) return;
      const p = local(e);
      if (!gesture.swipe) {
        // 위로 조금이라도 밀기 시작하면 그때부터 던지는 동작
        if (downAt.y - p.y > 18) {
          gesture.swipe = [p];
        } else {
          startXRef.current = clampX(gesture.startX + worldDx(p.x - gesture.fromX));
        }
      } else {
        gesture.swipe.push(p);
        if (gesture.swipe.length > 120) gesture.swipe.shift();
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!gesture || e.pointerId !== gesture.id) return;
      const swipe = gesture.swipe;
      gesture = null;
      downAt = null;
      if (!swipe || e.type === "pointercancel") return;
      swipe.push(local(e));
      const read = readSwipe(swipe, cam.height);
      if (!read) return;
      worldRef.current = launch(
        { startX: startXRef.current, aim: read.aim, hook: 0, power: read.power, weight: weightRef.current },
        pinsRef.current,
      );
      setLastThrowRef.current(describeThrow(read.aim, read.power));
      setMessage(undefined);
      goRef.current("rolling");
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
        setMessage(undefined);
        if (state.over) {
          pinsRef.current = w.pins;
          saveRef.current(next);
          goRef.current("over");
          return;
        }
        pinsRef.current = state.freshRack ? rack() : w.pins.filter((p) => !p.down && !p.gone);
        goRef.current("ready");
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
      const theme = themeRef.current;
      drawLane(ctx, cam, theme, now);

      // 밀어 올리는 중이면 지금 방향을 바닥에 화살표로 보여준다
      const swipe = gesture?.swipe;
      if (swipe && swipe.length > 1) {
        // 던질 만큼 밀었으면 노란색, 아직이면 흐린 흰색
        const ready = readSwipe(swipe, cam.height) !== null;
        const aim = swipeAim(swipe[0], swipe[swipe.length - 1]);
        drawArrow(ctx, cam, startXRef.current, aim, ready ? "rgba(255, 204, 0, 0.85)" : "rgba(255, 255, 255, 0.4)");
      }

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
          f.angle += f.spin * dt * Math.min(1, Math.hypot(p.vx, p.vy));
          const angle = f.angle;
          items.push({ y: p.y, draw: () => drawFallen(ctx, cam, p.x, p.y, angle, theme) });
        } else {
          items.push({
            y: p.y,
            draw: () => {
              const g = project(cam, p.x, p.y);
              drawPin(ctx, g.x, g.y, g.k, theme);
            },
          });
        }
      }
      if (!(w && (w.ball.gone || w.ball.y > PIT_Y))) {
        const style = ballStyleRef.current;
        items.push({ y: ball.y, draw: () => drawBall(ctx, cam, ball, style, roll, theme) });
      }
      items.sort((a, b) => b.y - a.y).forEach((i) => i.draw());

      if (swipe) drawTrail(ctx, swipe);

      // 던지기 전: 공 위로 밀어 올리라는 표시
      if (phaseRef.current === "ready" && !swipe) {
        const p = project(cam, startXRef.current, BALL_START_Y, BALL_R);
        const r = BALL_R * p.k;
        const bob = 6 * Math.sin(now / 250);
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        for (const [i, alpha] of [
          [0, 0.9],
          [1, 0.55],
        ]) {
          ctx.globalAlpha = alpha;
          const y = p.y - r - 18 - i * 16 + bob;
          ctx.beginPath();
          ctx.moveTo(p.x, y - 9);
          ctx.lineTo(p.x - 12, y + 3);
          ctx.lineTo(p.x + 12, y + 3);
          ctx.closePath();
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      const standing = new Set(pins.filter((p) => !p.down && !p.gone).map((p) => p.id));
      drawPinMap(ctx, standing);

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
    setLastThrow(undefined);
    setSaved(undefined);
    setShowResult(false);
    go("ready");
  }

  const state = gameState(rolls);
  const total = [...state.frames].reverse().find((f) => f.total !== null)?.total ?? 0;
  const choosing = phase === "ready";

  return (
    <div className="flex flex-col gap-3 px-5 pt-4">
      <ScoreSheet frames={state.frames} current={state.over ? -1 : state.frameIndex} />

      <Segmented
        label="볼링장 분위기"
        value={themeKey}
        onSelect={(k) => saveTheme(k === "rock" ? "rock" : "bright")}
        options={[
          { key: "bright", label: "☀️ 밝은 볼링장" },
          { key: "rock", label: "🪩 락 볼링장" },
        ]}
      />

      <div ref={wrapRef} className="relative overflow-hidden rounded-2xl bg-black">
        <canvas
          ref={canvasRef}
          className="block w-full touch-none select-none"
          aria-label="볼링 레인. 공을 옆으로 끌어 위치를 정하고, 위로 밀어 올려 던지세요"
          role="img"
        />
        {message && (
          <div className="pointer-events-none absolute inset-x-0 top-[34%] flex justify-center">
            <span className="rounded-full bg-black/70 px-6 py-2.5 text-2xl font-bold text-white">{message}</span>
          </div>
        )}
        {lastThrow && (
          <div className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/50 px-2 py-0.5 text-xs font-semibold text-white">
            {lastThrow}
          </div>
        )}
        <div className="pointer-events-none absolute right-2 bottom-2 rounded-full bg-black/50 px-2 py-0.5 text-xs font-semibold text-white">
          {state.over ? "게임 끝" : `${state.frameIndex + 1}프레임`}
          {myBest !== null && ` · 내 최고 ${myBest}`}
        </div>
      </div>

      <p className="min-h-10 px-1 text-center text-[13px] leading-[1.5] text-muted">
        {phase === "ready" &&
          "공을 옆으로 끌어 자리를 잡고, 위로 밀어 올려 던지세요. 기울여 밀면 그 방향으로, 빠르게 밀수록 세게 가요."}
        {phase === "rolling" && "굴러가는 중…"}
        {phase === "over" && "수고했어요! 한 판 더 해볼까요?"}
      </p>
      {!meName && (
        <p className="-mt-2 text-center text-[13px]">
          <Link href="/home" className="font-semibold text-link">
            이름을 고르면 게임 랭킹에 올라가요 ›
          </Link>
        </p>
      )}

      {/* 공 고르기 (던지기 전에만) */}
      <div className="grid grid-cols-2 gap-2.5">
        <Chooser
          label="공 무게"
          value={`${weight}파운드`}
          disabled={!choosing}
          onPrev={() => setWeight((w) => Math.max(MIN_WEIGHT, w - 1))}
          onNext={() => setWeight((w) => Math.min(MAX_WEIGHT, w + 1))}
          note="무거우면 느리지만 세게"
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

      {phase === "over" &&
        (showResult ? (
          <ResultSheet
            total={total}
            saved={saved}
            meName={meName}
            onRestart={restart}
            onClose={() => setShowResult(false)}
          />
        ) : (
          <BottomBar>
            <button type="button" onClick={restart} className={primaryButton}>
              새 게임
            </button>
            <button type="button" onClick={() => setShowResult(true)} className={secondaryButton}>
              결과·랭킹 보기
            </button>
          </BottomBar>
        ))}
    </div>
  );
}

/** 게임이 끝나면 아래에서 올라오는 결과 창: 최종 점수, 내 순위, 랭킹 상위 5명 */
function ResultSheet({
  total,
  saved,
  meName,
  onRestart,
  onClose,
}: {
  total: number;
  saved: Saved | "saving" | undefined;
  meName: string | null;
  onRestart: () => void;
  onClose: () => void;
}) {
  // Esc로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const done = saved && saved !== "saving" ? saved : null;
  const newBest = done?.score !== undefined && done.score > (done.before ?? -1);
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-result-title"
        className="flex max-h-[88dvh] w-full max-w-[480px] flex-col gap-4 overflow-y-auto rounded-t-[22px] bg-background px-5 pt-5 pb-[max(env(safe-area-inset-bottom),20px)]"
      >
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="text-[13px] font-semibold text-muted">게임 끝</div>
          <h2 id="game-result-title" className="text-5xl leading-[1.07] font-bold tracking-[-1px]">
            {total}
            <span className="text-[22px] font-semibold">점</span>
          </h2>
          <div className="min-h-6 text-[15px]">
            {saved === "saving" && <span className="text-muted">랭킹에 올리는 중…</span>}
            {done?.rank !== undefined && (
              <span>
                🏆 게임 랭킹 <b className="text-accent">{done.rank}위</b>
                <span className="text-muted"> · {done.ranking?.length}명 중</span>
              </span>
            )}
            {done?.error && <span className="text-muted">{done.error}</span>}
          </div>
          {done?.rank !== undefined &&
            (newBest ? (
              <span className="rounded-full bg-accent px-3 py-1 text-[13px] font-semibold text-white">
                {meName} 최고 기록 갱신!
              </span>
            ) : (
              <span className="text-[13px] text-muted">
                {meName} 최고 {done.best}점
              </span>
            ))}
          {done?.error && !meName && (
            <Link href="/home" className="text-[15px] font-semibold text-link">
              이름 고르러 가기 ›
            </Link>
          )}
        </div>

        {done?.ranking ? (
          <MinigameRanking ranking={done.ranking} meId={done.meId ?? null} limit={5} playLink={false} />
        ) : (
          saved === "saving" && <div className="h-40 animate-pulse rounded-2xl bg-surface" aria-hidden />
        )}

        <div className="flex flex-col gap-2">
          <button type="button" onClick={onRestart} className={primaryButton} autoFocus>
            새 게임
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onClose} className={secondaryButton}>
              점수판 보기
            </button>
            <Link href="/ranking?sort=game" className={secondaryButton}>
              전체 랭킹
            </Link>
          </div>
        </div>
      </div>
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
