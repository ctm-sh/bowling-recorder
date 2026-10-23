// 손가락으로 공을 밀어 던지는 동작을 투구 값으로 바꾼다.
// 방향 = 밀어 올린 전체 방향, 세기 = 손을 뗄 때의 속도. (회전은 없고 공은 곧게 간다)

export type SwipePoint = { x: number; y: number; t: number };

/** 방향이 끝(±1)까지 가는 기울기 */
const MAX_AIM_ANGLE = (22 * Math.PI) / 180;
/** 화면 높이 기준 초당 속도: 이보다 느리면 세기 0, 빠르면 1 */
const SLOW = 0.6;
const FAST = 3.5;
/** 마지막으로 움직이고 이보다 오래 멈췄다 떼면 멈춘 것으로 본다 (ms) */
const PAUSE = 80;
/** 이만큼(화면 높이 비율)은 위로 밀어야 던진 것으로 본다 */
export const MIN_SWIPE = 0.12;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** 두 점 사이 방향 (-1 왼쪽 ~ 1 오른쪽). 위쪽을 0으로, 오른쪽으로 기울면 + */
export function swipeAim(from: SwipePoint, to: SwipePoint) {
  return clamp(Math.atan2(to.x - from.x, from.y - to.y) / MAX_AIM_ANGLE, -1, 1);
}

/** 던지지 않은 것(너무 짧거나 아래로 민 것)이면 null */
export function readSwipe(points: SwipePoint[], height: number) {
  if (points.length < 2) return null;
  const first = points[0];
  const last = points[points.length - 1];
  if (first.y - last.y < height * MIN_SWIPE) return null;

  const aim = swipeAim(first, last);

  // 손을 떼기 직전 0.1초 동안의 속도. 떼는 순간 같은 자리에 찍힌 점은 빼고 마지막으로 움직인 점까지 잰다.
  // 멈춰서 한참 있다가 떼면 그 멈춘 시간까지 쳐서 약하게 나간다.
  let end = points.length - 1;
  while (end > 0 && points[end].x === points[end - 1].x && points[end].y === points[end - 1].y) end--;
  const stop = last.t - points[end].t > PAUSE ? last : points[end];
  const recent = points.find((p) => stop.t - p.t <= 100) ?? first;
  const from = recent === stop ? points[Math.max(0, end - 1)] : recent;
  const dt = Math.max(16, stop.t - from.t);
  const speed = (Math.hypot(stop.x - from.x, stop.y - from.y) / dt) * (1000 / height);
  const power = clamp((speed - SLOW) / (FAST - SLOW), 0, 1);

  return { aim, power };
}
