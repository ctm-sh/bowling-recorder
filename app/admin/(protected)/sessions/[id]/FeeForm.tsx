"use client";

import { useActionState, useState } from "react";
import { formatWon } from "@/lib/format";
import type { FormState } from "../actions";

export function FeeForm({
  action,
  fee,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  fee: number;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="mx-5 mt-4 flex min-h-[52px] items-center gap-2 rounded-2xl bg-surface px-4">
        <span className="flex-1 text-base">
          게임비 <span className="text-[13px] text-muted">1인 1게임</span>
        </span>
        <span className="text-base">{formatWon(fee)}</span>
        <button onClick={() => setEditing(true)} className="min-h-11 pl-2 text-[15px] text-link">
          수정
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="mx-5 mt-4 flex flex-col gap-2 rounded-2xl bg-surface p-4 ring-2 ring-accent">
      <label className="text-[13px] font-semibold text-muted" htmlFor="fee">
        1인 1게임 게임비 (원)
      </label>
      <div className="flex gap-2">
        <input
          id="fee"
          type="number"
          name="fee"
          inputMode="numeric"
          min={0}
          step={100}
          required
          autoFocus
          defaultValue={fee}
          className="h-12 min-w-0 flex-1 rounded-xl border border-edge px-3.5 text-[17px] outline-none focus:border-accent"
        />
        <button disabled={pending} className="rounded-full bg-accent px-5 font-semibold text-white disabled:opacity-40">
          저장
        </button>
        <button type="button" onClick={() => setEditing(false)} className="px-2 text-[15px] text-link">
          취소
        </button>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
