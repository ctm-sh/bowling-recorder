"use client";

import { useActionState } from "react";
import { BottomBar } from "@/components/Flow";
import { primaryButton } from "@/components/ui";
import { createRankingMatch } from "../actions";

export function NewMatchForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(createRankingMatch, {});

  return (
    <form action={action}>
      <div className="mx-5 mt-5 overflow-hidden rounded-2xl bg-surface">
        <div className="flex min-h-[52px] items-center px-4">
          <label htmlFor="match-date" className="flex-1 text-base">
            날짜
          </label>
          <input
            id="match-date"
            type="date"
            name="date"
            required
            defaultValue={today}
            className="bg-transparent text-right text-base text-accent outline-none"
          />
        </div>
      </div>
      <p className="px-6 pt-2 text-xs text-muted">랭킹전은 달로 구분돼요. 같은 달에는 한 번만 만들 수 있어요.</p>

      <BottomBar>
        {state.error && <p className="text-center text-sm text-danger">{state.error}</p>}
        <button disabled={pending} className={primaryButton}>
          {pending ? "만드는 중…" : "만들고 참가자 고르기"}
        </button>
      </BottomBar>
    </form>
  );
}
