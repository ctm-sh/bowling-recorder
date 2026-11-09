"use client";

import { useState, useTransition } from "react";
import { BottomBar } from "@/components/Flow";
import { primaryButton } from "@/components/ui";

type Entry = { memberId: string; name: string; rank: number; total: number; handicap: number };

export function MastersPick({
  entries,
  initialSize,
  initialExcluded,
  save,
}: {
  entries: Entry[];
  initialSize: number;
  initialExcluded: string[];
  save: (size: number, excluded: string[]) => Promise<{ error?: string }>;
}) {
  const [size, setSize] = useState(String(initialSize));
  const [excluded, setExcluded] = useState(() => new Set(initialExcluded));
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const n = Number(size);
  const validSize = Number.isInteger(n) && n >= 2 && n <= entries.length;
  const available = entries.filter((e) => !excluded.has(e.memberId));
  const picks = new Set(validSize ? available.slice(0, n).map((e) => e.memberId) : []);
  const last = validSize ? available[n - 1] : undefined;
  const next = validSize ? available[n] : undefined;
  // 총점과 핸디까지 같아 순위로 가를 수 없을 때는 운영진이 한 명을 제외해서 정한다
  const tiedCut = !!last && !!next && last.total === next.total && last.handicap === next.handicap;
  const problem = !validSize
    ? `진출 인원은 2~${entries.length}명으로 입력해주세요.`
    : available.length < n
      ? "제외한 사람이 많아 진출 인원을 채울 수 없어요."
      : null;

  function toggle(id: string) {
    setExcluded((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(id)) nextSet.delete(id);
      else nextSet.add(id);
      return nextSet;
    });
  }

  function confirm() {
    setError(undefined);
    startTransition(async () => {
      const result = await save(n, [...excluded]);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div>
      <div className="mx-5 mt-5 flex min-h-[52px] items-center rounded-2xl bg-surface px-4">
        <label htmlFor="masters-size" className="flex-1 text-base">
          진출 인원
        </label>
        <input
          id="masters-size"
          type="number"
          inputMode="numeric"
          min={2}
          max={entries.length}
          value={size}
          onChange={(e) => setSize(e.target.value)}
          onFocus={(e) => e.target.select()}
          className="w-14 bg-transparent text-right text-base text-accent outline-none"
        />
        <span className="pl-0.5 text-base text-accent">명</span>
      </div>
      <p className="px-6 pt-2 text-xs leading-normal text-muted">
        3게임 개인 순위대로 채워져요. 불참하는 사람을 제외하면 다음 순위가 올라와요.
      </p>
      {tiedCut && (
        <p className="mx-5 mt-2 rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">
          {last.name}님과 {next.name}님이 동점이에요. 합의해서 진출하지 않는 사람을 제외해주세요.
        </p>
      )}

      <ul className="mx-5 mt-3 overflow-hidden rounded-2xl bg-surface">
        {entries.map((e) => {
          const out = excluded.has(e.memberId);
          const picked = picks.has(e.memberId);
          return (
            <li key={e.memberId} className="flex min-h-[52px] items-center gap-3 border-b border-separator px-4 py-1 last:border-b-0">
              <span className="w-5 text-center text-[15px] font-bold">{e.rank}</span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-base ${out ? "text-muted line-through" : ""}`}>{e.name}</span>
                <span className={`text-xs ${picked ? "font-semibold text-accent" : "text-muted"}`}>
                  {e.total}점{picked && " · 진출"}
                </span>
              </span>
              <button
                type="button"
                onClick={() => toggle(e.memberId)}
                aria-pressed={out}
                aria-label={`${e.name} ${out ? "제외 취소" : "제외"}`}
                className="min-h-11 px-2 text-[15px] text-link"
              >
                {out ? "되돌리기" : "제외"}
              </button>
            </li>
          );
        })}
      </ul>

      <BottomBar>
        {(error || problem) && <p className="text-center text-sm text-danger">{error ?? problem}</p>}
        <button onClick={confirm} disabled={pending || !!problem} className={primaryButton}>
          {pending ? "저장 중…" : "진출자 확정"}
        </button>
      </BottomBar>
    </div>
  );
}
