"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { addMinigameScore, minigameRanking, type MinigameRank } from "@/lib/db/minigame";
import { getMeId } from "@/lib/me";
import { finalScore } from "@/lib/minigame/score";

export type SaveResult = {
  error?: string;
  score?: number;
  best?: number;
  rank?: number;
  /** 저장 뒤 랭킹 (게임 끝 화면에 바로 보여준다). 저장을 못 해도 지금 랭킹을 돌려준다. */
  ranking: MinigameRank[];
  meId: string | null;
};

/**
 * 끝난 미니게임을 랭킹에 남긴다. 점수는 믿지 않고 투구 기록(쓰러뜨린 핀 수)으로 다시 계산한다.
 * 이름은 이 기기에서 고른 회원 (로그인은 아니라서 재미용 랭킹이다).
 */
export async function saveMinigameScore(rolls: number[]): Promise<SaveResult> {
  const meId = await getMeId();
  const fail = async (error: string) => ({ error, ranking: await minigameRanking(), meId });
  if (!meId) return fail("이름을 먼저 고르면 랭킹에 올라가요.");
  if (!Array.isArray(rolls) || rolls.length > 21) return fail("기록이 올바르지 않아요.");
  const score = finalScore(rolls);
  if (score === null) return fail("끝까지 친 게임만 랭킹에 올라가요.");

  const { data: member, error } = await db().from("members").select("id").eq("id", meId).maybeSingle();
  if (error) throw error;
  if (!member) return fail("회원을 찾을 수 없어요.");

  await addMinigameScore(meId, score);
  revalidatePath("/game");
  revalidatePath("/ranking");
  const ranking = await minigameRanking();
  const idx = ranking.findIndex((r) => r.memberId === meId);
  return { score, best: ranking[idx]?.best, rank: idx + 1, ranking, meId };
}
