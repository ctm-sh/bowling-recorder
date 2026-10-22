import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/session-token";

// 운영진 영역 1차 차단. 서버 액션·레이아웃에서도 requireAdmin()으로 다시 확인한다.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const ok = await verifyAdminToken(request.cookies.get(ADMIN_COOKIE)?.value);
  if (!ok) return NextResponse.redirect(new URL("/admin/login", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
