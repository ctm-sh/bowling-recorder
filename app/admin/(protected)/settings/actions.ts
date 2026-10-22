"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { MAX_TIER } from "@/lib/domain/tiers";
import { syncToSheet } from "@/lib/sheets/export";
import { parseSheetId } from "@/lib/sheets/sheetId";

export type SettingsState = { error?: string; saved?: boolean };

function int(value: FormDataEntryValue | null, min: number, max: number) {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

export async function saveSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireAdmin();

  const table: Record<string, number> = {};
  for (let t = 0; t <= MAX_TIER; t++) {
    const h = int(formData.get(`h${t}`), 0, 300);
    if (h === null) return { error: `${t}티어 핸디는 0~300 사이 숫자로 입력해주세요.` };
    table[String(t)] = h;
  }
  const fee = int(formData.get("fee"), 0, 100000);
  if (fee === null) return { error: "기본 게임비는 0원 이상 숫자로 입력해주세요." };
  const recentN = int(formData.get("recent_n"), 5, 200);
  if (recentN === null) return { error: "최근 게임 수는 5~200 사이로 입력해주세요." };

  const sheetInput = String(formData.get("sheet") ?? "").trim();
  const sheetId = sheetInput ? parseSheetId(sheetInput) : null;
  if (sheetInput && !sheetId) return { error: "구글 시트 주소를 알아볼 수 없어요. 시트 주소창의 URL을 그대로 붙여넣어 주세요." };

  const { error } = await db()
    .from("settings")
    .update({ handicap_table: table, default_fee: fee, recent_n: recentN, sheet_id: sheetId })
    .eq("id", 1);
  if (error) throw error;
  revalidatePath("/admin/settings");
  return { saved: true };
}

export async function syncNow(): Promise<{ error?: string }> {
  await requireAdmin();
  const result = await syncToSheet();
  revalidatePath("/admin/settings");
  return result.ok ? {} : { error: result.error };
}
