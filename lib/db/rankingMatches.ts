import "server-only";
import {
  matchPrize,
  matchStage,
  rankEntries,
  rankMasters,
  rankTeams,
  reachedTier,
  RANKING_GAMES,
  targetTotal,
  type MastersEntry,
  type RankingEntry,
  type TargetTier,
} from "@/lib/domain/rankingMatch";
import { db } from "./client";
import { UUID } from "./sessions";

export type RankingMatch = {
  id: string;
  match_no: number;
  date: string;
  format: "team" | "target" | null;
  target_tiers: TargetTier[];
  team_prize: number;
  masters_prize: number;
  masters_size: number | null;
  prize_representative_id: string | null;
  masters_winner_id: string | null;
  closed_at: string | null;
};

const MATCH_COLUMNS =
  "id, match_no, date, format, target_tiers, team_prize, masters_prize, masters_size, prize_representative_id, masters_winner_id, closed_at";

export type RankingMatchSummary = RankingMatch & { entryCount: number };

export async function listRankingMatches(): Promise<RankingMatchSummary[]> {
  const { data, error } = await db()
    .from("ranking_matches")
    .select(`${MATCH_COLUMNS}, ranking_entries(count)`)
    .order("date", { ascending: false })
    .order("match_no", { ascending: false });
  if (error) throw error;
  return data.map(({ ranking_entries, ...m }) => ({
    ...(m as unknown as RankingMatch),
    entryCount: (ranking_entries as { count: number }[])[0]?.count ?? 0,
  }));
}

/** 다음 회차 번호 기본값 */
export async function nextMatchNo() {
  const { data, error } = await db()
    .from("ranking_matches")
    .select("match_no")
    .order("match_no", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data[0]?.match_no ?? 0) + 1;
}

export type MatchEntry = RankingEntry & {
  entryId: string;
  name: string;
  tier: number;
  handicapDefault: number;
  mastersSeed: number | null;
  mastersScore: number | null;
};

type EntryRow = {
  id: string;
  member_id: string;
  team_id: string | null;
  tier_snapshot: number;
  handicap_snapshot: number;
  handicap_default: number;
  masters_seed: number | null;
  members: { name: string };
  ranking_scores: { game_no: number; score: number }[];
  masters_scores: { score: number } | { score: number }[] | null;
};

type TeamRow = { id: string; team_no: number; fill_score: number | null; fill_score_default: number | null };

/** 랭킹전 전체와 계산 결과 (순위, 상금, 진행 단계) */
export async function getRankingMatch(id: string) {
  if (!UUID.test(id)) return null;
  const [matchResult, teamResult, entryResult] = await Promise.all([
    db().from("ranking_matches").select(MATCH_COLUMNS).eq("id", id).maybeSingle(),
    db().from("ranking_teams").select("id, team_no, fill_score, fill_score_default").eq("match_id", id).order("team_no"),
    db()
      .from("ranking_entries")
      .select(
        "id, member_id, team_id, tier_snapshot, handicap_snapshot, handicap_default, masters_seed, members!inner(name), ranking_scores(game_no, score), masters_scores(score)",
      )
      .eq("match_id", id),
  ]);
  if (matchResult.error) throw matchResult.error;
  if (teamResult.error) throw teamResult.error;
  if (entryResult.error) throw entryResult.error;
  if (!matchResult.data) return null;

  const match = matchResult.data as unknown as RankingMatch;
  const teamRows = teamResult.data as TeamRow[];
  const teamNoById = new Map(teamRows.map((t) => [t.id, t.team_no]));

  const entries: MatchEntry[] = (entryResult.data as unknown as EntryRow[])
    .map((e) => {
      const byGame = new Map(e.ranking_scores.map((s) => [s.game_no, s.score]));
      const masters = Array.isArray(e.masters_scores) ? e.masters_scores[0] : e.masters_scores;
      return {
        entryId: e.id,
        memberId: e.member_id,
        name: e.members.name,
        tier: e.tier_snapshot,
        teamNo: e.team_id ? (teamNoById.get(e.team_id) ?? null) : null,
        handicap: e.handicap_snapshot,
        handicapDefault: e.handicap_default,
        mastersSeed: e.masters_seed,
        mastersScore: masters?.score ?? null,
        scores: Array.from({ length: RANKING_GAMES }, (_, i) => byGame.get(i + 1) ?? null),
      };
    })
    .sort((a, b) => (a.teamNo ?? 0) - (b.teamNo ?? 0) || a.tier - b.tier || a.name.localeCompare(b.name, "ko"));

  const teams = teamRows.map((t) => ({
    id: t.id,
    teamNo: t.team_no,
    fill: t.fill_score,
    fillDefault: t.fill_score_default,
    members: entries.filter((e) => e.teamNo === t.team_no),
  }));
  const mastersEntries: MastersEntry[] = entries
    .filter((e) => e.mastersSeed !== null)
    .sort((a, b) => a.mastersSeed! - b.mastersSeed!)
    .map((e) => ({ memberId: e.memberId, handicap: e.handicap, score: e.mastersScore }));

  const format = match.format;
  const total = targetTotal(entries);
  return {
    match,
    teams,
    entries,
    byMember: new Map(entries.map((e) => [e.memberId, e])),
    ranked: rankEntries(entries),
    rankedTeams: format === "team" ? rankTeams(teams) : [],
    masters: rankMasters(mastersEntries),
    targetTotal: total,
    reached: format === "target" ? reachedTier(total, match.target_tiers) : null,
    prize: format ? matchPrize({ format, teamPrize: match.team_prize, targetTiers: match.target_tiers }, entries) : 0,
    stage: matchStage(
      { format, closed: !!match.closed_at, mastersSize: match.masters_size },
      entries,
      mastersEntries,
    ),
  };
}

export type RankingMatchData = NonNullable<Awaited<ReturnType<typeof getRankingMatch>>>;
