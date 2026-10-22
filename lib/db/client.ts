import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

// 모든 테이블은 RLS로 막혀 있으므로 서버에서만 secret 키로 접근한다.
export function db() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;
    if (!url || !key) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY 환경 변수가 필요합니다.");
    }
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}
