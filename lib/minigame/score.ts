// 미니게임 점수: 일반 볼링 10프레임 규칙 (스트라이크·스페어 보너스, 10프레임 최대 3구)

export type FrameView = {
  /** 칸에 표시할 기호: 숫자, "X", "/", "-" */
  marks: string[];
  /** 이 프레임까지의 누적 점수 (보너스가 아직 안 정해졌으면 null) */
  total: number | null;
};

export type GameState = {
  frames: FrameView[];
  /** 지금 굴릴 프레임 (0~9) */
  frameIndex: number;
  /** 다음 투구 전에 핀 10개를 새로 세우는지 */
  freshRack: boolean;
  over: boolean;
};

const mark = (n: number) => (n === 0 ? "-" : String(n));

export function gameState(rolls: number[]): GameState {
  const frames: FrameView[] = [];
  let i = 0;
  let running = 0;
  let known = true;

  const bonus = (from: number, count: number) => {
    const next = rolls.slice(from, from + count);
    return next.length === count ? next.reduce((s, n) => s + n, 0) : null;
  };
  const add = (base: number, extra: number | null) => {
    if (!known || extra === null) {
      known = false;
      return null;
    }
    running += base + extra;
    return running;
  };

  // 1~9프레임
  for (let f = 0; f < 9 && i < rolls.length; f++) {
    const a = rolls[i];
    if (a === 10) {
      frames.push({ marks: ["X"], total: add(10, bonus(i + 1, 2)) });
      i += 1;
      continue;
    }
    if (i + 1 >= rolls.length) {
      frames.push({ marks: [mark(a)], total: null });
      return { frames, frameIndex: f, freshRack: false, over: false };
    }
    const b = rolls[i + 1];
    if (a + b === 10) {
      frames.push({ marks: [mark(a), "/"], total: add(10, bonus(i + 2, 1)) });
    } else {
      frames.push({ marks: [mark(a), mark(b)], total: add(a + b, 0) });
    }
    i += 2;
  }

  if (frames.length < 9) return { frames, frameIndex: frames.length, freshRack: true, over: false };

  // 10프레임
  const tenth = rolls.slice(i, i + 3);
  const [a, b, c] = tenth;
  const marks: string[] = [];
  if (a !== undefined) marks.push(a === 10 ? "X" : mark(a));
  if (b !== undefined) {
    if (a === 10) marks.push(b === 10 ? "X" : mark(b));
    else marks.push(a + b === 10 ? "/" : mark(b));
  }
  if (c !== undefined) {
    // 2구가 스트라이크·스페어로 새 핀이었으면 3구는 그대로, 아니면 남은 핀 기준 스페어 표시
    const freshForC = a === 10 ? b === 10 : true;
    if (freshForC) marks.push(c === 10 ? "X" : mark(c));
    else marks.push(b + c === 10 ? "/" : mark(c));
  }

  const thirdAllowed = a !== undefined && b !== undefined && (a === 10 || a + b === 10);
  const over = b !== undefined && (thirdAllowed ? c !== undefined : true);
  if (tenth.length > 0) {
    frames.push({
      marks,
      total: over
        ? add(
            tenth.reduce((s, n) => s + n, 0),
            0,
          )
        : null,
    });
  }

  let freshRack = true;
  if (a !== undefined && b === undefined) freshRack = a === 10;
  else if (a !== undefined && b !== undefined && c === undefined) freshRack = a === 10 ? b === 10 : a + b === 10;

  return { frames, frameIndex: 9, freshRack, over };
}

/**
 * 끝까지 친 정상적인 한 게임이면 최종 점수, 아니면 null.
 * (서버에서 랭킹에 올리기 전에 투구 기록으로 점수를 다시 계산한다)
 */
export function finalScore(rolls: number[]): number | null {
  if (!rolls.every((n) => Number.isInteger(n) && n >= 0 && n <= 10)) return null;
  // 한 프레임에 서 있던 핀보다 많이 쓰러뜨릴 수 없다
  let standing = 10;
  for (let i = 0; i < rolls.length; i++) {
    if (rolls[i] > standing) return null;
    const before = gameState(rolls.slice(0, i + 1));
    standing = before.freshRack ? 10 : standing - rolls[i];
    if (before.over && i < rolls.length - 1) return null;
  }
  const state = gameState(rolls);
  return state.over ? (state.frames[9].total ?? null) : null;
}
