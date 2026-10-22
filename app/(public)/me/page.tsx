import { PageHeader } from "@/components/PageHeader";
import { listMembers } from "@/lib/db/members";
import { getMeId } from "@/lib/me";
import { MemberProfile } from "../MemberProfile";
import { WhoAmI } from "../WhoAmI";

export default async function MyRecordPage() {
  const [meId, members] = await Promise.all([getMeId(), listMembers()]);
  const me = members.find((m) => m.id === meId);

  return (
    <div className="pb-6">
      <PageHeader title="내 기록" back="/home" />
      {me ? <MemberProfile member={me} members={members} /> : <WhoAmI members={members.filter((m) => m.active)} />}
    </div>
  );
}
