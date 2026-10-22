import { notFound } from "next/navigation";
import { connection } from "next/server";
import { listMembers } from "@/lib/db/members";
import { MemberProfile } from "../../MemberProfile";

export default async function MemberPage({ params }: PageProps<"/members/[id]">) {
  await connection();
  const { id } = await params;
  const members = await listMembers();
  const member = members.find((m) => m.id === id);
  if (!member) notFound();

  return (
    <div className="pb-6">
      <MemberProfile member={member} members={members} title={`${member.name} 기록`} back="/ranking" backLabel="랭킹" />
    </div>
  );
}
