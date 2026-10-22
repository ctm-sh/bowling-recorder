import { BottomTabs, type Tab } from "@/components/BottomTabs";
import { requireAdmin } from "@/lib/auth";

const tabs: Tab[] = [
  { href: "/admin", label: "홈", icon: "🏠" },
  { href: "/admin/sessions", label: "정모", icon: "🎳" },
  { href: "/admin/members", label: "회원", icon: "👥" },
  { href: "/admin/settings", label: "설정", icon: "⚙️" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();

  return (
    <>
      {children}
      <BottomTabs tabs={tabs} rootHref="/admin" />
    </>
  );
}
