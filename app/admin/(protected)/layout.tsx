import { BottomTabs, TabBarSpacer, type Tab } from "@/components/BottomTabs";
import { requireAdmin } from "@/lib/auth";

const tabs: Tab[] = [
  { href: "/admin", label: "홈", icon: "home" },
  { href: "/admin/sessions", label: "정모", icon: "calendar" },
  { href: "/admin/members", label: "회원", icon: "users" },
  { href: "/admin/settings", label: "설정", icon: "sliders" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();

  return (
    <>
      {children}
      <TabBarSpacer />
      <BottomTabs tabs={tabs} rootHref="/admin" />
    </>
  );
}
