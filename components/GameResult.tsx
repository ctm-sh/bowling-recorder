import type { Charge } from "@/lib/domain/result";
import type { RankedTeam } from "@/lib/domain/types";
import { formatAmount } from "@/lib/format";
import { Icon } from "./Icon";
import { TeamBadge, teamName } from "./TeamBadge";

// 결과 화면(어두운 화면) 조각들. 회원 결과와 운영진 게임 결과가 함께 쓴다. 모두 조회 전용.

type Puppets = Record<number, number | null>;

function handiNote(t: RankedTeam, puppets: Puppets) {
  const puppet = puppets[t.teamNo];
  return `${t.raw} + 핸디 ${t.handicap}${puppet !== null && puppet !== undefined ? ` (꼭두각시 ${puppet})` : ""}`;
}

/** 스코어보드 행: 순위 + 팀 배지 + 팀명/계산식 + 큰 팀 점수. 점수가 다 들어오면 1등 행만 파랑. */
export function Scoreboard({
  ranked,
  puppets,
  complete,
  missing,
}: {
  ranked: RankedTeam[];
  puppets: Puppets;
  complete: boolean;
  missing: number;
}) {
  return (
    <div className="flex flex-col gap-2.5 px-5 pt-5">
      {!complete && (
        <p className="rounded-xl border border-dark-separator px-4 py-2.5 text-center text-sm text-dark-muted">
          점수 입력 중 · {missing}명 남음
        </p>
      )}
      {ranked.map((t) => {
        const first = complete && t.rank === 1;
        return (
          <div
            key={t.teamNo}
            className={`flex items-center gap-3.5 rounded-2xl p-4 ${first ? "bg-accent" : "bg-dark-surface"}`}
          >
            <span className={`w-7 text-[34px] font-bold ${first ? "" : "text-dark-muted"}`}>{t.rank}</span>
            <TeamBadge teamNo={t.teamNo} size={32} tone={first ? "onAccent" : "dark"} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-[17px] font-semibold">
                {teamName(t.teamNo)} · {t.members.length}명
              </span>
              <span className={`truncate text-[13px] ${first ? "text-[#e1edff]" : "text-dark-muted"}`}>
                {handiNote(t, puppets)}
              </span>
            </div>
            <span className="text-[34px] font-bold tracking-[-0.8px]">{t.total}</span>
          </div>
        );
      })}
    </div>
  );
}

/** 운영진 결과 화면의 상단 점수 카드 3칸 */
export function ScoreTiles({ ranked, complete }: { ranked: RankedTeam[]; complete: boolean }) {
  return (
    <div
      className="mx-5 mt-5 grid gap-2"
      style={{ gridTemplateColumns: ranked.map((_, i) => (i === 0 ? "1.3fr" : "1fr")).join(" ") }}
    >
      {ranked.map((t) => {
        const first = complete && t.rank === 1;
        return (
          <div
            key={t.teamNo}
            className={`flex min-w-0 flex-col gap-0.5 rounded-2xl p-3.5 ${first ? "bg-accent" : "bg-dark-surface"}`}
          >
            <span className={`text-[13px] ${first ? "font-semibold" : "text-dark-muted"}`}>
              {t.rank}등 · {teamName(t.teamNo)}
            </span>
            <span
              className={`font-bold ${first ? "text-[40px] leading-[1.1] tracking-[-1px]" : "text-[30px] leading-[1.2] tracking-[-0.6px]"}`}
            >
              {t.total}
            </span>
            <span className={`text-xs ${first ? "text-[#e1edff]" : "text-dark-muted"}`}>
              {t.raw} + {t.handicap}
            </span>
          </div>
        );
      })}
    </div>
  );
}

type ChargeRow = { key: string; title: string; amount: number; note: string; big: boolean };

/**
 * 게임 정산을 팀 단위로 풀어 쓴다 (계산은 settle()이 이미 끝낸 charges 그대로).
 * - 아래 팀: 1인 금액 + "3등 → 1등 A팀 3명분 + 자기 팀 3명분"
 * - 가운데 팀: 자기 게임비만
 * - 위 팀에서 인원이 많아 자기 몫을 내는 사람: 사람별로
 */
export function chargeRows(ranked: RankedTeam[], charges: Charge[], nameOf: (id: string) => string): ChargeRow[] {
  const k = ranked.length;
  const byRank = [...ranked].sort((a, b) => b.rank - a.rank);
  const rows: ChargeRow[] = [];
  for (const t of byRank) {
    const mine = charges.filter((c) => c.teamNo === t.teamNo);
    if (mine.length === 0) continue;
    const name = teamName(t.teamNo);
    if (mine.every((c) => c.kind === "loser")) {
      const partner = ranked.find((p) => p.rank === k + 1 - t.rank)!;
      const covered = Math.min(partner.members.length, t.members.length);
      rows.push({
        key: `t${t.teamNo}`,
        title: `${name} ${t.members.length}명 · 1인`,
        amount: mine[0].amount,
        note: `${t.rank}등 → ${partner.rank}등 ${teamName(partner.teamNo)} ${covered}명분 + 자기 팀 ${t.members.length}명분 = ${formatAmount(mine.reduce((s, c) => s + c.amount, 0))}원`,
        big: true,
      });
    } else if (mine.every((c) => c.kind === "self")) {
      rows.push({
        key: `t${t.teamNo}`,
        title: `${name} ${t.members.length}명 · 1인`,
        amount: mine[0].amount,
        note: "가운데 순위 · 자기 게임비만",
        big: false,
      });
    } else {
      const partner = ranked.find((p) => p.rank === k + 1 - t.rank)!;
      const extra = t.members.length - partner.members.length;
      for (const c of mine.filter((c) => c.kind === "self")) {
        const m = t.members.find((x) => x.memberId === c.memberId)!;
        rows.push({
          key: c.memberId,
          title: `${name} ${nameOf(c.memberId)}`,
          amount: c.amount,
          note: `${name}이 ${extra}명 더 많아 개인 최저(${m.score}+${m.handicap})가 자기 몫 부담`,
          big: false,
        });
      }
    }
  }
  return rows;
}

/** 운영진 결과: 이번 게임 정산 목록 */
export function ChargeList({
  ranked,
  charges,
  nameOf,
}: {
  ranked: RankedTeam[];
  charges: Charge[];
  nameOf: (id: string) => string;
}) {
  const rows = chargeRows(ranked, charges, nameOf);
  return (
    <div className="mx-5 overflow-hidden rounded-2xl bg-dark-surface">
      {rows.map((r) => (
        <div key={r.key} className="flex flex-col gap-1 border-b border-dark-separator px-4 py-3.5 last:border-b-0">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[15px] font-semibold">{r.title}</span>
            <span className={`font-bold ${r.big ? "text-[28px] tracking-[-0.5px]" : "text-[22px]"}`}>
              {formatAmount(r.amount)}원
            </span>
          </div>
          <span className="text-xs text-dark-muted">{r.note}</span>
        </div>
      ))}
    </div>
  );
}

/** 회원 결과: 이번 게임 1인 부담금 (팀별 한 칸) */
export function ChargeSummary({
  ranked,
  charges,
  nameOf,
  fee,
}: {
  ranked: RankedTeam[];
  charges: Charge[];
  nameOf: (id: string) => string;
  fee: number;
}) {
  const k = ranked.length;
  const byRank = [...ranked].sort((a, b) => b.rank - a.rank);
  return (
    <div className="mx-5 mt-4 flex flex-col gap-3 rounded-2xl border border-dark-separator p-4">
      <div className="flex items-center gap-2">
        <Icon name="wallet" size={20} />
        <span className="text-[15px] font-semibold">이번 게임 1인 부담금</span>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(k, 4)}, minmax(0, 1fr))` }}>
        {byRank.map((t) => {
          const mine = charges.filter((c) => c.teamNo === t.teamNo);
          const partner = ranked.find((p) => p.rank === k + 1 - t.rank);
          const selfPayers = mine.filter((c) => c.kind === "self");
          let amount = 0;
          let note = "";
          if (mine.every((c) => c.kind === "loser")) {
            amount = mine[0]?.amount ?? 0;
            note = partner
              ? `${teamName(partner.teamNo)} ${Math.min(partner.members.length, t.members.length)}명분 포함`
              : "";
          } else if (mine.every((c) => c.kind === "self")) {
            amount = fee;
            note = "자기 몫";
          } else if (selfPayers.length > 0) {
            note = `${selfPayers.map((c) => nameOf(c.memberId)).join(", ")}만 ${formatAmount(fee)}`;
          } else {
            note = "상대 팀이 냄";
          }
          return (
            <div key={t.teamNo} className="flex min-w-0 flex-col gap-0.5">
              <span className="text-xs text-dark-muted">
                {teamName(t.teamNo)} ({t.rank}등)
              </span>
              <span className="text-[22px] font-bold">{formatAmount(amount)}</span>
              <span className="text-[11px] text-dark-muted">{note}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 팀별 점수 카드 (옆으로 넘겨보기) */
export function TeamCards({
  ranked,
  puppets,
  nameOf,
  scored,
  highlightMemberId,
}: {
  ranked: RankedTeam[];
  puppets: Puppets;
  nameOf: (id: string) => string;
  /** 점수가 입력된 사람 */
  scored: Record<string, number>;
  highlightMemberId?: string;
}) {
  return (
    <div className="scrollbar-none flex snap-x scroll-px-5 gap-2.5 overflow-x-auto px-5 pb-1">
      {ranked.map((t) => {
        const puppet = puppets[t.teamNo];
        return (
          <div
            key={t.teamNo}
            className="flex w-[260px] shrink-0 snap-start flex-col gap-1 rounded-2xl bg-dark-surface px-4 py-3.5"
          >
            <div className="flex justify-between pb-1.5 text-[13px] text-dark-muted">
              <span>{teamName(t.teamNo)}</span>
              <span>{t.rank}등</span>
            </div>
            {t.members.map((m) => (
              <div
                key={m.memberId}
                className={`flex min-h-8 items-center text-[15px] ${m.memberId === highlightMemberId ? "font-bold" : ""}`}
              >
                <span className="flex-1 truncate">{nameOf(m.memberId)}</span>
                <span className="w-10 text-right text-xs text-dark-muted">
                  {m.handicap > 0 ? `+${m.handicap}` : ""}
                </span>
                <span className="w-11 text-right font-semibold">{scored[m.memberId] ?? "—"}</span>
              </div>
            ))}
            <div className="mt-1 flex justify-between gap-2 border-t border-dark-separator pt-2 text-[13px] text-dark-muted">
              <span className="truncate">
                핸디 {t.handicap > 0 ? `+${t.handicap}` : 0}
                {puppet !== null && puppet !== undefined && ` · 꼭두각시 ${puppet}`}
              </span>
              <span className="font-semibold text-white">{t.total}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 이 게임 전체 점수표 (점수 높은 순, 내 행 강조) */
export function ScoreTable({
  ranked,
  nameOf,
  scored,
  highlightMemberId,
}: {
  ranked: RankedTeam[];
  nameOf: (id: string) => string;
  scored: Record<string, number>;
  highlightMemberId?: string;
}) {
  const rows = ranked
    .flatMap((t) => t.members.map((m) => ({ ...m, teamNo: t.teamNo })))
    .sort((a, b) => (scored[b.memberId] ?? -1) - (scored[a.memberId] ?? -1));
  const grid = "grid grid-cols-[28px_minmax(0,1fr)_40px_52px_52px] gap-1.5 px-4";
  return (
    <div className="mx-5 overflow-hidden rounded-2xl bg-dark-surface">
      <div className={`${grid} border-b border-dark-separator py-2.5 text-xs text-dark-muted`}>
        <span>#</span>
        <span>이름</span>
        <span>팀</span>
        <span className="text-right">핸디</span>
        <span className="text-right">점수</span>
      </div>
      {rows.map((r, i) => {
        const me = r.memberId === highlightMemberId;
        return (
          <div key={r.memberId} className={`${grid} min-h-10 items-center text-[15px] ${me ? "bg-dark-me" : ""}`}>
            <span className="text-[13px] text-dark-muted">{i + 1}</span>
            <span className={`truncate ${me ? "font-bold" : ""}`}>{nameOf(r.memberId)}</span>
            <span className="text-dark-muted">{String.fromCharCode(64 + r.teamNo)}</span>
            <span className="text-right text-[13px] text-dark-muted">{r.handicap > 0 ? `+${r.handicap}` : ""}</span>
            <span className="text-right font-semibold">{scored[r.memberId] ?? "—"}</span>
          </div>
        );
      })}
    </div>
  );
}

/** 상대 대결: 같은 묶음끼리 한 줄. 점수+핸디가 가장 높은 사람을 파랑으로 (꼭두각시 포함). */
export function Duels({
  ranked,
  puppets,
  nameOf,
  scored,
}: {
  ranked: RankedTeam[];
  puppets: Puppets;
  nameOf: (id: string) => string;
  scored: Record<string, number>;
}) {
  const teams = [...ranked].sort((a, b) => a.teamNo - b.teamNo);
  const groups = [...new Set(teams.flatMap((t) => t.members.map((m) => m.groupNo)))].sort((a, b) => a - b);
  const lastGroup = Math.max(...groups);
  return (
    <div className="mx-5 overflow-hidden rounded-2xl bg-dark-surface">
      {groups.map((g) => {
        const cells = teams.map((t) => {
          const m = t.members.find((x) => x.groupNo === g);
          if (m) {
            const s = scored[m.memberId];
            return {
              key: m.memberId,
              name: nameOf(m.memberId),
              note: s === undefined ? "—" : `${s}+${m.handicap}`,
              value: s === undefined ? null : s + m.handicap,
            };
          }
          const puppet = puppets[t.teamNo];
          return g === lastGroup && puppet !== null && puppet !== undefined
            ? { key: `p${t.teamNo}`, name: "꼭두각시", note: String(puppet), value: puppet }
            : { key: `e${t.teamNo}`, name: "", note: "", value: null };
        });
        const best = Math.max(...cells.map((c) => c.value ?? -1));
        return (
          <div
            key={g}
            className="grid gap-1.5 border-b border-dark-separator px-4 py-2.5 last:border-b-0"
            style={{ gridTemplateColumns: `repeat(${teams.length}, minmax(0, 1fr))` }}
          >
            {cells.map((c) => {
              const win = c.value !== null && c.value === best && cells.filter((x) => x.value === best).length === 1;
              return (
                <div key={c.key} className="flex min-w-0 flex-col">
                  <span className={`truncate text-sm ${win ? "font-bold text-dark-link" : ""}`}>{c.name}</span>
                  <span className="text-xs text-dark-muted">{c.note}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
