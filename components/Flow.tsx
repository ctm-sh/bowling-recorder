import type { ReactNode } from "react";

const STEPS = ["참석", "팀 구성", "점수", "결과"] as const;
export type Step = (typeof STEPS)[number];

/** 정모 진행 단계 표시: 참석 → 팀 구성 → 점수 → 결과. 지나온·현재 단계는 파랑. */
export function StepBar({ current }: { current: Step }) {
  const at = STEPS.indexOf(current);
  return (
    <ol aria-label="진행 단계" className="mx-5 mt-2 grid grid-cols-4 gap-1.5">
      {STEPS.map((label, i) => (
        <li key={label} aria-current={i === at ? "step" : undefined} className="flex flex-col gap-1.5">
          <span className={`h-1 rounded-sm ${i <= at ? "bg-accent" : "bg-edge"}`} />
          <span className={`text-xs ${i === at ? "font-semibold text-accent" : "text-muted"}`}>{label}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * 하단 고정 액션 영역 (반투명 + 블러). 이 영역이 있는 화면에서는 탭바를 숨긴다 (globals.css).
 * 내용이 가려지지 않도록 같은 높이의 여백을 함께 둔다.
 */
export function BottomBar({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <>
      <div aria-hidden className="h-[calc(120px+env(safe-area-inset-bottom))]" />
      <div
        className={`has-bottom-bar fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-[480px] flex-col gap-2 border-t px-5 pt-3.5 pb-[max(env(safe-area-inset-bottom),20px)] backdrop-blur-xl backdrop-saturate-[1.8] ${
          dark ? "border-white/10 bg-black/80" : "border-black/[.06] bg-[rgba(245,245,247,.92)]"
        }`}
      >
        {children}
      </div>
    </>
  );
}
