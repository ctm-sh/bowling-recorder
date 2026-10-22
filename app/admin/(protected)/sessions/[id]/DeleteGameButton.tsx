"use client";

import { useState, useTransition } from "react";
import { deleteGame } from "./games/actions";

// 점수 입력 전 게임 취소. 브라우저 confirm() 대신 두 번 눌러 확인한다.
export function DeleteGameButton({ sessionId, gameId }: { sessionId: string; gameId: string }) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!armed) return setArmed(true);
    startTransition(async () => {
      const result = await deleteGame(sessionId, gameId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <span className="text-[13px]">
      <button
        onClick={onClick}
        disabled={pending}
        className={`min-h-11 ${armed ? "font-semibold text-danger" : "text-muted underline"}`}
      >
        {armed ? "한 번 더 누르면 취소" : "게임 취소"}
      </button>
      {error && <span className="ml-1 text-danger">{error}</span>}
    </span>
  );
}
