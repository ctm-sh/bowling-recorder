// 운영진 세션 토큰 서명/검증. proxy(Edge)와 서버 코드에서 함께 쓰므로 next/headers에 의존하지 않는다.
import { SignJWT, jwtVerify } from "jose";

export const ADMIN_COOKIE = "admin_session";
export const ADMIN_SESSION_DAYS = 30;

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET 환경 변수가 없거나 32자 미만입니다.");
  }
  return new TextEncoder().encode(secret);
}

export async function signAdminToken() {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_DAYS}d`)
    .sign(secretKey());
}

export async function verifyAdminToken(token: string | undefined) {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return payload.role === "admin";
  } catch {
    return false;
  }
}
