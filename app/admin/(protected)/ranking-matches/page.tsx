import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Empty, PageHeader } from "@/components/PageHeader";
import { ListCard, Pill } from "@/components/ui";
import { listRankingMatches } from "@/lib/db/rankingMatches";
import { formatDateLong, rankingMatchTitle } from "@/lib/format";

export default async function AdminRankingMatchesPage() {
  const matches = await listRankingMatches();

  return (
    <>
      <PageHeader
        eyebrow={`랭킹전 ${matches.length}회`}
        title="랭킹전"
        action={
          <Link
            href="/admin/ranking-matches/new"
            className="flex min-h-11 items-center gap-1 rounded-full bg-accent px-4 text-[15px] font-semibold text-white"
          >
            <Icon name="plus" size={18} strokeWidth={2} />새 랭킹전
          </Link>
        }
      />
      {matches.length === 0 ? (
        <Empty>아직 랭킹전이 없어요. 오른쪽 위에서 새 랭킹전을 만들어요.</Empty>
      ) : (
        <ListCard className="mx-5 mt-4">
          {matches.map((m) => (
            <Link
              key={m.id}
              href={`/admin/ranking-matches/${m.id}`}
              className="flex min-h-14 items-center gap-3 px-4 py-2"
            >
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-2 text-base">
                  {rankingMatchTitle(m.date)}
                  {!m.closed_at && <Pill tone="accent">진행 중</Pill>}
                </span>
                <span className="text-[13px] text-muted">
                  {formatDateLong(m.date)} · {m.entryCount}명
                </span>
              </span>
              <Icon name="chevronRight" size={16} strokeWidth={2.4} className="text-[#c7c7cc]" />
            </Link>
          ))}
        </ListCard>
      )}
    </>
  );
}
