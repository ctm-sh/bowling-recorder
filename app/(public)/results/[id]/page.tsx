import { notFound } from "next/navigation";
import { ChargeSummary, Scoreboard, ScoreTable, TeamCards } from "@/components/GameResult";
import { Empty, PageHeader } from "@/components/PageHeader";
import { Segmented, SectionTitle } from "@/components/ui";
import { listMembers } from "@/lib/db/members";
import { getSessionResults } from "@/lib/db/results";
import { getSession } from "@/lib/db/sessions";
import { totalsByMember } from "@/lib/domain/settlement";
import { formatAmount, formatDateLong } from "@/lib/format";
import { getMeId } from "@/lib/me";

export default async function SessionResultPage({ params, searchParams }: PageProps<"/results/[id]">) {
  const { id } = await params;
  const { tab } = await searchParams;
  const data = await getSession(id);
  if (!data) notFound();
  const { session, attendeeIds } = data;
  const [results, members, meId] = await Promise.all([
    getSessionResults(id, session.fee_per_game),
    listMembers(),
    getMeId(),
  ]);

  const names = new Map(members.map((m) => [m.id, m.name]));
  const nameOf = (m: string) => names.get(m) ?? "?";
  const done = results.filter((r) => r.complete);
  const totals = totalsByMember(done.map((r) => ({ gameNo: r.game.game_no, ranked: r.ranked, charges: r.charges })));
  // 사람별 게임마다 낸 금액 (정산 탭의 "게임별" 줄)
  const perGame = (memberId: string) =>
    done.map((r) => formatAmount(r.charges.find((c) => c.memberId === memberId)?.amount ?? 0)).join(" · ");

  // 탭: 게임 번호 또는 정산. 기본은 첫 게임.
  const selected = tab === "settle" ? "settle" : (results.find((r) => String(r.game.game_no) === tab) ?? results[0]);
  const options = [
    ...results.map((r) => ({
      key: String(r.game.game_no),
      label: `${r.game.game_no}게임`,
      href: `?tab=${r.game.game_no}`,
    })),
    { key: "settle", label: "정산", href: "?tab=settle" },
  ];
  const me = meId ?? undefined;

  return (
    <div className="screen-dark min-h-dvh bg-black pb-6 text-white">
      <PageHeader
        dark
        back="/results"
        backLabel="정모 목록"
        topRight={<span className="text-xs text-dark-muted">조회 전용</span>}
        title={`${formatDateLong(session.date).split(" (")[0]} 정모`}
        sub={`${attendeeIds.length}명 · ${results.length}게임 · 1인 1게임 ${formatAmount(session.fee_per_game)}원`}
      />

      {results.length === 0 ? (
        <Empty dark>아직 게임이 없어요.</Empty>
      ) : (
        <>
          <Segmented
            dark
            label="게임 선택"
            options={options}
            value={selected === "settle" ? "settle" : String(selected!.game.game_no)}
            className="mx-5 mt-4"
          />

          {selected === "settle" ? (
            <>
              <p className="px-5 pt-4 text-[13px] text-dark-muted">
                {session.closed_at ? "정모 마감 · " : "진행 중 · 점수가 다 들어온 게임만 · "}1/N은 100원 단위 올림
              </p>
              {totals.length === 0 ? (
                <Empty dark>아직 정산할 게임이 없어요.</Empty>
              ) : (
                <div className="mx-5 mt-3 overflow-hidden rounded-2xl bg-dark-surface">
                  {totals.map((t) => (
                    <div
                      key={t.memberId}
                      className={`flex min-h-[52px] items-center gap-3 border-b border-dark-separator px-4 py-1.5 last:border-b-0 ${
                        t.memberId === me ? "bg-dark-me" : ""
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className={`text-base ${t.memberId === me ? "font-bold" : "font-medium"}`}>
                          {nameOf(t.memberId)}
                        </span>
                        <span className="truncate text-[11px] text-dark-muted">게임별 {perGame(t.memberId)}</span>
                      </div>
                      <span className="text-lg font-bold">{formatAmount(t.total)}원</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <Scoreboard
                ranked={selected!.ranked}
                puppets={Object.fromEntries(selected!.game.teams.map((t) => [t.team_no, t.fill_score]))}
                complete={selected!.complete}
                missing={selected!.missing}
              />
              {selected!.complete && (
                <ChargeSummary
                  ranked={selected!.ranked}
                  charges={selected!.charges}
                  nameOf={nameOf}
                  fee={session.fee_per_game}
                />
              )}

              <SectionTitle dark note="옆으로 넘겨보기">
                팀별 점수
              </SectionTitle>
              <TeamCards
                ranked={selected!.ranked}
                puppets={Object.fromEntries(selected!.game.teams.map((t) => [t.team_no, t.fill_score]))}
                nameOf={nameOf}
                scored={selected!.scores}
                highlightMemberId={me}
              />

              <SectionTitle dark>전체 점수표</SectionTitle>
              <ScoreTable ranked={selected!.ranked} nameOf={nameOf} scored={selected!.scores} highlightMemberId={me} />
            </>
          )}
        </>
      )}
    </div>
  );
}
