import { BottomTabs, TabBarSpacer, type Tab } from "@/components/BottomTabs";

const tabs: Tab[] = [
  { href: "/home", label: "홈", icon: "home" },
  { href: "/results", label: "결과", icon: "results" },
  { href: "/me", label: "내 기록", icon: "chart" },
  { href: "/ranking", label: "랭킹", icon: "trophy" },
];

export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {children}
      <TabBarSpacer />
      <BottomTabs tabs={tabs} rootHref="/home" />
    </>
  );
}
