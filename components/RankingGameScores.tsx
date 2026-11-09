"use client";

import { useState } from "react";
import { TeamBadge } from "@/components/TeamBadge";
import { Segmented } from "@/components/ui";

export type GameScoreGroup = {
  key: string;
  /** 점수 넘기기는 null */
  teamNo: number | null;
  fill: number | null;
  /** 점수가 하나도 없으면 null */
  total: number | null;
  people: { memberId: string; name: string; score: number | null; handicap: number }[];
};

export type GameScoreView = { gameNo: number; groups: GameScoreGroup[] };

/** 결과 화면의 게임별 점수 */
export function RankingGameScores({ games, initialGame }: { games: GameScoreView[]; initialGame: number }) {
  const [gameNo, setGameNo] = useState(initialGame);
  const game = games.find((g) => g.gameNo === gameNo)!;

  return (
    <>
      <Segmented
        label="게임 선택"
        value={String(gameNo)}
        onSelect={(key) => setGameNo(Number(key))}
        options={games.map((g) => ({ key: String(g.gameNo), label: `${g.gameNo}게임` }))}
        className="mx-5"
      />
      <div className="flex flex-col gap-2.5 px-5 pt-2.5">
        {game.groups.map((g) => (
          <section key={g.key} className="overflow-hidden rounded-2xl bg-surface">
            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
              {g.teamNo !== null ? (
                <TeamBadge teamNo={g.teamNo} />
              ) : (
                <span className="text-[15px] font-bold">참가자 전원</span>
              )}
              <span className="flex-1 text-xs text-muted">{g.fill !== null && `꼭두각시 ${g.fill}점 포함`}</span>
              <span className="text-[17px] font-bold">{g.total ?? "-"}</span>
            </div>
            <ul>
              {g.people.map((p) => (
                <li key={p.memberId} className="flex min-h-10 items-center gap-2 px-4 py-1">
                  <span className="min-w-0 flex-1 truncate text-[15px]">{p.name}</span>
                  <span className="text-[13px] text-muted">
                    {p.score ?? "-"} + 핸디 {p.handicap}
                  </span>
                  <span className="w-10 text-right text-[15px] font-semibold">
                    {p.score === null ? "-" : p.score + p.handicap}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
