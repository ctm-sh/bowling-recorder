import Link from "next/link";
import { BottomTabs, type Tab } from "@/components/BottomTabs";

const tabs: Tab[] = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/results", label: "결과", icon: "🎳" },
  { href: "/me", label: "내 기록", icon: "📈" },
  { href: "/ranking", label: "랭킹", icon: "🏆" },
];

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {children}
      <p className="py-6 text-center text-xs">
        <Link href="/admin" className="text-muted underline">
          운영진 로그인
        </Link>
      </p>
      <BottomTabs tabs={tabs} rootHref="/" />
    </>
  );
}
