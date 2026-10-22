import "server-only";
import { db } from "@/lib/db/client";
import { listMembers } from "@/lib/db/members";
import { getSettings } from "@/lib/db/settings";
import { googleConfigured, writeTabs } from "./google";
import { scoreSheetRows, type ExportGame } from "./rows";

type GameRow = {
  game_no: number;
  sessions: { date: string; closed_at: string | null; fee_per_game: number };
  teams: {
    team_no: number;
    handicap: number;
    team_members: { member_id: string; handicap_snapshot: number; group_no: number }[];
  }[];
  scores: { member_id: string; score: number }[];
};

/** 엑셀에서 가져온 이전 기록 (1,000행 제한을 넘을 수 있어 나눠 읽는다) */
async function legacyScores() {
  const all: { memberId: string; score: number }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db()
      .from("scores")
      .select("member_id, score")
      .is("game_id", null)
      .order("seq")
      .range(from, from + 999);
    if (error) throw error;
    all.push(...data.map((s) => ({ memberId: s.member_id as string, score: s.score as number })));
    if (data.length < 1000) return all;
  }
}

async function exportGames(): Promise<ExportGame[]> {
  const { data, error } = await db()
    .from("games")
    .select(
      "game_no, sessions!inner(date, closed_at, fee_per_game), teams(team_no, handicap, team_members(member_id, handicap_snapshot, group_no)), scores(member_id, score)",
    );
  if (error) throw error;
  return (data as unknown as GameRow[]).map((g) => {
    const score = new Map(g.scores.map((s) => [s.member_id, s.score]));
    return {
      date: g.sessions.date,
      gameNo: g.game_no,
      closed: !!g.sessions.closed_at,
      fee: g.sessions.fee_per_game,
      scored: new Set(score.keys()),
      teams: g.teams.map((t) => ({
        teamNo: t.team_no,
        handicap: t.handicap,
        members: t.team_members.map((m) => ({
          memberId: m.member_id,
          score: score.get(m.member_id) ?? 0,
          handicap: m.handicap_snapshot,
          groupNo: m.group_no,
        })),
      })),
    };
  });
}

/**
 * 구글 시트로 내보내기. 결과(성공 시각 또는 오류)를 settings에 남기고 돌려준다.
 * 정모 마감을 막지 않도록 예외를 던지지 않는다.
 */
export async function syncToSheet(): Promise<{ ok: boolean; error?: string }> {
  let error: string | undefined;
  try {
    const settings = await getSettings();
    if (!googleConfigured()) throw new Error("구글 서비스 계정이 아직 연결되지 않았어요.");
    if (!settings.sheet_id) throw new Error("설정에서 내보낼 구글 시트 주소를 먼저 넣어주세요.");

    const [members, games, legacy] = await Promise.all([listMembers(), exportGames(), legacyScores()]);
    await writeTabs(settings.sheet_id, [scoreSheetRows(members, games, legacy)]);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  await db()
    .from("settings")
    .update(error ? { last_sync_error: error } : { last_synced_at: new Date().toISOString(), last_sync_error: null })
    .eq("id", 1);
  return error ? { ok: false, error } : { ok: true };
}
