"use client";

import { useActionState } from "react";
import { login } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});

  return (
    <form action={action} className="mt-8 flex flex-col gap-3">
      <input
        type="password"
        name="password"
        required
        autoFocus
        autoComplete="current-password"
        placeholder="비밀번호"
        className="h-14 rounded-xl border-2 border-line px-4 text-lg outline-none focus:border-brand"
      />
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
