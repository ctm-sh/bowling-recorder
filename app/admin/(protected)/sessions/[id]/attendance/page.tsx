import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { formatDate } from "@/lib/format";
import { attendanceCandidates, getSession, membersInGames } from "@/lib/db/sessions";
import { saveAttendance } from "../../actions";
import { AttendanceForm } from "./AttendanceForm";

export default async function AttendancePage({ params }: PageProps<"/admin/sessions/[id]/attendance">) {
  const { id } = await params;
  const data = await getSession(id);
  if (!data) notFound();

  const [candidates, locked] = await Promise.all([
    attendanceCandidates(id, data.attendeeIds),
    membersInGames(id),
  ]);

  return (
    <>
      <PageHeader
        title={`${formatDate(data.session.date)} 참석 체크`}
        action={
          <Link href={`/admin/sessions/${id}`} className="text-sm text-muted underline">
            취소
          </Link>
        }
      />
      <AttendanceForm
        action={saveAttendance.bind(null, id)}
        candidates={candidates}
        initial={data.attendeeIds}
        locked={[...locked]}
      />
    </>
  );
}
