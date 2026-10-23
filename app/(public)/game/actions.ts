"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { addMinigameScore, minigameRanking } from "@/lib/db/minigame";
import { getMeId } from "@/lib/me";
import { finalScore } from "@/lib/minigame/score";

/**
 * 끝난 미니게임을 랭킹에 남긴다. 점수는 믿지 않고 투구 기록(쓰러뜨린 핀 수)으로 다시 계산한다.
 * 이름은 이 기기에서 고른 회원 (로그인은 아니라서 재미용 랭킹이다).
 */
export async function saveMinigameScore(
  rolls: number[],
): Promise<{ error?: string; score?: number; best?: number; rank?: number }> {
  const meId = await getMeId();
  if (!meId) return { error: "이름을 먼저 고르면 랭킹에 올라가요." };
  if (!Array.isArray(rolls) || rolls.length > 21) return { error: "기록이 올바르지 않아요." };
  const score = finalScore(rolls);
  if (score === null) return { error: "끝까지 친 게임만 랭킹에 올라가요." };

  const { data: member, error } = await db().from("members").select("id").eq("id", meId).maybeSingle();
  if (error) throw error;
  if (!member) return { error: "회원을 찾을 수 없어요." };

  await addMinigameScore(meId, score);
  revalidatePath("/game");
  const ranking = await minigameRanking();
  const idx = ranking.findIndex((r) => r.memberId === meId);
  return { score, best: ranking[idx]?.best, rank: idx + 1 };
}
