import "server-only";
import { db } from "./client";

export type Settings = {
  handicap_table: Record<string, number>;
  default_fee: number;
  recent_n: number;
  sheet_id: string | null;
  last_synced_at: string | null;
  last_sync_error: string | null;
};

export async function getSettings(): Promise<Settings> {
  const { data, error } = await db()
    .from("settings")
    .select("handicap_table, default_fee, recent_n, sheet_id, last_synced_at, last_sync_error")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return data as Settings;
}
