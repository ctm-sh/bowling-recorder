import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { listMembers } from "@/lib/db/members";
import { tierCandidates } from "@/lib/domain/tiers";
import { MemberList } from "./MemberList";

export default async function AdminMembersPage() {
  const members = await listMembers();
  const candidates = tierCandidates(members);

  return (
    <>
      <PageHeader
        title="회원"
        back="/admin"
        action={
          <Link href="/admin/members/new" className="rounded-lg bg-brand px-3 py-1.5 text-sm font-bold text-white">
            + 추가
          </Link>
        }
      />
      <MemberList members={members} candidates={candidates} />
    </>
  );
}
