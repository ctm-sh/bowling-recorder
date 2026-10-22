"use server";

import { cookies } from "next/headers";
import { db } from "@/lib/db/client";
import { ME_COOKIE } from "@/lib/me";

/** 이 기기의 "나는 누구" 저장 (null이면 지움) */
export async function setMe(memberId: string | null): Promise<{ error?: string }> {
  const store = await cookies();
  if (memberId === null) {
    store.delete(ME_COOKIE);
    return {};
  }
  const { data, error } = await db().from("members").select("id").eq("id", memberId).maybeSingle();
  if (error) throw error;
  if (!data) return { error: "회원을 찾을 수 없어요." };

  store.set(ME_COOKIE, memberId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return {};
}
