import type { Charge } from "@/lib/domain/result";
import type { RankedTeam } from "@/lib/domain/types";
import { formatWon } from "@/lib/format";
import { teamColor } from "@/lib/teamColors";

// B안 전광판: 운영진 결과 화면과 회원 조회 화면에서 함께 쓴다 (조회 전용)
export function GameBoard({
  ranked,
  nameOf,
  puppets,
  complete,
  missing,
  charges,
  highlightMemberId,
}: {
  ranked: RankedTeam[];
  nameOf: (memberId: string) => string;
  /** 팀 번호 → 꼭두각시 점수 */
  puppets: Record<number, number | null>;
  complete: boolean;
  missing: number;
  charges: Charge[];
  highlightMemberId?: string;
}) {
  const lastRank = ranked.length;
  const chargeOf = new Map(charges.map((c) => [c.memberId, c]));
  const payers = charges.filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount);

  return (
    <div className="bg-[#0b0f1a] pb-6 text-gray-100">
      {/* 스코어보드 */}
      <div className="flex gap-2 overflow-x-auto bg-black px-3 py-4">
        {ranked.map((t) => (
          <div key={t.teamNo} className="min-w-20 flex-1 rounded-xl bg-[#111827] px-2 py-2 text-center">
            <b className="block font-mono text-3xl" style={{ color: teamColor(t.teamNo) }}>
              {t.total}
            </b>
            <span className="text-xs text-gray-300">
              {complete && t.rank === 1 && "🥇 "}
              {complete && t.rank === lastRank && "💸 "}
              {t.teamNo}팀
            </span>
          </div>
        ))}
      </div>

      {!complete && (
        <p className="mx-4 mt-3 rounded-lg bg-[#1f2937] px-3 py-2 text-center text-sm text-amber-300">
          점수 입력 중 · {missing}명 남음
        </p>
      )}

      {/* 팀 카드: 좌우로 넘겨 보기 */}
      <div className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
        {ranked.map((t) => {
          const color = teamColor(t.teamNo);
          const puppet = puppets[t.teamNo];
          return (
            <section
              key={t.teamNo}
              className="w-[85%] shrink-0 snap-center rounded-2xl border-2 bg-[#0f1524] p-4"
              style={{ borderColor: color, boxShadow: `0 0 18px ${color}33` }}
            >
              <h2 className="flex items-baseline justify-between">
                <span className="text-xl font-bold" style={{ color }}>
                  {t.rank}위 · {t.teamNo}팀
                </span>
                {t.handicap > 0 && <span className="text-sm text-gray-400">핸디 +{t.handicap}</span>}
              </h2>
              <ul className="mt-2 font-mono">
                {t.members.map((m) => {
                  const c = chargeOf.get(m.memberId);
                  return (
                    <li
                      key={m.memberId}
                      className={`flex items-center gap-2 border-b border-dashed border-[#263041] py-1.5 ${
                        m.memberId === highlightMemberId ? "text-amber-300" : ""
                      }`}
                    >
                      <span className="font-sans">{nameOf(m.memberId)}</span>
                      {m.handicap > 0 && <span className="text-xs text-gray-400">+{m.handicap}</span>}
                      <span className="ml-auto text-lg">{m.score || "—"}</span>
                      {complete && c && (
                        <span className={`w-16 text-right text-xs ${c.amount > 0 ? "text-rose-300" : "text-gray-500"}`}>
                          {c.amount > 0 ? formatWon(c.amount) : "0원"}
                        </span>
                      )}
                    </li>
                  );
                })}
                {puppet !== null && puppet !== undefined && (
                  <li className="flex items-center gap-2 py-1.5 text-gray-400">
                    <span className="font-sans">🎎 꼭두각시</span>
                    <span className="ml-auto text-sm">핸디에 포함 ({puppet})</span>
                  </li>
                )}
              </ul>
              <p className="mt-3 text-right font-mono text-2xl font-extrabold">
                <span className="text-base text-gray-400">
                  {t.raw}
                  {t.handicap > 0 && ` + ${t.handicap}`} ={" "}
                </span>
                <span style={{ color }}>{t.total}</span>
              </p>
            </section>
          );
        })}
      </div>

      {complete && payers.length > 0 && (
        <div className="mx-4 mt-4 rounded-2xl bg-[#3b0d16] p-4 text-rose-200">
          <p className="font-bold">💸 이번 게임 낼 사람</p>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {payers.map((c) => (
              <li key={c.memberId} className="flex justify-between">
                <span>
                  {nameOf(c.memberId)}
                  {c.kind === "self" && <span className="ml-1 text-xs opacity-70">자기 몫</span>}
                </span>
                <span className="font-mono">{formatWon(c.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
