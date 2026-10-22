"use client";

import { useActionState } from "react";
import { BottomBar } from "@/components/Flow";
import { primaryButton } from "@/components/ui";
import { createSession } from "../actions";

export function NewSessionForm({ today, defaultFee }: { today: string; defaultFee: number }) {
  const [state, action, pending] = useActionState(createSession, {});

  return (
    <form action={action}>
      <div className="mx-5 mt-5 overflow-hidden rounded-2xl bg-surface">
        <div className="flex min-h-[52px] items-center border-b border-separator px-4">
          <label htmlFor="session-date" className="flex-1 text-base">
            날짜
          </label>
          <input
            id="session-date"
            type="date"
            name="date"
            required
            defaultValue={today}
            className="bg-transparent text-right text-base text-accent outline-none"
          />
        </div>
        <div className="flex min-h-[52px] items-center px-4">
          <label htmlFor="session-fee" className="flex-1 text-base">
            게임비 <span className="text-[13px] text-muted">1인 1게임</span>
          </label>
          <input
            id="session-fee"
            type="number"
            name="fee"
            inputMode="numeric"
            min={0}
            step={100}
            required
            defaultValue={defaultFee}
            className="w-24 bg-transparent text-right text-base text-accent outline-none"
          />
          <span className="pl-0.5 text-base text-accent">원</span>
        </div>
      </div>
      <p className="px-6 pt-2 text-xs text-muted">만들고 나서 참석자를 골라요.</p>

      <BottomBar>
        {state.error && <p className="text-center text-sm text-danger">{state.error}</p>}
        <button disabled={pending} className={primaryButton}>
          {pending ? "만드는 중…" : "만들고 참석자 고르기"}
        </button>
      </BottomBar>
    </form>
  );
}
