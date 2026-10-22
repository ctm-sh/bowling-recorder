"use client";

import { useActionState, useState } from "react";
import { login } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  // 휴대폰에서 빠르게 치면 키가 빠질 수 있어, 입력한 글자를 직접 확인할 수 있게 한다
  const [shown, setShown] = useState(false);

  return (
    <form action={action} className="mt-8 flex flex-col gap-3">
      <div className="relative">
        <input
          type={shown ? "text" : "password"}
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="비밀번호"
          className="h-14 w-full rounded-xl border-2 border-line pr-16 pl-4 text-lg outline-none focus:border-brand"
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-pressed={shown}
          className="absolute inset-y-0 right-0 px-4 text-sm text-muted"
        >
          {shown ? "숨기기" : "보기"}
        </button>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button
        disabled={pending}
        className="h-14 rounded-xl bg-brand text-base font-bold text-white disabled:opacity-60"
      >
        {pending ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}
