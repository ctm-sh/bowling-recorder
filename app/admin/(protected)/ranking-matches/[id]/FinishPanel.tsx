"use client";

import { useState, useTransition } from "react";
import { BottomBar } from "@/components/Flow";
import { chip, GroupLabel, primaryButton } from "@/components/ui";
import { formatWon } from "@/lib/format";

type Person = { id: string; name: string };

/** 상금 대표자와 (공동 1등이면) 마스터즈 우승자를 고르고 마감한다 */
export function FinishPanel({
  prize,
  representatives,
  winners,
  close,
}: {
  prize: number;
  representatives: Person[];
  /** 마스터즈 1등. 동점이면 여러 명 */
  winners: Person[];
  close: (choice: { representativeId: string | null; mastersWinnerId: string | null }) => Promise<{ error?: string }>;
}) {
  const [representativeId, setRepresentativeId] = useState<string | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(winners.length === 1 ? winners[0].id : null);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const problem =
    prize > 0 && !representativeId ? "상금 받을 대표자를 골라주세요." : !winnerId ? "마스터즈 우승자를 골라주세요." : null;

  function confirm() {
    setError(undefined);
    startTransition(async () => {
      const result = await close({ representativeId, mastersWinnerId: winnerId });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <>
      {prize > 0 && (
        <section className="flex flex-col gap-2 px-5 pt-5">
          <GroupLabel>상금 {formatWon(prize)} 받을 대표자</GroupLabel>
          <ul className="flex flex-wrap gap-2">
            {representatives.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setRepresentativeId(p.id)}
                  aria-pressed={representativeId === p.id}
                  className={chip(representativeId === p.id)}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {winners.length > 1 && (
        <section className="flex flex-col gap-2 px-5 pt-5">
          <GroupLabel>마스터즈 공동 1등이에요. 우승자를 골라주세요.</GroupLabel>
          <ul className="flex flex-wrap gap-2">
            {winners.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setWinnerId(p.id)}
                  aria-pressed={winnerId === p.id}
                  className={chip(winnerId === p.id)}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <BottomBar>
        {(error || problem) && <p className="text-center text-sm text-danger">{error ?? problem}</p>}
        <button onClick={confirm} disabled={pending || !!problem} className={primaryButton}>
          {pending ? "마감 중…" : "랭킹전 마감"}
        </button>
      </BottomBar>
    </>
  );
}
