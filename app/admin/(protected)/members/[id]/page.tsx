import Link from "next/link";
import { notFound } from "next/navigation";
import { MemberInsights } from "@/components/MemberInsights";
import { PageHeader } from "@/components/PageHeader";
import { tierLabel } from "@/components/TierBadge";
import { playedGames } from "@/lib/db/memberRecord";
import { getMember, listMembers } from "@/lib/db/members";
import { getSettings } from "@/lib/db/settings";
import { suggestTier, tierReferences } from "@/lib/domain/tiers";
import { memberInsights } from "@/lib/insights";
import { updateMember } from "../actions";
import { MemberForm } from "../MemberForm";

export default async function MemberDetailPage({ params }: PageProps<"/admin/members/[id]">) {
  const { id } = await params;
  const data = await getMember(id);
  if (!data) notFound();
  const [members, games, settings] = await Promise.all([listMembers(), playedGames(id), getSettings()]);
  const { tierChanges } = data;
  const member = members.find((m) => m.id === id)!;

  const byId = new Map(members.map((m) => [m.id, m]));
  const insights = memberInsights(id, games);
  const refs = tierReferences(members);
  const suggestion = suggestTier(member, refs);

  // 티어 변경 사유 초안: 숫자 근거를 미리 채워 둔다
  const lower = insights.byTier.filter((t) => member.tier !== null && t.tier < member.tier);
  const vsUpper = lower.reduce(
    (acc, t) => ({ wins: acc.wins + t.wins, losses: acc.losses + t.losses }),
    { wins: 0, losses: 0 },
  );
  const draftReason =
    suggestion.kind === "none"
      ? undefined
      : [
          `최근 ${member.recentGames}게임 에버 ${suggestion.recentAvg.toFixed(1)} (전체 ${member.avg?.toFixed(1) ?? "—"})`,
          `${tierLabel(suggestion.to)} 경계 ${suggestion.threshold.toFixed(1)} ${suggestion.kind === "up" ? "이상" : "이하"}`,
          vsUpper.wins + vsUpper.losses > 0 ? `상위 티어 상대 ${vsUpper.wins}승 ${vsUpper.losses}패` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <div className="pb-6">
      <PageHeader
        title={member.name}
        action={
          <Link href="/admin/members" className="text-sm text-muted underline">
            목록
          </Link>
        }
      />

      {suggestion.kind !== "none" && (
        <div
          className={`mx-4 mt-4 rounded-2xl p-4 text-sm ${
            suggestion.kind === "up" ? "bg-green-50 text-green-900" : "bg-red-50 text-red-900"
          }`}
        >
          <p className="font-bold">
            {suggestion.kind === "up" ? "⬆ 승급 후보" : "⬇ 강등 후보"} · {tierLabel(member.tier)} →{" "}
            {tierLabel(suggestion.to)}
          </p>
          <p className="mt-1">
            최근 {member.recentGames}게임 에버 <b>{suggestion.recentAvg.toFixed(1)}</b>가 {tierLabel(suggestion.to)}{" "}
            경계({tierLabel(member.tier)} 기준 {refs[member.tier!].toFixed(0)}과 {tierLabel(suggestion.to)} 기준{" "}
            {refs[suggestion.to].toFixed(0)}의 중간) <b>{suggestion.threshold.toFixed(1)}</b>
            {suggestion.kind === "up" ? "을 넘었어요." : "보다 낮아요."}
          </p>
          <p className="mt-1 text-xs opacity-70">결정은 아래 상대 전적까지 보고 운영진이 사유와 함께 내려요.</p>
        </div>
      )}

      <MemberInsights
        avg={member.avg}
        games={member.games}
        recentAvg={member.recentAvg}
        recentGames={member.recentGames}
        recentN={settings.recent_n}
        insights={insights}
        nameOf={(m) => byId.get(m)?.name ?? "?"}
        tierOf={(m) => byId.get(m)?.tier ?? null}
      />

      <h2 className="px-4 pt-6 text-sm font-bold">회원 정보 · 티어 변경</h2>
      <MemberForm
        action={updateMember.bind(null, member.id)}
        initial={member}
        isNew={false}
        suggestion={suggestion.kind === "none" ? undefined : { tier: suggestion.to, reason: draftReason! }}
      />

      <section className="px-4">
        <h2 className="mb-2 text-sm font-bold">티어 변경 이력</h2>
        {tierChanges.length === 0 ? (
          <p className="text-sm text-muted">아직 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {tierChanges.map((c) => (
              <li key={c.id} className="rounded-xl bg-background p-3 text-sm">
                <p className="font-bold">
                  {tierLabel(c.from_tier)} → {tierLabel(c.to_tier)}
                  <span className="ml-2 text-xs font-normal text-muted">
                    {new Date(c.created_at).toLocaleDateString("ko-KR")}
                  </span>
                </p>
                <p className="mt-1 whitespace-pre-wrap text-muted">{c.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
