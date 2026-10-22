import { notFound } from "next/navigation";
import { StepBar } from "@/components/Flow";
import { NavBar } from "@/components/PageHeader";
import { attendanceCandidates, getSession, membersInGames } from "@/lib/db/sessions";
import { formatDateLong, formatWon } from "@/lib/format";
import { saveAttendance } from "../../actions";
import { AttendanceForm } from "./AttendanceForm";

export default async function AttendancePage({ params }: PageProps<"/admin/sessions/[id]/attendance">) {
  const { id } = await params;
  const data = await getSession(id);
  if (!data) notFound();

  const [candidates, locked] = await Promise.all([attendanceCandidates(id, data.attendeeIds), membersInGames(id)]);

  return (
    <>
      <NavBar title="참석 체크" back={`/admin/sessions/${id}`} backLabel="정모" />
      <StepBar current="참석" />
      {/* 게임비는 정모 화면에서 바꾼다 */}
      <div className="mx-5 mt-5 overflow-hidden rounded-2xl bg-surface">
        <div className="flex min-h-[52px] items-center border-b border-separator px-4">
          <span className="flex-1 text-base">날짜</span>
          <span className="text-base text-muted">{formatDateLong(data.session.date)}</span>
        </div>
        <div className="flex min-h-[52px] items-center px-4">
          <span className="flex-1 text-base">
            게임비 <span className="text-[13px] text-muted">1인 1게임</span>
          </span>
          <span className="text-base text-muted">{formatWon(data.session.fee_per_game)}</span>
        </div>
      </div>
      <AttendanceForm
        action={saveAttendance.bind(null, id)}
        candidates={candidates}
        initial={data.attendeeIds}
        locked={[...locked]}
      />
    </>
  );
}
