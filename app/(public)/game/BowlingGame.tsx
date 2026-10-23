"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { BottomBar } from "@/components/Flow";
import { Card } from "@/components/ui";
import { primaryButton } from "@/components/ui";
import {
  BALL_R,
  BALL_START_Y,
  GUTTER,
  LANE_LENGTH,
  LANE_WIDTH,
  PIN_R,
  PIT_Y,
  aimPoint,
  ballSpeed,
  knocked,
  launch,
  rack,
  settled,
  step,
  wobble,
  type Pin,
  type Throw,
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

type Phase = "ready" | "rolling" | "over";

/** 레인을 위에서 본 그림. 앞쪽 레인은 세로로 줄이고, 핀 데크는 크게 보여준다. */
function makeView(width: number) {
  const height = Math.round(Math.min(Math.max(width * 1.15, 340), 470));
  const deckFrom = LANE_LENGTH - 0.45;
  const deckTo = PIT_Y + 0.1;
  const padTop = 6;
  const padBottom = 26;
  const s = Math.min((height * 0.56) / (deckTo - deckFrom), (width - 24) / (LANE_WIDTH + 2 * GUTTER + 0.12));
  const deckBottom = padTop + (deckTo - deckFrom) * s;
  const behind = 0.5;
  const k = (height - padBottom - deckBottom) / (deckFrom + behind);
  return {
    width,
    height,
    s,
    deckFrom,
    deckTo,
    sx: (x: number) => width / 2 + x * s,
    sy: (y: number) => (y >= deckFrom ? padTop + (deckTo - y) * s : deckBottom + (deckFrom - y) * k),
    /** 멀리 갈수록 크게 (핀 쪽을 크게 보는 시점) */
    depth: (y: number) => 0.72 + 0.28 * Math.min(1, Math.max(0, y / deckFrom)),
    top: padTop,
    bottom: height - padBottom + behind * k,
  };
}
type View = ReturnType<typeof makeView>;

function draw(
  ctx: CanvasRenderingContext2D,
  v: View,
  pins: Pin[],
  ball: World["ball"] | null,
  t: Throw,
  idle: boolean,
  fallen: Map<number, number>,
) {
  const { width, height, s, sx, sy } = v;
  ctx.clearRect(0, 0, width, height);

  // 바깥, 거터, 레인
  ctx.fillStyle = "#1c1c1e";
  ctx.fillRect(0, 0, width, height);
  const edge = LANE_WIDTH / 2;
  ctx.fillStyle = "#3a3a3c";
  ctx.fillRect(sx(-edge - GUTTER), v.top, GUTTER * s * 2 + LANE_WIDTH * s, v.bottom - v.top);
  ctx.fillStyle = "#2c2c2e";
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? sx(-edge - GUTTER) : sx(edge);
    ctx.fillRect(x0 + GUTTER * s * 0.2, v.top, GUTTER * s * 0.6, v.bottom - v.top);
  }
  const wood = ctx.createLinearGradient(0, v.bottom, 0, v.top);
  wood.addColorStop(0, "#d9b98a");
  wood.addColorStop(0.55, "#e6c999");
  wood.addColorStop(1, "#f0dbb3");
  ctx.fillStyle = wood;
  ctx.fillRect(sx(-edge), sy(LANE_LENGTH + 0.95), LANE_WIDTH * s, v.bottom - sy(LANE_LENGTH + 0.95));
  // 판자 줄
  ctx.strokeStyle = "rgba(120, 80, 30, 0.12)";
  ctx.lineWidth = 1;
  for (let b = 1; b < 39; b++) {
    const x = Math.round(sx(-edge + (b * LANE_WIDTH) / 39)) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, sy(LANE_LENGTH + 0.95));
    ctx.lineTo(x, v.bottom);
    ctx.stroke();
  }
  // 파울라인
  ctx.fillStyle = "#c0392b";
  ctx.fillRect(sx(-edge), sy(0) - 1, LANE_WIDTH * s, 2);
  // 스팟(화살표)
  ctx.fillStyle = "rgba(60, 40, 20, 0.55)";
  for (let i = 0; i < 7; i++) {
    const x = sx(-edge + ((5 + i * 5) * LANE_WIDTH) / 39);
    const y = sy(3.7 + (3 - Math.abs(i - 3)) * 0.3);
    ctx.beginPath();
    ctx.moveTo(x, y - 7);
    ctx.lineTo(x - 3.5, y + 4);
    ctx.lineTo(x + 3.5, y + 4);
    ctx.closePath();
    ctx.fill();
  }
  // 피트
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(sx(-edge - GUTTER), v.top, (LANE_WIDTH + 2 * GUTTER) * s, sy(PIT_Y) - v.top);

  // 겨냥선 (휘기 전 직선 방향만)
  if (idle) {
    const end = aimPoint(t.aim, v.deckFrom - 0.6);
    ctx.save();
    ctx.setLineDash([5, 6]);
    ctx.strokeStyle = "rgba(0, 113, 227, 0.75)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx(0), sy(BALL_START_Y));
    ctx.lineTo(sx(end.x), sy(end.y));
    ctx.stroke();
    ctx.restore();
  }

  // 핀 (레인·거터 밖으로 삐져나와 그려지지 않게 자른다)
  ctx.save();
  ctx.beginPath();
  ctx.rect(sx(-edge - GUTTER), v.top, (LANE_WIDTH + 2 * GUTTER) * s, v.bottom - v.top);
  ctx.clip();
  for (const p of pins) {
    if (p.gone) continue;
    const x = sx(p.x);
    const y = sy(p.y);
    const r = PIN_R * s;
    if (p.down) {
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > 0.05 || !fallen.has(p.id)) fallen.set(p.id, Math.atan2(-p.vy, p.vx));
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(fallen.get(p.id) ?? 0);
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.beginPath();
      ctx.roundRect(-r * 2.1, -r * 0.75, r * 4.2, r * 1.5, r * 0.75);
      ctx.fill();
      ctx.fillStyle = "#e5484d";
      ctx.fillRect(r * 0.6, -r * 0.75, r * 0.35, r * 1.5);
      ctx.restore();
    } else {
      ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
      ctx.beginPath();
      ctx.arc(x + 1.5, y + 2, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#e5484d";
      ctx.lineWidth = Math.max(1.5, r * 0.22);
      ctx.beginPath();
      ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();

  // 공
  if (ball && !ball.gone && ball.y < v.deckTo) {
    const x = sx(ball.x);
    const y = sy(ball.y);
    const r = BALL_R * s * v.depth(ball.y);
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, "#5aa9ff");
    g.addColorStop(1, "#0050a8");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    // 구르는 느낌: 지나온 거리만큼 손가락 구멍이 돈다
    const turn = ball.y / BALL_R + ball.x * 3;
    ctx.fillStyle = "rgba(0, 20, 50, 0.7)";
    for (const [dx, dy] of [
      [-0.25, -0.3],
      [0.1, -0.38],
      [-0.05, -0.02],
    ]) {
      const c = Math.cos(turn);
      if (c < 0) continue;
      ctx.beginPath();
      ctx.arc(x + dx * r, y + dy * r * c + Math.sin(turn) * r * 0.3, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function BowlingGame() {
  const [aim, setAim] = useState(0);
  const [hook, setHook] = useState(0);
  const [power, setPower] = useState(0.5);
  const [rolls, setRolls] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>("ready");
  const [message, setMessage] = useState<string>();
  const best = useSyncExternalStore(subscribeBest, readBest, () => null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pinsRef = useRef<Pin[]>(rack());
  const worldRef = useRef<World | null>(null);
  const rollsRef = useRef<number[]>([]);
  const throwRef = useRef<Throw>({ aim: 0, hook: 0, power: 0.5 });
  const fallenRef = useRef(new Map<number, number>());
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    throwRef.current = { aim, hook, power };
  }, [aim, hook, power]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const ctx = canvas.getContext("2d")!;
    let view = makeView(wrap.clientWidth);
    const resize = () => {
      view = makeView(wrap.clientWidth);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(view.width * dpr);
      canvas.height = Math.round(view.height * dpr);
      canvas.style.height = `${view.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

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
          setPhase("over");
          return;
        }
        pinsRef.current = state.freshRack ? rack() : w.pins.filter((p) => !p.down && !p.gone);
        setMessage(undefined);
        setPhase("ready");
      }, 1100);
    }

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    // 투구마다 따로 끝났는지 본다 (끝나자마자 다음 공을 굴려도 멈추지 않게)
    let finished: World | null = null;
    let running: World | null = null;
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
        draw(ctx, view, w.pins, w.ball, throwRef.current, false, fallenRef.current);
      } else {
        const idleBall = {
          x: 0,
          y: BALL_START_Y,
          vx: 0,
          vy: 0,
          gutter: false,
          gone: false,
        };
        draw(ctx, view, pinsRef.current, idleBall, throwRef.current, true, fallenRef.current);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      clearTimeout(timerRef.current);
    };
  }, []);

  function roll() {
    if (phase !== "ready") return;
    worldRef.current = launch(wobble({ aim, hook, power }), pinsRef.current);
    setMessage(undefined);
    setPhase("rolling");
  }

  function restart() {
    clearTimeout(timerRef.current);
    rollsRef.current = [];
    pinsRef.current = rack();
    worldRef.current = null;
    fallenRef.current.clear();
    setRolls([]);
    setMessage(undefined);
    setPhase("ready");
  }

  const state = gameState(rolls);
  const total = [...state.frames].reverse().find((f) => f.total !== null)?.total ?? 0;
  const busy = phase !== "ready";

  return (
    <div className="flex flex-col gap-3 px-5 pt-4">
      <ScoreSheet frames={state.frames} current={state.over ? -1 : state.frameIndex} />

      <div ref={wrapRef} className="relative overflow-hidden rounded-2xl bg-[#1c1c1e]">
        <canvas ref={canvasRef} className="block w-full" aria-label="볼링 레인" role="img" />
        {message && (
          <div className="pointer-events-none absolute inset-x-0 top-[38%] flex justify-center">
            <span className="rounded-full bg-black/70 px-5 py-2 text-xl font-bold text-white">{message}</span>
          </div>
        )}
        <div className="pointer-events-none absolute top-2 left-3 text-xs font-semibold text-white/70">
          {state.over ? "게임 끝" : `${state.frameIndex + 1}프레임`}
        </div>
        <div className="pointer-events-none absolute top-2 right-3 text-xs font-semibold text-white/70">
          {best !== null ? `최고 ${best}` : ""}
        </div>
      </div>

      <Card className="flex flex-col gap-4 px-4 py-4">
        <Slider
          label="방향"
          value={aim}
          min={-1}
          max={1}
          step={0.05}
          disabled={busy}
          onChange={setAim}
          text={aim === 0 ? "가운데" : `${aim < 0 ? "왼쪽" : "오른쪽"} ${Math.round(Math.abs(aim) * 20)}`}
          ends={["왼쪽", "오른쪽"]}
        />
        <Slider
          label="휘는 정도"
          value={hook}
          min={-1}
          max={1}
          step={0.1}
          disabled={busy}
          onChange={setHook}
          text={hook === 0 ? "곧게" : `${hook < 0 ? "왼쪽으로" : "오른쪽으로"} ${Math.round(Math.abs(hook) * 10)}`}
          ends={["← 왼쪽으로", "오른쪽으로 →"]}
        />
        <Slider
          label="세기"
          value={power}
          min={0}
          max={1}
          step={0.1}
          disabled={busy}
          onChange={setPower}
          text={`${Math.round(power * 9) + 1} · ${Math.round(ballSpeed(power) * 3.6)}km/h`}
          ends={["약하게", "세게"]}
        />
      </Card>
      <p className="px-1 text-[13px] leading-[1.5] text-muted">
        공은 레인 가운데에서 출발해요. 휘는 공은 레인 뒤쪽부터 꺾이고, 세기가 약할수록 더 많이 휘어요. 1번 핀 바로
        옆(포켓)을 노려 보세요.
      </p>

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
          <button type="button" onClick={roll} disabled={busy} className={primaryButton}>
            {phase === "rolling" ? "굴러가는 중…" : "굴리기"}
          </button>
        )}
      </BottomBar>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
  text,
  ends,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
  onChange: (v: number) => void;
  text: string;
  ends: [string, string];
}) {
  const id = `slider-${label}`;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[15px] font-semibold">
          {label}
        </label>
        <span className="text-[15px] text-accent tabular-nums">{text}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        // 소수 오차(0.30000000000000004)를 없애 가운데 표시가 정확히 맞게 한다
        onChange={(e) => onChange(Math.round(Number(e.target.value) * 100) / 100)}
        className="h-8 w-full accent-accent disabled:opacity-40"
      />
      <div className="flex justify-between text-xs text-muted">
        <span>{ends[0]}</span>
        <span>{ends[1]}</span>
      </div>
    </div>
  );
}

function ScoreSheet({ frames, current }: { frames: ReturnType<typeof gameState>["frames"]; current: number }) {
  return (
    <div
      className="grid overflow-hidden rounded-xl border border-edge bg-surface text-center"
      style={{
        gridTemplateColumns: "repeat(9, minmax(0, 1fr)) minmax(0, 1.45fr)",
      }}
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
