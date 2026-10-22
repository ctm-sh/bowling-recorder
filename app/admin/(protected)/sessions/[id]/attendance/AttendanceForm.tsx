"use client";

import { useActionState, useState } from "react";
import { TierBadge } from "@/components/TierBadge";
import type { Candidate } from "@/lib/db/sessions";
import type { FormState } from "../../actions";

export function AttendanceForm({
  action,
  candidates,
  initial,
  locked,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  candidates: Candidate[];
  initial: string[];
  locked: string[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [checked, setChecked] = useState(() => new Set(initial));
  const [query, setQuery] = useState("");
  const lockedSet = new Set(locked);

  function toggle(id: string) {
    if (lockedSet.has(id)) return;
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const q = query.trim();
  const visible = candidates.filter((c) => !q || c.name.includes(q));

  return (
    <form action={formAction}>
      {[...checked].map((id) => (
        <input key={id} type="hidden" name="member" value={id} />
      ))}

      <div className="sticky top-14 z-10 border-b border-line bg-surface p-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름 검색"
          className="h-11 w-full rounded-xl border-2 border-line px-3 outline-none focus:border-brand"
        />
      </div>

      <ul className="pb-24">
        {visible.map((c) => {
          const on = checked.has(c.id);
          return (
            <li key={c.id} className="border-b border-line">
              <button
                type="button"
                onClick={() => toggle(c.id)}
                aria-pressed={on}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left ${on ? "bg-brand-soft" : ""}`}
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-md border-2 text-sm font-bold ${
                    on ? "border-brand bg-brand text-white" : "border-line"
                  }`}
                  aria-hidden
                >
                  {on && "✓"}
                </span>
                <TierBadge tier={c.tier} />
                <span className="font-bold">{c.name}</span>
                {lockedSet.has(c.id) && <span className="text-xs text-muted">게임 참여 중</span>}
                <span className="ml-auto text-right text-xs text-muted">
                  {c.avg === null ? "기록 없음" : `에버 ${Math.round(c.avg)}`}
                  {c.lastAttended && <span className="block">최근 10회 중 {c.recentCount}회</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="fixed inset-x-0 bottom-16 z-20 mx-auto max-w-[480px] border-t border-line bg-surface p-3">
        {state.error && <p className="mb-2 text-sm text-danger">{state.error}</p>}
        <button
          disabled={pending}
          className="h-14 w-full rounded-xl bg-brand text-base font-bold text-white disabled:opacity-60"
        >
          {pending ? "저장 중…" : `${checked.size}명 참석 저장`}
        </button>
      </div>
    </form>
  );
}
