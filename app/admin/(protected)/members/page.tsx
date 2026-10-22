import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { listMembers } from "@/lib/db/members";
import { suggestTier, tierReferences } from "@/lib/domain/tiers";
import { MemberList } from "./MemberList";

export default async function AdminMembersPage() {
  const members = await listMembers();
  const refs = tierReferences(members);
  const candidates = Object.fromEntries(
    members
      .filter((m) => m.active)
      .map((m) => [m.id, suggestTier(m, refs)] as const)
      .filter(([, s]) => s.kind !== "none")
      .map(([id, s]) => [id, s.kind as "up" | "down"]),
  );

  return (
    <>
      <PageHeader
        title="회원"
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
