import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifyAdminToken } from "./session-token";

export async function isAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verifyAdminToken(token);
}

// 운영진 화면과 모든 쓰기 서버 액션의 첫 줄에서 호출한다. proxy와 별개로 서버에서 다시 확인한다.
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
