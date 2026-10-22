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
      <div className="m-4 flex items-center justify-between rounded-2xl border border-line p-4">
        <div>
          <p className="text-xs text-muted">1인 1게임 게임비</p>
          <p className="mt-0.5 text-xl font-bold">{formatWon(fee)}</p>
        </div>
        <button onClick={() => setEditing(true)} className="text-sm text-brand underline">
          수정
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="m-4 flex flex-col gap-2 rounded-2xl border-2 border-brand p-4">
      <label className="text-xs text-muted" htmlFor="fee">
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
          className="h-12 min-w-0 flex-1 rounded-xl border-2 border-line px-3 text-lg font-bold outline-none focus:border-brand"
        />
        <button disabled={pending} className="rounded-xl bg-brand px-4 font-bold text-white disabled:opacity-60">
          저장
        </button>
        <button type="button" onClick={() => setEditing(false)} className="px-2 text-sm text-muted">
          취소
        </button>
      </div>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
    </form>
  );
}
