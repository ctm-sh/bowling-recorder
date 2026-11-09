"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { getHandicapTable } from "@/lib/db/games";
import { getRankingMatch, nextMatchNo } from "@/lib/db/rankingMatches";
import {
  defaultFillScore,
  mastersPick,
  mastersWinnerCandidates,
  monthRange,
  representativeCandidates,
  targetTiersError,
  type TargetTier,
} from "@/lib/domain/rankingMatch";
import { effectiveTier, estimatedAvg, isValidSizes, personalHandicap } from "@/lib/domain/teams";
import { rankingMatchTitle } from "@/lib/format";

type Result = { error?: string };

const CLOSED = "마감된 랭킹전은 바꿀 수 없어요.";

function isInt(n: unknown, min: number, max: number): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;
}

export async function createRankingMatch(_prev: Result, formData: FormData): Promise<Result> {
  await requireAdmin();
  const date = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "날짜를 골라주세요." };

  // 랭킹전은 달로 구분하므로 같은 달에 두 번 만들지 않는다
  const { start, end } = monthRange(date);
  const same = await db().from("ranking_matches").select("id").gte("date", start).lt("date", end).limit(1);
  if (same.error) throw same.error;
  if (same.data.length > 0) return { error: `${rankingMatchTitle(date)}이 이미 있어요.` };

  // match_no는 화면에 보이지 않는 내부 순번이다
  const { data, error } = await db()
    .from("ranking_matches")
    .insert({ date, match_no: await nextMatchNo() })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { error: "다른 운영진이 방금 랭킹전을 만들었어요. 다시 시도해주세요." };
    throw error;
  }
  redirect(`/admin/ranking-matches/${data.id}/setup`);
}

export type SetupPayload = {
  format: "team" | "target";
  entries: { memberId: string; handicap: number; teamNo: number | null }[];
  tiers: TargetTier[];
  /** 인원이 적은 팀의 꼭두각시 점수 */
  fills: { teamNo: number; fill: number }[];
};

/** 참가자·핸디·형식 저장. 점수를 입력하기 전까지 몇 번이든 다시 저장할 수 있다. */
export async function saveSetup(matchId: string, payload: SetupPayload): Promise<Result> {
  await requireAdmin();
  const current = await getRankingMatch(matchId);
  if (!current) return { error: "랭킹전을 찾을 수 없어요." };
  if (current.match.closed_at) return { error: CLOSED };
  if (current.entries.some((e) => e.scores.some((s) => s !== null))) {
    return { error: "점수를 입력한 뒤에는 참가자와 팀을 바꿀 수 없어요." };
  }

  const ids = payload.entries.map((e) => e.memberId);
  if (ids.length < 2) return { error: "참가자는 2명 이상이어야 해요." };
  if (new Set(ids).size !== ids.length) return { error: "같은 사람이 두 번 들어 있어요." };
  if (payload.entries.some((e) => !isInt(e.handicap, 0, 300))) {
    return { error: "핸디는 0~300 사이 숫자로 입력해주세요." };
  }

  let teamCount = 0;
  if (payload.format === "team") {
    teamCount = Math.max(0, ...payload.entries.map((e) => e.teamNo ?? 0));
    const sizes = Array.from(
      { length: teamCount },
      (_, i) => payload.entries.filter((e) => e.teamNo === i + 1).length,
    );
    if (payload.entries.some((e) => !isInt(e.teamNo, 1, 50))) return { error: "팀에 배정되지 않은 사람이 있어요." };
    if (!isValidSizes(sizes)) return { error: "팀은 2개 이상, 팀 간 인원 차이는 최대 1명이어야 해요." };
  } else {
    const problem = targetTiersError(payload.tiers);
    if (problem) return { error: problem };
  }

  const [members, stats, table] = await Promise.all([
    db().from("members").select("id, tier, active").in("id", ids),
    db().from("member_stats").select("member_id, avg").in("member_id", ids),
    getHandicapTable(),
  ]);
  if (members.error) throw members.error;
  if (stats.error) throw stats.error;
  const already = new Set(current.entries.map((e) => e.memberId));
  if (members.data.length !== ids.length || members.data.some((m) => !m.active && !already.has(m.id))) {
    return { error: "참가할 수 없는 회원이 들어 있어요." };
  }

  const tierById = new Map(members.data.map((m) => [m.id as string, effectiveTier(m.tier)]));
  const avgById = new Map(stats.data.map((s) => [s.member_id as string, s.avg as number | null]));
  const fillDefault = defaultFillScore(
    ids.map((id) => estimatedAvg({ id, tier: tierById.get(id)!, avg: avgById.get(id) ?? null })),
  );

  const teamRows = Array.from({ length: teamCount }, (_, i) => {
    const teamNo = i + 1;
    const size = payload.entries.filter((e) => e.teamNo === teamNo).length;
    const biggest = Math.max(
      ...Array.from({ length: teamCount }, (_, t) => payload.entries.filter((e) => e.teamNo === t + 1).length),
    );
    const short = size < biggest;
    const fill = payload.fills.find((f) => f.teamNo === teamNo)?.fill;
    return {
      match_id: matchId,
      team_no: teamNo,
      fill_score: short ? (fill ?? null) : null,
      fill_score_default: short ? fillDefault : null,
    };
  });
  if (teamRows.some((t) => t.fill_score_default !== null && !isInt(t.fill_score, 0, 300))) {
    return { error: "꼭두각시 점수는 0~300 사이 숫자로 입력해주세요." };
  }

  const removed = await db().from("ranking_teams").delete().eq("match_id", matchId);
  if (removed.error) throw removed.error;
  const cleared = await db().from("ranking_entries").delete().eq("match_id", matchId);
  if (cleared.error) throw cleared.error;

  let teamIdByNo = new Map<number, string>();
  if (teamRows.length > 0) {
    const inserted = await db().from("ranking_teams").insert(teamRows).select("id, team_no");
    if (inserted.error) throw inserted.error;
    teamIdByNo = new Map(inserted.data.map((t) => [t.team_no as number, t.id as string]));
  }

  const entryRows = payload.entries.map((e) => {
    const tier = tierById.get(e.memberId)!;
    return {
      match_id: matchId,
      member_id: e.memberId,
      team_id: payload.format === "team" ? teamIdByNo.get(e.teamNo!)! : null,
      tier_snapshot: tier,
      handicap_snapshot: e.handicap,
      handicap_default: personalHandicap(tier, table),
    };
  });
  const entries = await db().from("ranking_entries").insert(entryRows);
  if (entries.error) throw entries.error;

  const updated = await db()
    .from("ranking_matches")
    .update({
      format: payload.format,
      target_tiers: payload.format === "target" ? payload.tiers : [],
      masters_size: null,
      prize_representative_id: null,
      masters_winner_id: null,
    })
    .eq("id", matchId);
  if (updated.error) throw updated.error;

  redirect(`/admin/ranking-matches/${matchId}`);
}

/** 3게임 점수 저장. score가 null이면 지운다. */
export async function saveRankingScore(
  matchId: string,
  gameNo: number,
  entryId: string,
  score: number | null,
): Promise<Result> {
  await requireAdmin();
  if (!isInt(gameNo, 1, 3)) return { error: "게임 번호가 올바르지 않아요." };
  if (score !== null && !isInt(score, 0, 300)) return { error: "점수는 0~300이에요." };

  const entry = await db()
    .from("ranking_entries")
    .select("id, ranking_matches!inner(closed_at)")
    .eq("id", entryId)
    .eq("match_id", matchId)
    .maybeSingle();
  if (entry.error) throw entry.error;
  if (!entry.data) return { error: "이 랭킹전에 없는 사람이에요." };
  if ((entry.data.ranking_matches as unknown as { closed_at: string | null }).closed_at) return { error: CLOSED };

  const result =
    score === null
      ? await db().from("ranking_scores").delete().eq("entry_id", entryId).eq("game_no", gameNo)
      : await db()
          .from("ranking_scores")
          .upsert({ entry_id: entryId, game_no: gameNo, score }, { onConflict: "entry_id,game_no" });
  if (result.error) throw result.error;
  return {};
}

/** 마스터즈 진출자 확정. 제외한 사람 다음 순위가 올라온다. 빠진 사람의 마스터즈 점수는 지운다. */
export async function saveMastersPicks(matchId: string, size: number, excluded: string[]): Promise<Result> {
  await requireAdmin();
  const data = await getRankingMatch(matchId);
  if (!data) return { error: "랭킹전을 찾을 수 없어요." };
  if (data.match.closed_at) return { error: CLOSED };
  if (data.stage === "setup" || data.stage === "playing") return { error: "3게임 점수를 모두 입력한 뒤에 정할 수 있어요." };
  if (!isInt(size, 2, data.entries.length)) return { error: `진출 인원은 2~${data.entries.length}명으로 입력해주세요.` };

  const picks = mastersPick(data.ranked, size, excluded);
  if (picks.length < size) return { error: "제외한 사람이 많아 진출 인원을 채울 수 없어요." };

  const seedById = new Map(picks.map((p, i) => [p.memberId, i + 1]));
  for (const e of data.entries) {
    const seed = seedById.get(e.memberId) ?? null;
    if (seed === e.mastersSeed) continue;
    const { error } = await db().from("ranking_entries").update({ masters_seed: seed }).eq("id", e.entryId);
    if (error) throw error;
    if (seed === null) {
      const removed = await db().from("masters_scores").delete().eq("entry_id", e.entryId);
      if (removed.error) throw removed.error;
    }
  }

  const { error } = await db()
    .from("ranking_matches")
    .update({ masters_size: size, masters_winner_id: null })
    .eq("id", matchId);
  if (error) throw error;
  redirect(`/admin/ranking-matches/${matchId}/masters`);
}

export async function saveMastersScore(matchId: string, entryId: string, score: number | null): Promise<Result> {
  await requireAdmin();
  if (score !== null && !isInt(score, 0, 300)) return { error: "점수는 0~300이에요." };

  const entry = await db()
    .from("ranking_entries")
    .select("id, masters_seed, ranking_matches!inner(closed_at)")
    .eq("id", entryId)
    .eq("match_id", matchId)
    .maybeSingle();
  if (entry.error) throw entry.error;
  if (!entry.data || entry.data.masters_seed === null) return { error: "마스터즈 진출자가 아니에요." };
  if ((entry.data.ranking_matches as unknown as { closed_at: string | null }).closed_at) return { error: CLOSED };

  const result =
    score === null
      ? await db().from("masters_scores").delete().eq("entry_id", entryId)
      : await db().from("masters_scores").upsert({ entry_id: entryId, score }, { onConflict: "entry_id" });
  if (result.error) throw result.error;
  return {};
}

export async function closeRankingMatch(
  matchId: string,
  choice: { representativeId: string | null; mastersWinnerId: string | null },
): Promise<Result> {
  await requireAdmin();
  const data = await getRankingMatch(matchId);
  if (!data) return { error: "랭킹전을 찾을 수 없어요." };
  if (data.match.closed_at) return { error: "이미 마감했어요." };
  if (data.stage !== "finish") return { error: "마스터즈 점수까지 모두 입력한 뒤에 마감할 수 있어요." };

  let representativeId: string | null = null;
  if (data.prize > 0) {
    const allowed = representativeCandidates(data.match.format!, data.entries, data.rankedTeams);
    if (!choice.representativeId || !allowed.includes(choice.representativeId)) {
      return { error: "상금 받을 대표자를 골라주세요." };
    }
    representativeId = choice.representativeId;
  }
  const winners = mastersWinnerCandidates(data.masters);
  const mastersWinnerId = winners.length === 1 ? winners[0] : choice.mastersWinnerId;
  if (!mastersWinnerId || !winners.includes(mastersWinnerId)) return { error: "마스터즈 우승자를 골라주세요." };

  const { error } = await db()
    .from("ranking_matches")
    .update({
      closed_at: new Date().toISOString(),
      prize_representative_id: representativeId,
      masters_winner_id: mastersWinnerId,
    })
    .eq("id", matchId);
  if (error) throw error;
  redirect(`/admin/ranking-matches/${matchId}`);
}

/** 마감 취소 (실수로 마감했을 때 점수를 다시 고칠 수 있게) */
export async function reopenRankingMatch(matchId: string): Promise<Result> {
  await requireAdmin();
  const { error } = await db().from("ranking_matches").update({ closed_at: null }).eq("id", matchId);
  if (error) throw error;
  redirect(`/admin/ranking-matches/${matchId}`);
}

export async function deleteRankingMatch(matchId: string): Promise<Result> {
  await requireAdmin();
  const { error } = await db().from("ranking_matches").delete().eq("id", matchId);
  if (error) throw error;
  redirect("/admin/ranking-matches");
}
