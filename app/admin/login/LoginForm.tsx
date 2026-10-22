"use client";

import { useActionState, useState } from "react";
import { login } from "../actions";

export function LoginForm({ autoFocus = true }: { autoFocus?: boolean }) {
  const [state, action, pending] = useActionState(login, {});
  // 휴대폰에서 빠르게 치면 키가 빠질 수 있어, 입력한 글자를 직접 확인할 수 있게 한다
  const [shown, setShown] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-2.5">
      <label htmlFor="admin-pw" className="text-[13px] font-semibold text-muted">
        운영진 공용 비밀번호
      </label>
      <div className="relative">
        <input
          id="admin-pw"
          type={shown ? "text" : "password"}
          name="password"
          required
          autoFocus={autoFocus}
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="비밀번호"
          className="h-12 w-full rounded-xl border border-edge pr-16 pl-3.5 text-[17px] text-foreground outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-pressed={shown}
          className="absolute inset-y-0 right-0 min-w-11 px-3.5 text-sm text-link"
        >
          {shown ? "숨기기" : "보기"}
        </button>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button
        disabled={pending}
        className="flex h-12 items-center justify-center rounded-full bg-accent text-[17px] font-semibold text-white disabled:opacity-40"
      >
        {pending ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}
