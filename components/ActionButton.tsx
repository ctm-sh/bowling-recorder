"use client";

import { useState, useTransition, type ReactNode } from "react";

/**
 * 서버 액션 버튼. confirm이 있으면 브라우저 confirm() 대신 두 번 눌러 확인한다.
 * 액션이 { error }를 돌려주면 버튼 아래에 보여준다.
 */
export function ActionButton({
  action,
  children,
  confirm,
  className,
}: {
  action: () => Promise<{ error?: string } | void>;
  children: ReactNode;
  confirm?: string;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (confirm && !armed) return setArmed(true);
    setError(undefined);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setError(result.error);
      setArmed(false);
    });
  }

  return (
    <div className="flex flex-col">
      <button onClick={onClick} disabled={pending} className={className}>
        {pending ? "처리 중…" : armed ? confirm : children}
      </button>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}
