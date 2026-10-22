import "server-only";
import { db } from "./client";
import type { MemberWithStats } from "./members";
import { listMembers } from "./members";

export type Session = {
  id: string;
  date: string;
  fee_per_game: number;
  closed_at: string | null;
};

export type SessionSummary = Session & { attendeeCount: number; gameCount: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 한국 시간 기준 오늘 (YYYY-MM-DD) */
export function todayKST() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
}

export async function listSessions(): Promise<SessionSummary[]> {
  const { data, error } = await db()
    .from("sessions")
    .select("id, date, fee_per_game, closed_at, attendees(count), games(count)")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  return data.map(({ attendees, games, ...s }) => ({
    ...s,
    attendeeCount: (attendees as { count: number }[])[0]?.count ?? 0,
    gameCount: (games as { count: number }[])[0]?.count ?? 0,
  }));
}

export async function getSession(id: string) {
  if (!UUID.test(id)) return null;
  const [session, attendees, games] = await Promise.all([
    db().from("sessions").select("id, date, fee_per_game, closed_at").eq("id", id).maybeSingle(),
    db().from("attendees").select("member_id").eq("session_id", id),
    db().from("games").select("id, game_no, confirmed_at").eq("session_id", id).order("game_no"),
  ]);
  if (session.error) throw session.error;
  if (attendees.error) throw attendees.error;
  if (games.error) throw games.error;
  if (!session.data) return null;

  return {
    session: session.data as Session,
    attendeeIds: attendees.data.map((a) => a.member_id as string),
    games: games.data as { id: string; game_no: number; confirmed_at: string | null }[],
  };
}

/** 이 정모에서 이미 팀에 들어간 회원 (참석 해제 불가) */
export async function membersInGames(sessionId: string) {
  const { data, error } = await db()
    .from("team_members")
    .select("member_id, teams!inner(games!inner(session_id))")
    .eq("teams.games.session_id", sessionId);
  if (error) throw error;
  return new Set(data.map((r) => r.member_id as string));
}

export type Candidate = MemberWithStats & { lastAttended: string | null; recentCount: number };

/**
 * 참석 체크 후보: 활동 회원 + 이미 체크된 비활성 회원.
 * 최근 참석한 사람이 위로 오도록 (마지막 참석일 → 최근 10회 정모 참석 횟수 → 기본 정렬).
 */
export async function attendanceCandidates(sessionId: string, checked: string[]): Promise<Candidate[]> {
  const [members, recentSessions] = await Promise.all([
    listMembers(),
    db()
      .from("sessions")
      .select("id, date, attendees(member_id)")
      .neq("id", sessionId)
      .order("date", { ascending: false })
      .limit(10),
  ]);
  if (recentSessions.error) throw recentSessions.error;

  const last = new Map<string, string>();
  const count = new Map<string, number>();
  for (const s of recentSessions.data) {
    for (const a of s.attendees as { member_id: string }[]) {
      if (!last.has(a.member_id)) last.set(a.member_id, s.date);
      count.set(a.member_id, (count.get(a.member_id) ?? 0) + 1);
    }
  }

  const checkedSet = new Set(checked);
  return members
    .filter((m) => m.active || checkedSet.has(m.id))
    .map((m) => ({ ...m, lastAttended: last.get(m.id) ?? null, recentCount: count.get(m.id) ?? 0 }))
    .sort((a, b) => {
      const la = a.lastAttended ?? "";
      const lb = b.lastAttended ?? "";
      if (la !== lb) return la < lb ? 1 : -1;
      return b.recentCount - a.recentCount;
    });
}
