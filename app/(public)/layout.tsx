import { BottomTabs, type Tab } from "@/components/BottomTabs";

const tabs: Tab[] = [
  { href: "/home", label: "홈", icon: "🏠" },
  { href: "/results", label: "결과", icon: "🎳" },
  { href: "/me", label: "내 기록", icon: "📈" },
  { href: "/ranking", label: "랭킹", icon: "🏆" },
];

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {children}
      <BottomTabs tabs={tabs} rootHref="/home" />
    </>
  );
}
