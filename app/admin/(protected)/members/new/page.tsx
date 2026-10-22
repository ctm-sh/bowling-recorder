import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { createMember } from "../actions";
import { MemberForm } from "../MemberForm";

export default function NewMemberPage() {
  return (
    <>
      <PageHeader
        title="회원 추가"
        action={
          <Link href="/admin/members" className="text-sm text-muted underline">
            취소
          </Link>
        }
      />
      <MemberForm action={createMember} initial={{ name: "", tier: null, active: true, memo: null }} isNew />
    </>
  );
}
