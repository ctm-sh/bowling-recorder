"use client";

import { useState, useTransition } from "react";
import { deleteSession } from "../actions";

// 브라우저 confirm() 대신 두 번 눌러 확인한다
export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
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
    <div className="mt-10 px-4 text-center">
      <button
        onClick={onClick}
        disabled={pending}
        className={`text-sm underline ${armed ? "font-bold text-danger" : "text-muted"}`}
      >
        {armed ? "한 번 더 누르면 이 정모를 삭제해요" : "정모 삭제"}
      </button>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}
