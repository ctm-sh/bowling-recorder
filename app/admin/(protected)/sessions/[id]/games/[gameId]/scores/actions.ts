"use server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";

/** 한 사람의 점수 저장. score가 null이면 지운다. */
export async function saveScore(
  sessionId: string,
  gameId: string,
  memberId: string,
  score: number | null,
): Promise<{ error?: string }> {
  await requireAdmin();
  if (score !== null && !(Number.isInteger(score) && score >= 0 && score <= 300)) {
    return { error: "점수는 0~300이에요." };
  }

  const game = await db()
    .from("games")
    .select("id, sessions!inner(closed_at), teams!inner(team_members!inner(member_id))")
    .eq("id", gameId)
    .eq("session_id", sessionId)
    .eq("teams.team_members.member_id", memberId)
    .maybeSingle();
  if (game.error) throw game.error;
  if (!game.data) return { error: "이 게임에 없는 사람이에요." };
  if ((game.data.sessions as unknown as { closed_at: string | null }).closed_at) {
    return { error: "마감된 정모는 점수를 바꿀 수 없어요." };
  }

  const result =
    score === null
      ? await db().from("scores").delete().eq("game_id", gameId).eq("member_id", memberId)
      : await db()
          .from("scores")
          .upsert({ game_id: gameId, member_id: memberId, score }, { onConflict: "member_id,game_id" });
  if (result.error) throw result.error;
  return {};
}
