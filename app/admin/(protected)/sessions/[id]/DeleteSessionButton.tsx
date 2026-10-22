"use client";

import { useState, useTransition } from "react";
import { deleteSession } from "../actions";

// 브라우저 confirm() 대신 두 번 눌러 확인한다. 지워질 내용을 숫자로 보여준다.
export function DeleteSessionButton({
  sessionId,
  gameCount,
  scoreCount,
  closed,
}: {
  sessionId: string;
  gameCount: number;
  scoreCount: number;
  closed: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!armed) return setArmed(true);
    startTransition(async () => {
      const result = await deleteSession(sessionId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <section className="mx-4 mt-10 rounded-2xl border border-red-200 p-4">
      <h2 className="text-sm font-bold text-danger">정모 삭제</h2>
      <p className="mt-1 text-xs text-muted">
        {gameCount > 0
          ? `게임 ${gameCount}개, 점수 ${scoreCount}개, 정산 기록이 모두 지워지고 되돌릴 수 없어요.`
          : "아직 게임이 없는 정모예요. 잘못 만들었다면 지워주세요."}
        {closed && " 구글 시트에서도 빠져요."}
      </p>
      <button
        onClick={onClick}
        disabled={pending}
        className={`mt-3 h-11 w-full rounded-xl text-sm font-bold ${
          armed ? "bg-danger text-white" : "border border-red-200 text-danger"
        } disabled:opacity-60`}
      >
        {pending ? "삭제 중…" : armed ? "정말 삭제할게요 (한 번 더 누르기)" : "이 정모 삭제"}
      </button>
      {armed && !pending && (
        <button onClick={() => setArmed(false)} className="mt-2 w-full text-center text-xs text-muted underline">
          취소
        </button>
      )}
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </section>
  );
}
