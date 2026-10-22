import { PageHeader } from "@/components/PageHeader";
import { createMember } from "../actions";
import { MemberForm } from "../MemberForm";

export default function NewMemberPage() {
  return (
    <>
      <PageHeader title="회원 추가" back="/admin/members" backLabel="회원" />
      <MemberForm action={createMember} initial={{ name: "", tier: null, active: true, memo: null }} isNew />
    </>
  );
}
