import { MemberInsights } from "@/components/MemberInsights";
import { TierBadge } from "@/components/TierBadge";
import { legacyScores, playedGames } from "@/lib/db/memberRecord";
import type { MemberWithStats } from "@/lib/db/members";
import { getSettings } from "@/lib/db/settings";
import { memberInsights } from "@/lib/insights";

/** 회원 기록 (내 기록·다른 회원 기록 공용, 조회 전용) */
export async function MemberProfile({ member, members }: { member: MemberWithStats; members: MemberWithStats[] }) {
  const [games, legacy, settings] = await Promise.all([
    playedGames(member.id),
    legacyScores(member.id),
    getSettings(),
  ]);
  const byId = new Map(members.map((m) => [m.id, m]));

  return (
    <>
      <div className="mx-4 mt-4 flex items-center gap-2">
        <TierBadge tier={member.tier} />
        <span className="text-xl font-bold">{member.name}</span>
      </div>
      <MemberInsights
        avg={member.avg}
        games={member.games}
        recentAvg={member.recentAvg}
        recentGames={member.recentGames}
        recentN={settings.recent_n}
        insights={memberInsights(member.id, games)}
        legacy={legacy}
        profileHref={(m) => `/members/${m}`}
        nameOf={(m) => byId.get(m)?.name ?? "?"}
        tierOf={(m) => byId.get(m)?.tier ?? null}
      />
    </>
  );
}
