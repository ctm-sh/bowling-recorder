import "server-only";
import { cookies } from "next/headers";

// 회원 화면의 "나는 누구". 로그인이 아니라 이 기기에서 고른 회원일 뿐이라 권한에는 쓰지 않는다.
export const ME_COOKIE = "me";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getMeId() {
  const id = (await cookies()).get(ME_COOKIE)?.value;
  return id && UUID.test(id) ? id : null;
}
