"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";

export type MemberFormState = { error?: string };

type Parsed = { name: string; tier: number | null; active: boolean; memo: string | null };

function parse(formData: FormData): Parsed | string {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return "이름을 입력해주세요.";
  if (name.length > 20) return "이름은 20자 이내로 입력해주세요.";

  const tierRaw = String(formData.get("tier") ?? "");
  const tier = tierRaw === "" ? null : Number(tierRaw);
  if (tier !== null && !(Number.isInteger(tier) && tier >= 0 && tier <= 14)) {
    return "티어는 0~14 사이로 골라주세요.";
  }

  const memo = String(formData.get("memo") ?? "").trim() || null;
  return { name, tier, active: formData.get("active") === "on", memo };
}

function duplicateName(error: { code?: string }) {
  return error.code === "23505";
}

export async function createMember(_prev: MemberFormState, formData: FormData): Promise<MemberFormState> {
  await requireAdmin();
  const parsed = parse(formData);
  if (typeof parsed === "string") return { error: parsed };

  const { error } = await db().from("members").insert(parsed);
  if (error) {
    if (duplicateName(error)) return { error: "같은 이름의 회원이 이미 있어요." };
    throw error;
  }
  redirect("/admin/members");
}

export async function updateMember(
  id: string,
  _prev: MemberFormState,
  formData: FormData,
): Promise<MemberFormState> {
  await requireAdmin();
  const parsed = parse(formData);
  if (typeof parsed === "string") return { error: parsed };

  const current = await db().from("members").select("tier").eq("id", id).single();
  if (current.error) throw current.error;

  // 티어가 바뀌면 사유가 반드시 있어야 하고, 이력으로 남긴다
  const tierChanged = current.data.tier !== parsed.tier;
  const reason = String(formData.get("reason") ?? "").trim();
  if (tierChanged && !reason) return { error: "티어를 바꾸려면 사유를 적어주세요." };

  const { error } = await db().from("members").update(parsed).eq("id", id);
  if (error) {
    if (duplicateName(error)) return { error: "같은 이름의 회원이 이미 있어요." };
    throw error;
  }

  if (tierChanged) {
    const { error: logError } = await db()
      .from("tier_changes")
      .insert({ member_id: id, from_tier: current.data.tier, to_tier: parsed.tier, reason });
    if (logError) throw logError;
  }
  redirect("/admin/members");
}
