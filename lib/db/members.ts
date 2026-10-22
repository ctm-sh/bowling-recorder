import "server-only";
import { db } from "./client";

export type Member = {
  id: string;
  name: string;
  /** null = 티어 미정 */
  tier: number | null;
  active: boolean;
  memo: string | null;
};

export type MemberWithStats = Member & {
  games: number;
  avg: number | null;
  /** 최근 N게임 (settings.recent_n) */
  recentGames: number;
  recentAvg: number | null;
};

export type TierChange = {
  id: string;
  from_tier: number | null;
  to_tier: number | null;
  reason: string;
  created_at: string;
};

/** 활성 → 티어 높은 순(미정은 뒤) → 에버 높은 순 */
function compareMembers(a: MemberWithStats, b: MemberWithStats) {
  if (a.active !== b.active) return a.active ? -1 : 1;
  const ta = a.tier ?? 99;
  const tb = b.tier ?? 99;
  if (ta !== tb) return ta - tb;
  return (b.avg ?? 0) - (a.avg ?? 0);
}

export async function listMembers(): Promise<MemberWithStats[]> {
  const [members, stats, form] = await Promise.all([
    db().from("members").select("id, name, tier, active, memo"),
    db().from("member_stats").select("member_id, games, avg"),
    db().from("member_form").select("member_id, recent_games, recent_avg"),
  ]);
  if (members.error) throw members.error;
  if (stats.error) throw stats.error;
  if (form.error) throw form.error;

  const byId = new Map(stats.data.map((s) => [s.member_id as string, s]));
  const formById = new Map(form.data.map((f) => [f.member_id as string, f]));
  return (members.data as Member[])
    .map((m) => ({
      ...m,
      games: byId.get(m.id)?.games ?? 0,
      avg: byId.get(m.id)?.avg ?? null,
      recentGames: formById.get(m.id)?.recent_games ?? 0,
      recentAvg: formById.get(m.id)?.recent_avg ?? null,
    }))
    .sort(compareMembers);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getMember(id: string) {
  if (!UUID.test(id)) return null;
  const [member, stats, changes] = await Promise.all([
    db().from("members").select("id, name, tier, active, memo").eq("id", id).maybeSingle(),
    db().from("member_stats").select("games, avg").eq("member_id", id).maybeSingle(),
    db()
      .from("tier_changes")
      .select("id, from_tier, to_tier, reason, created_at")
      .eq("member_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (member.error) throw member.error;
  if (stats.error) throw stats.error;
  if (changes.error) throw changes.error;
  if (!member.data) return null;

  return {
    member: { ...(member.data as Member), games: stats.data?.games ?? 0, avg: stats.data?.avg ?? null },
    tierChanges: changes.data as TierChange[],
  };
}
