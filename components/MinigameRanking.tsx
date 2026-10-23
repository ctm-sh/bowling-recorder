import Link from "next/link";
import type { MinigameRank } from "@/lib/db/minigame";
import { formatDate } from "@/lib/format";

/** DB 시각(UTC) → 한국 날짜 "YYYY-MM-DD" */
const kstDate = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);

/** 미니게임 랭킹 목록 (회원별 최고 점수) */
export function MinigameRanking({
  ranking,
  meId,
  limit = 20,
  playLink = true,
  className = "",
}: {
  ranking: MinigameRank[];
  meId: string | null;
  limit?: number;
  /** 비어 있을 때 미니게임으로 가는 링크 (미니게임 화면 안에서는 끈다) */
  playLink?: boolean;
  className?: string;
}) {
  if (ranking.length === 0) {
    return (
      <div className={`rounded-2xl bg-surface px-5 py-8 text-center text-[15px] text-muted ${className}`}>
        아직 기록이 없어요. 첫 번째로 올라가 보세요!
        {playLink && (
          <div className="mt-3">
            <Link href="/game" className="font-semibold text-link">
              미니게임 하러 가기
            </Link>
          </div>
        )}
      </div>
    );
  }
  const top = ranking.slice(0, limit);
  const myIndex = ranking.findIndex((r) => r.memberId === meId);
  // 내가 순위 밖이면 맨 아래에 따로 보여준다
  const rows = myIndex >= limit ? [...top, ranking[myIndex]] : top;
  return (
    <ol className={`overflow-hidden rounded-2xl bg-surface ${className}`}>
      {rows.map((r) => {
        const rank = ranking.indexOf(r) + 1;
        const me = r.memberId === meId;
        return (
          <li
            key={r.memberId}
            className={`flex min-h-14 items-center gap-3 border-b border-separator px-4 py-2 last:border-b-0 ${
              me ? "bg-accent-soft" : ""
            } ${rank > limit ? "border-t-4 border-t-background" : ""}`}
          >
            <span className={`w-[26px] text-[17px] font-bold ${rank <= 3 ? "text-accent" : "text-muted"}`}>{rank}</span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className={`truncate text-base ${me ? "font-bold" : "font-medium"}`}>{r.name}</span>
              <span className="truncate text-xs text-muted">
                {r.plays}판 · {formatDate(kstDate(r.bestAt))}
              </span>
            </div>
            <span className="text-xl font-bold tracking-[-0.3px] tabular-nums">{r.best}</span>
          </li>
        );
      })}
    </ol>
  );
}
