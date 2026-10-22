"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { getSessionResults } from "@/lib/db/results";
import { getSettings } from "@/lib/db/settings";
import { syncToSheet } from "@/lib/sheets/export";

/** 정모 마감: 모든 게임 점수가 다 들어와야 한다 */
export async function closeSession(sessionId: string): Promise<{ error?: string }> {
  await requireAdmin();
  const session = await db().from("sessions").select("fee_per_game, closed_at").eq("id", sessionId).maybeSingle();
  if (session.error) throw session.error;
  if (!session.data) return { error: "정모를 찾을 수 없어요." };
  if (session.data.closed_at) redirect(`/admin/sessions/${sessionId}/settlement`);

  const results = await getSessionResults(sessionId, session.data.fee_per_game);
  if (results.length === 0) return { error: "게임이 하나도 없어요." };
  const incomplete = results.filter((r) => !r.complete);
  if (incomplete.length) {
    return {
      error: `점수가 덜 들어간 게임이 있어요: ${incomplete.map((r) => `${r.game.game_no}게임(${r.missing}명)`).join(", ")}`,
    };
  }

  const { error } = await db().from("sessions").update({ closed_at: new Date().toISOString() }).eq("id", sessionId);
  if (error) throw error;

  // 시트가 설정돼 있으면 내보낸다. 실패해도 마감은 유지하고 오류는 설정 화면에 남는다.
  const settings = await getSettings();
  if (settings.sheet_id) await syncToSheet();
  redirect(`/admin/sessions/${sessionId}/settlement`);
}

/** 마감 취소 (실수로 마감했을 때 점수를 다시 고칠 수 있게) */
export async function reopenSession(sessionId: string): Promise<{ error?: string }> {
  await requireAdmin();
  const { error } = await db().from("sessions").update({ closed_at: null }).eq("id", sessionId);
  if (error) throw error;
  redirect(`/admin/sessions/${sessionId}`);
}
