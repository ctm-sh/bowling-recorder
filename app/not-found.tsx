import Link from "next/link";
import { START_HREF, START_LABEL } from "@/lib/brand";
import { primaryButton } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col justify-center gap-3 px-5">
      <span className="text-[13px] font-semibold text-muted">404</span>
      <h1 className="text-[34px] leading-[1.12] font-bold tracking-[-0.6px]">거터예요!</h1>
      <p className="text-[15px] leading-[1.47] text-muted">찾는 페이지가 없거나 삭제됐어요.</p>
      <Link href={START_HREF} className={`${primaryButton} mt-4`}>
        {START_LABEL}
      </Link>
    </main>
  );
}
