"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { getHandicapTable } from "@/lib/db/games";
import {
  defaultFillScores,
  effectiveTier,
  lineupError,
  matchupHandicaps,
  netTeamHandicaps,
  teamHandicaps,
} from "@/lib/domain/teams";
import type { Player, Slot } from "@/lib/domain/types";

export type GamePayload = {
  mode: "random" | "manual";
  slots: Slot[];
  /** 팀별 순 핸디 (꼭두각시 포함, 합의 조정 반영) */
  teams: { teamNo: number; handicap: number }[];
};

function isInt(n: unknown, min: number, max: number): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;
}

export async function createGame(sessionId: string, payload: GamePayload): Promise<{ error?: string }> {
  await requireAdmin();

  const session = await db().from("sessions").select("closed_at").eq("id", sessionId).maybeSingle();
  if (session.error) throw session.error;
  if (!session.data) return { error: "정모를 찾을 수 없어요." };
  if (session.data.closed_at) return { error: "마감된 정모에는 게임을 추가할 수 없어요." };

  const slots = payload.slots.filter(
    (s) => typeof s.memberId === "string" && isInt(s.teamNo, 1, 50) && isInt(s.groupNo, 1, 50),
  );
  if (slots.length !== payload.slots.length) return { error: "팀 구성 데이터가 올바르지 않아요." };

  const attendees = await db().from("attendees").select("member_id").eq("session_id", sessionId);
  if (attendees.error) throw attendees.error;
  const problem = lineupError(slots, attendees.data.map((a) => a.member_id as string));
  if (problem) return { error: problem };

  const teamCount = Math.max(...slots.map((s) => s.teamNo));
  const values = new Map(payload.teams.map((t) => [t.teamNo, t]));
  for (let t = 1; t <= teamCount; t++) {
    const v = values.get(t);
    if (!v || !isInt(v.handicap, 0, 1000)) return { error: `${t}팀 핸디는 0~1000 사이 숫자로 입력해주세요.` };
  }

  // 기본값(핸디표·에버)은 서버에서 다시 계산해 스냅샷으로 남긴다
  const [members, stats, table, last] = await Promise.all([
    db().from("members").select("id, tier").in("id", slots.map((s) => s.memberId)),
    db().from("member_stats").select("member_id, avg").in("member_id", slots.map((s) => s.memberId)),
    getHandicapTable(),
    db().from("games").select("game_no").eq("session_id", sessionId).order("game_no", { ascending: false }).limit(1),
  ]);
  if (members.error) throw members.error;
  if (stats.error) throw stats.error;
  if (last.error) throw last.error;

  const avgById = new Map(stats.data.map((s) => [s.member_id as string, s.avg as number | null]));
  const players: Player[] = members.data.map((m) => ({
    id: m.id,
    tier: effectiveTier(m.tier),
    avg: avgById.get(m.id) ?? null,
  }));
  const tierById = new Map(players.map((p) => [p.id, p.tier]));
  const fillDefaults = defaultFillScores(slots, players);
  // 상대방(같은 묶음)끼리 핸디표 차이만큼 낮은 티어가 받는다
  const given = matchupHandicaps(slots, tierById, table);
  const memberSums = teamHandicaps(slots, given);
  // 순 핸디 기본값: (팀원 핸디 합 + 꼭두각시 점수)를 팀끼리 비교한 차이
  const handicapDefaults = netTeamHandicaps(
    Object.fromEntries(
      Array.from({ length: teamCount }, (_, i) => [i + 1, (memberSums[i + 1] ?? 0) + (fillDefaults[i + 1] ?? 0)]),
    ),
  );
  const gameNo = (last.data[0]?.game_no ?? 0) + 1;

  const game = await db()
    .from("games")
    .insert({ session_id: sessionId, game_no: gameNo, mode: payload.mode, confirmed_at: new Date().toISOString() })
    .select("id")
    .single();
  if (game.error) {
    if (game.error.code === "23505") return { error: "다른 운영진이 방금 게임을 추가했어요. 새로고침 후 다시 시도해주세요." };
    throw game.error;
  }

  try {
    const teamRows = Array.from({ length: teamCount }, (_, i) => {
      const teamNo = i + 1;
      const handicapDefault = handicapDefaults[teamNo] ?? 0;
      const fillDefault = fillDefaults[teamNo] ?? null;
      const v = values.get(teamNo)!;
      return {
        game_id: game.data.id,
        team_no: teamNo,
        handicap: v.handicap,
        handicap_default: handicapDefault,
        // 꼭두각시 점수 (순 핸디에 이미 포함, 기록·표시용)
        fill_score: fillDefault,
        fill_score_default: fillDefault,
      };
    });
    const teams = await db().from("teams").insert(teamRows).select("id, team_no");
    if (teams.error) throw teams.error;

    const teamId = new Map(teams.data.map((t) => [t.team_no as number, t.id as string]));
    const memberRows = slots.map((s) => ({
      team_id: teamId.get(s.teamNo)!,
      member_id: s.memberId,
      tier_snapshot: tierById.get(s.memberId)!,
      // 이 게임에서 상대방과의 티어 차이로 받은 핸디
      handicap_snapshot: given.get(s.memberId)!,
      group_no: s.groupNo,
    }));
    const inserted = await db().from("team_members").insert(memberRows);
    if (inserted.error) throw inserted.error;
  } catch (e) {
    await db().from("games").delete().eq("id", game.data.id);
    throw e;
  }

  redirect(`/admin/sessions/${sessionId}`);
}

/** 점수가 하나도 없는 게임만 취소할 수 있다 */
export async function deleteGame(sessionId: string, gameId: string): Promise<{ error?: string }> {
  await requireAdmin();
  const scores = await db().from("scores").select("id", { count: "exact", head: true }).eq("game_id", gameId);
  if (scores.error) throw scores.error;
  if ((scores.count ?? 0) > 0) return { error: "점수가 입력된 게임은 취소할 수 없어요." };

  const { error } = await db().from("games").delete().eq("id", gameId).eq("session_id", sessionId);
  if (error) throw error;
  redirect(`/admin/sessions/${sessionId}`);
}
