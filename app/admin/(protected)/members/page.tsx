import Link from "next/link";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { listMembers } from "@/lib/db/members";
import { getSettings } from "@/lib/db/settings";
import { tierCandidates } from "@/lib/domain/tiers";
import { MemberList } from "./MemberList";

export default async function AdminMembersPage() {
  const [members, settings] = await Promise.all([listMembers(), getSettings()]);
  const candidates = tierCandidates(members);

  return (
    <>
      <PageHeader
        eyebrow={`${members.length}명 · 활동 ${members.filter((m) => m.active).length}명`}
        title="회원"
        action={
          <Link
            href="/admin/members/new"
            aria-label="회원 추가"
            className="flex size-11 items-center justify-center rounded-full bg-fill text-accent"
          >
            <Icon name="plus" size={20} strokeWidth={2} />
          </Link>
        }
      />
      <MemberList members={members} candidates={candidates} recentN={settings.recent_n} />
    </>
  );
}
