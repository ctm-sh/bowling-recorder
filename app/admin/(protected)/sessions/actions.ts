"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { membersInGames } from "@/lib/db/sessions";

export type FormState = { error?: string };

function parseFee(formData: FormData) {
  const fee = Number(formData.get("fee"));
  return Number.isInteger(fee) && fee >= 0 && fee <= 100000 ? fee : null;
}

export async function createSession(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const date = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "날짜를 골라주세요." };
  const fee = parseFee(formData);
  if (fee === null) return { error: "게임비는 0원 이상 숫자로 입력해주세요." };

  const { data, error } = await db().from("sessions").insert({ date, fee_per_game: fee }).select("id").single();
  if (error) throw error;
  redirect(`/admin/sessions/${data.id}/attendance`);
}

export async function updateFee(sessionId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const fee = parseFee(formData);
  if (fee === null) return { error: "게임비는 0원 이상 숫자로 입력해주세요." };

  const { error } = await db().from("sessions").update({ fee_per_game: fee }).eq("id", sessionId);
  if (error) throw error;
  redirect(`/admin/sessions/${sessionId}`);
}

export async function saveAttendance(sessionId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const selected = new Set(formData.getAll("member").map(String));

  const current = await db().from("attendees").select("member_id").eq("session_id", sessionId);
  if (current.error) throw current.error;
  const before = new Set(current.data.map((a) => a.member_id as string));

  const removed = [...before].filter((id) => !selected.has(id));
  const added = [...selected].filter((id) => !before.has(id));

  if (removed.length) {
    const played = await membersInGames(sessionId);
    if (removed.some((id) => played.has(id))) {
      return { error: "이미 게임에 들어간 사람은 참석을 해제할 수 없어요." };
    }
    const { error } = await db()
      .from("attendees")
      .delete()
      .eq("session_id", sessionId)
      .in("member_id", removed);
    if (error) throw error;
  }
  if (added.length) {
    const { error } = await db()
      .from("attendees")
      .insert(added.map((member_id) => ({ session_id: sessionId, member_id })));
    if (error) throw error;
  }
  redirect(`/admin/sessions/${sessionId}`);
}

/** 게임이 하나도 없는 정모만 삭제할 수 있다 (잘못 만든 정모 정리용) */
export async function deleteSession(sessionId: string): Promise<FormState> {
  await requireAdmin();
  const games = await db().from("games").select("id", { count: "exact", head: true }).eq("session_id", sessionId);
  if (games.error) throw games.error;
  if ((games.count ?? 0) > 0) return { error: "게임 기록이 있는 정모는 삭제할 수 없어요." };

  const { error } = await db().from("sessions").delete().eq("id", sessionId);
  if (error) throw error;
  redirect("/admin/sessions");
}
