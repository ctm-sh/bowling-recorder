import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { MemberInsights } from "@/components/MemberInsights";
import { PageHeader } from "@/components/PageHeader";
import { tierLabel } from "@/components/TierBadge";
import { GroupLabel } from "@/components/ui";
import { legacyScores, playedGames } from "@/lib/db/memberRecord";
import { getMember, listMembers } from "@/lib/db/members";
import { getSettings } from "@/lib/db/settings";
import { effectiveTier, personalHandicap } from "@/lib/domain/teams";
import { suggestTier, tierReferences } from "@/lib/domain/tiers";
import { memberInsights } from "@/lib/insights";
import { updateMember } from "../actions";
import { CandidateBadge } from "../CandidateBadge";
import { MemberForm } from "../MemberForm";

export default async function MemberDetailPage({ params }: PageProps<"/admin/members/[id]">) {
  const { id } = await params;
  const data = await getMember(id);
  if (!data) notFound();
  const [members, games, legacy, settings] = await Promise.all([
    listMembers(),
    playedGames(id),
    legacyScores(id),
    getSettings(),
  ]);
  const { tierChanges } = data;
  const member = members.find((m) => m.id === id)!;

  const byId = new Map(members.map((m) => [m.id, m]));
  const insights = memberInsights(id, games);
  const refs = tierReferences(members);
  const suggestion = suggestTier(member, refs);
  const form = member.avg !== null && member.recentAvg !== null ? member.recentAvg - member.avg : null;

  // 티어 변경 사유 초안: 숫자 근거를 미리 채워 둔다
  const lower = insights.byTier.filter((t) => member.tier !== null && t.tier < member.tier);
  const vsUpper = lower.reduce((acc, t) => ({ wins: acc.wins + t.wins, losses: acc.losses + t.losses }), {
    wins: 0,
    losses: 0,
  });
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

  // 근거 2: 지금 나보다 위 티어인 상대와의 전적
  const upperOpponents = insights.opponents.filter((o) => {
    const t = byId.get(o.opponentId)?.tier;
    return member.tier !== null && t !== null && t !== undefined && t < member.tier;
  });

  return (
    <div className="pb-6">
      <PageHeader
        back="/admin/members"
        backLabel="회원"
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            {member.name}
            {suggestion.kind !== "none" && <CandidateBadge kind={suggestion.kind} />}
          </span>
        }
        sub={[
          `현재 ${tierLabel(member.tier)}`,
          `핸디 ${personalHandicap(effectiveTier(member.tier), settings.handicap_table)}`,
          `${member.games}게임`,
          !member.active && "휴면",
        ]
          .filter(Boolean)
          .join(" · ")}
      />

      <GroupLabel className="px-6 pt-5 pb-2">근거 1 · 점수</GroupLabel>
      <div className="mx-5 flex flex-col gap-3.5 rounded-2xl bg-surface p-4">
        <div className="grid grid-cols-3 gap-2">
          <Num label="전체 에버" value={member.avg === null ? "—" : member.avg.toFixed(1)} />
          <Num
            label={`최근 ${Math.min(settings.recent_n, member.recentGames)}게임`}
            value={member.recentAvg === null ? "—" : member.recentAvg.toFixed(1)}
          />
          <Num
            label="폼"
            value={form === null ? "—" : `${form > 0 ? "+" : ""}${form.toFixed(1)}`}
            accent={form !== null && form > 0}
          />
        </div>
        {member.tier !== null && member.avg !== null && member.recentAvg !== null && (
          <TierBand tier={member.tier} refs={refs} avg={member.avg} recent={member.recentAvg} />
        )}
        {suggestion.kind !== "none" ? (
          <p className="text-[13px] leading-normal text-muted">
            최근 {member.recentGames}게임 에버 <b className="text-foreground">{suggestion.recentAvg.toFixed(1)}</b>가{" "}
            {tierLabel(suggestion.to)} 경계({tierLabel(member.tier)} 기준 {refs[member.tier!].toFixed(0)}과{" "}
            {tierLabel(suggestion.to)} 기준 {refs[suggestion.to].toFixed(0)}의 중간){" "}
            <b className="text-foreground">{suggestion.threshold.toFixed(1)}</b>
            {suggestion.kind === "up" ? "을 넘었어요." : "보다 낮아요."} 결정은 상대 전적까지 보고 운영진이 사유와 함께
            내려요.
          </p>
        ) : (
          member.recentGames < 10 && (
            <p className="text-[13px] text-muted">최근 게임이 10게임 이상이어야 후보를 계산해요.</p>
          )
        )}
      </div>

      <GroupLabel className="px-6 pt-5 pb-2">근거 2 · 위 티어 상대 전적</GroupLabel>
      <div className="mx-5 overflow-hidden rounded-2xl bg-surface">
        {upperOpponents.map((o) => (
          <div key={o.opponentId} className="flex min-h-[52px] items-center border-b border-separator px-4">
            <span className="flex-1 text-base">
              {byId.get(o.opponentId)?.name ?? "?"}{" "}
              <span className="text-xs text-muted">{tierLabel(byId.get(o.opponentId)?.tier ?? null)}</span>
            </span>
            <span className="text-[15px] font-semibold">
              {o.wins}승 {o.losses}패{o.draws > 0 && ` ${o.draws}무`}
            </span>
          </div>
        ))}
        <div className="flex min-h-[52px] items-center bg-background px-4">
          <span className="flex-1 text-sm text-muted">위 티어 상대 합계 (그 게임 때 티어 기준)</span>
          <span className="text-[15px] font-bold">
            {vsUpper.wins + vsUpper.losses === 0
              ? "기록 없음"
              : `${vsUpper.wins}승 ${vsUpper.losses}패 · ${Math.round((vsUpper.wins / (vsUpper.wins + vsUpper.losses)) * 100)}%`}
          </span>
        </div>
      </div>

      <GroupLabel className="px-6 pt-5 pb-2">티어 이력</GroupLabel>
      <div className="mx-5 rounded-2xl bg-surface px-4 py-1">
        {tierChanges.length === 0 ? (
          <p className="py-3 text-[15px] text-muted">아직 없어요.</p>
        ) : (
          tierChanges.map((c) => (
            <div key={c.id} className="flex gap-3 border-b border-separator py-3 last:border-b-0">
              <span className="w-[72px] shrink-0 text-[13px] text-muted">
                {new Date(c.created_at).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }).replaceAll("-", ".")}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[15px] font-semibold">
                  {c.from_tier ?? "미정"} → {tierLabel(c.to_tier)}
                </span>
                <span className="text-[13px] leading-[1.45] whitespace-pre-wrap text-muted">{c.reason}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <MemberForm
        action={updateMember.bind(null, member.id)}
        initial={member}
        isNew={false}
        suggestion={suggestion.kind === "none" ? undefined : { tier: suggestion.to, reason: draftReason! }}
      />

      <details className="group mt-6">
        <summary className="mx-5 flex min-h-[52px] cursor-pointer list-none items-center gap-2 rounded-2xl bg-surface px-4">
          <span className="flex-1 text-[15px] font-semibold">전체 기록 보기</span>
          <span className="text-[13px] text-muted">상대별 전적 · 게임 기록</span>
          <Icon
            name="chevronRight"
            size={16}
            strokeWidth={2.4}
            className="text-[#c7c7cc] transition-transform group-open:rotate-90"
          />
        </summary>
        <MemberInsights
          avg={member.avg}
          games={member.games}
          recentAvg={member.recentAvg}
          recentGames={member.recentGames}
          recentN={settings.recent_n}
          insights={insights}
          legacy={legacy}
          profileHref={(m) => `/admin/members/${m}`}
          nameOf={(m) => byId.get(m)?.name ?? "?"}
          tierOf={(m) => byId.get(m)?.tier ?? null}
        />
      </details>
    </div>
  );
}

function Num({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs text-muted">{label}</span>
      <span className={`text-2xl font-bold ${accent ? "text-accent" : ""}`}>{value}</span>
    </div>
  );
}

/**
 * 아래·현재·위 티어 기준 에버 띠. 칸 경계는 후보 판정과 같은 "두 티어 기준의 중간".
 * 파랑 = 최근 폼, 회색 = 전체 에버.
 */
function TierBand({ tier, refs, avg, recent }: { tier: number; refs: number[]; avg: number; recent: number }) {
  const zones = [tier + 1, tier, tier - 1].filter((t) => t >= 0 && t < refs.length);
  const lo = Math.min(refs[zones[0]] - 8, avg, recent) - 2;
  const hi = Math.max(refs[zones.at(-1)!] + 8, avg, recent) + 2;
  const pos = (n: number) => `${((n - lo) / (hi - lo)) * 100}%`;
  const bounds = zones.slice(1).map((t, i) => (refs[zones[i]] + refs[t]) / 2);
  const edges = [lo, ...bounds, hi];
  const shades = ["bg-fill", "bg-edge", "bg-fill"];
  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="img"
        aria-label={`티어별 기준 에버 위치: 최근 폼 ${recent.toFixed(1)}, 전체 에버 ${avg.toFixed(1)}`}
        className="relative h-7 overflow-hidden rounded-md bg-background"
      >
        {zones.map((t, i) => (
          <div
            key={t}
            className={`absolute inset-y-0 ${t === tier ? "bg-edge" : shades[i]}`}
            style={{ left: pos(edges[i]), width: `calc(${pos(edges[i + 1])} - ${pos(edges[i])})` }}
          />
        ))}
        <div className="absolute inset-y-1.5 w-[3px] rounded-sm bg-[#86868b]" style={{ left: pos(avg) }} />
        <div className="absolute inset-y-0.5 w-[3px] rounded-sm bg-accent" style={{ left: pos(recent) }} />
      </div>
      <div
        className="grid text-[11px] text-muted"
        style={{ gridTemplateColumns: zones.map((_, i) => `${edges[i + 1] - edges[i]}fr`).join(" ") }}
      >
        {zones.map((t, i) => (
          <span
            key={t}
            className={`truncate ${i === 0 ? "text-left" : i === zones.length - 1 ? "text-right" : "text-center"}`}
          >
            {t}티어 ~{Math.round(refs[t])}
          </span>
        ))}
      </div>
      <span className="text-xs text-muted">
        <span className="font-semibold text-accent">파랑</span> 최근 폼 · <span className="font-semibold">회색</span>{" "}
        전체 에버
      </span>
    </div>
  );
}
