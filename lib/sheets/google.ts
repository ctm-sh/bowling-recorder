import "server-only";
import { importPKCS8, SignJWT } from "jose";
import type { Tab } from "./rows";

// 서비스 계정으로 구글 시트 REST API를 직접 호출한다 (googleapis 패키지 없이).
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";

export function googleConfigured() {
  return !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && !!process.env.GOOGLE_PRIVATE_KEY;
}

export function serviceAccountEmail() {
  return process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? null;
}

async function accessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // .env에는 줄바꿈을 \n 문자로 넣으므로 실제 줄바꿈으로 되돌린다
  const pem = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !pem) throw new Error("구글 서비스 계정 환경 변수가 설정되지 않았어요.");

  const key = await importPKCS8(pem, "RS256");
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/spreadsheets" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(email)
    .setAudience(TOKEN_URL)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) throw new Error(`구글 인증 실패 (${res.status}): 서비스 계정 키를 확인해주세요.`);
  return ((await res.json()) as { access_token: string }).access_token;
}

async function call(token: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 403) {
    throw new Error(`시트에 접근 권한이 없어요. 시트를 ${serviceAccountEmail()} 에 "편집자"로 공유해주세요.`);
  }
  if (res.status === 404) throw new Error("시트를 찾을 수 없어요. 설정의 시트 주소를 확인해주세요.");
  if (!res.ok) throw new Error(`구글 시트 오류 (${res.status}): ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

/** 탭이 없으면 만들고, 각 탭 내용을 통째로 바꿔 쓴다 */
export async function writeTabs(spreadsheetId: string, tabs: Tab[]) {
  const token = await accessToken();
  const base = `${SHEETS}/${encodeURIComponent(spreadsheetId)}`;

  type Props = { title: string; sheetId: number; gridProperties: { rowCount: number; columnCount: number } };
  const meta = (await call(token, `${base}?fields=sheets.properties(title,sheetId,gridProperties)`)) as {
    sheets: { properties: Props }[];
  };
  const existing = new Map(meta.sheets.map((s) => [s.properties.title, s.properties]));

  // 없는 탭은 만들고, 있는 탭은 행·열이 모자라면 늘린다 (새 탭은 기본 1000행)
  const requests = tabs.flatMap<object>((t) => {
    const rowCount = Math.max(t.rows.length + 100, 1000);
    const columnCount = Math.max(...t.rows.map((r) => r.length), 26);
    const props = existing.get(t.title);
    if (!props) return [{ addSheet: { properties: { title: t.title, gridProperties: { rowCount, columnCount } } } }];
    if (props.gridProperties.rowCount >= t.rows.length && props.gridProperties.columnCount >= columnCount) return [];
    return [
      {
        updateSheetProperties: {
          properties: { sheetId: props.sheetId, gridProperties: { rowCount, columnCount } },
          fields: "gridProperties(rowCount,columnCount)",
        },
      },
    ];
  });
  if (requests.length) await call(token, `${base}:batchUpdate`, { requests });

  const range = (t: Tab) => `'${t.title}'`;
  await call(token, `${base}/values:batchClear`, { ranges: tabs.map(range) });
  await call(token, `${base}/values:batchUpdate`, {
    valueInputOption: "RAW",
    data: tabs.map((t) => ({ range: `${range(t)}!A1`, values: t.rows })),
  });
}
