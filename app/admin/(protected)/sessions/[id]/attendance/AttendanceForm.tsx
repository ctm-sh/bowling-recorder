"use client";

import { useActionState, useState } from "react";
import { BottomBar } from "@/components/Flow";
import { Icon } from "@/components/Icon";
import { tierLabel } from "@/components/TierBadge";
import { primaryButton } from "@/components/ui";
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

      <div className="flex items-baseline justify-between px-5 pt-6 pb-2">
        <h2 className="text-xl font-bold">
          참석자 <span className="text-accent">{checked.size}</span>명
        </h2>
        <span className="text-[13px] text-muted">최근 참석 순</span>
      </div>
      <div className="mx-5 mb-2.5">
        <label htmlFor="att-search" className="sr-only">
          회원 검색
        </label>
        <div className="flex h-10 items-center gap-2 rounded-[10px] bg-fill px-3">
          <Icon name="search" size={16} strokeWidth={2} className="text-muted" />
          <input
            id="att-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`${candidates.length}명 중 검색`}
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted"
          />
        </div>
      </div>

      <ul className="mx-5 overflow-hidden rounded-2xl bg-surface">
        {visible.map((c) => {
          const on = checked.has(c.id);
          const isLocked = lockedSet.has(c.id);
          return (
            <li key={c.id} className="border-b border-separator last:border-b-0">
              <button
                type="button"
                onClick={() => toggle(c.id)}
                aria-pressed={on}
                className="flex min-h-[50px] w-full items-center gap-3 px-4 py-1.5 text-left"
              >
                <span
                  aria-hidden
                  className={`flex size-[22px] shrink-0 items-center justify-center rounded-md border ${
                    on ? "border-accent bg-accent text-white" : "border-edge"
                  } ${isLocked ? "opacity-50" : ""}`}
                >
                  {on && <Icon name="check" size={16} strokeWidth={2.6} />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-base">{c.name}</span>
                  {isLocked && <span className="text-xs text-muted">게임 참여 중 · 해제할 수 없어요</span>}
                </span>
                <span className="text-right text-[13px] text-muted">
                  {tierLabel(c.tier)} · {c.avg === null ? "기록 없음" : `에버 ${Math.round(c.avg)}`}
                  {c.lastAttended && <span className="block text-xs">최근 10회 중 {c.recentCount}회</span>}
                </span>
              </button>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="px-4 py-5 text-[15px] text-muted">&ldquo;{q}&rdquo; 이름을 찾을 수 없어요.</li>
        )}
      </ul>

      <BottomBar>
        {state.error && <p className="text-center text-sm text-danger">{state.error}</p>}
        <button disabled={pending} className={primaryButton}>
          {pending ? "저장 중…" : `${checked.size}명 참석 저장`}
        </button>
      </BottomBar>
    </form>
  );
}
