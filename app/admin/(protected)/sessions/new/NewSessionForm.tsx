"use client";

import { useActionState } from "react";
import { createSession } from "../actions";

export function NewSessionForm({ today, defaultFee }: { today: string; defaultFee: number }) {
  const [state, action, pending] = useActionState(createSession, {});

  return (
    <form action={action} className="flex flex-col gap-4 p-4">
      <label className="flex flex-col gap-1 text-sm font-bold">
        날짜
        <input
          type="date"
          name="date"
          required
          defaultValue={today}
          className="h-12 rounded-xl border-2 border-line px-3 text-base font-normal outline-none focus:border-brand"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-bold">
        1인 1게임 게임비 (원)
        <input
          type="number"
          name="fee"
          inputMode="numeric"
          min={0}
          step={100}
          required
          defaultValue={defaultFee}
          className="h-12 rounded-xl border-2 border-line px-3 text-base font-normal outline-none focus:border-brand"
        />
      </label>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <button disabled={pending} className="h-14 rounded-xl bg-brand text-base font-bold text-white disabled:opacity-60">
        {pending ? "만드는 중…" : "만들고 참석 체크 →"}
      </button>
    </form>
  );
}
