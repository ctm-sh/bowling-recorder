import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/Icon";
import { TEAM_NAME } from "@/lib/brand";
import { getMeId } from "@/lib/me";
import { AdminEntry } from "./AdminEntry";

// 첫 화면: 회원 / 운영진 입구. 이 기기에서 이름을 이미 골랐다면 바로 회원 홈으로.
// 단, 뒤로 가기·처음 화면 링크(?choose=1)로 온 경우에는 첫 화면을 보여준다.
export default async function StartPage({ searchParams }: PageProps<"/">) {
  const { choose } = await searchParams;
  if (!choose && (await getMeId())) redirect("/home");

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="flex flex-col items-center gap-3.5 bg-black px-6 pt-16 pb-10 text-center text-white">
        <Image src="/icon-512.png" alt={`${TEAM_NAME} 볼링 클럽 앱 아이콘`} width={120} height={120} priority />
        <h1 className="text-[34px] leading-[1.12] font-bold tracking-[-0.6px]">{TEAM_NAME}</h1>
        <p className="text-[15px] leading-[1.47] text-dark-muted">점수, 팀, 핸디, 정산을 한곳에서.</p>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-5 pt-7">
        <span className="pl-1 text-[13px] font-semibold text-muted">어떻게 들어오셨나요?</span>

        <Link href="/home" className="flex min-h-11 items-center gap-4 rounded-[18px] bg-surface p-5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon name="user" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="text-[19px] font-bold">회원</span>
            <span className="text-sm leading-[1.4] text-muted">로그인 없이 내 점수, 낼 금액, 기록을 봐요</span>
          </span>
          <Icon name="chevronRight" size={16} strokeWidth={2.4} className="text-[#c7c7cc]" />
        </Link>

        <AdminEntry />
      </div>

      <p className="px-8 pt-4 pb-9 text-center text-xs leading-normal text-muted">
        회원 화면은 링크가 있는 누구나 볼 수 있어요. 수정은 운영진만 할 수 있어요.
      </p>
    </main>
  );
}
