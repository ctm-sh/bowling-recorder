// 기존 `볼링 점수 기록지.xlsx`의 회원·티어·점수를 DB로 가져온다.
//   node --env-file=.env.local scripts/import-xlsx.mjs ["볼링 점수 기록지.xlsx"]
//
// - 회원: `티어표` 시트 (티어 99 = 미정). `점수입력`에만 있는 사람은 비활성 + 에버로 추정한 티어.
// - 점수: `점수입력` 시트 (점수기록지보다 최신). 날짜·팀 정보가 없어 game_id 없이 행 순서(seq)만 보존한다.
// - 다시 실행해도 안전하다: 이미 있는 회원은 건드리지 않고, 엑셀 출처 점수(game_id null)만 통째로 교체한다.
import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";

const file = process.argv[2] ?? "볼링 점수 기록지.xlsx";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY가 필요합니다 (--env-file=.env.local).");
const db = createClient(url, key, { auth: { persistSession: false } });

function cellValue(cell) {
  const v = cell.value;
  if (v && typeof v === "object" && "result" in v) return v.result;
  return v;
}

function rows(sheet, cols) {
  const out = [];
  sheet.eachRow((row, i) => {
    if (i === 1) return;
    const values = cols.map((c) => cellValue(row.getCell(c)));
    if (values[0] != null && String(values[0]).trim() !== "") out.push(values);
  });
  return out;
}

// lib/domain/teams.ts의 estimatedAvg(205 - 티어×10)를 거꾸로 적용
function tierFromAvg(avg) {
  return Math.min(14, Math.max(0, Math.round((205 - avg) / 10)));
}

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);

const tierRows = rows(wb.getWorksheet("티어표"), [1, 2]).map(([name, tier]) => ({
  name: String(name).trim(),
  tier: tier === 99 || tier == null ? null : Number(tier),
}));
const scoreRows = rows(wb.getWorksheet("점수입력"), [1, 2]).map(([name, score], seq) => ({
  name: String(name).trim(),
  score: Number(score),
  seq,
}));

const bad = scoreRows.filter((r) => !Number.isInteger(r.score) || r.score < 0 || r.score > 300);
if (bad.length) throw new Error(`잘못된 점수: ${JSON.stringify(bad.slice(0, 5))}`);

const known = new Set(tierRows.map((r) => r.name));
const extras = new Map();
for (const r of scoreRows) {
  if (known.has(r.name)) continue;
  extras.set(r.name, [...(extras.get(r.name) ?? []), r.score]);
}

const members = [
  ...tierRows.map((r) => ({ name: r.name, tier: r.tier, active: true })),
  ...[...extras].map(([name, scores]) => ({
    name,
    tier: tierFromAvg(scores.reduce((a, b) => a + b, 0) / scores.length),
    active: false,
    memo: "엑셀 티어표에 없음 · 티어는 에버로 추정",
  })),
];

const { error: upsertError } = await db
  .from("members")
  .upsert(members, { onConflict: "name", ignoreDuplicates: true });
if (upsertError) throw upsertError;

const { data: saved, error: listError } = await db.from("members").select("id, name");
if (listError) throw listError;
const idByName = new Map(saved.map((m) => [m.name, m.id]));

const { error: deleteError } = await db.from("scores").delete().is("game_id", null);
if (deleteError) throw deleteError;

const scores = scoreRows.map((r) => ({ member_id: idByName.get(r.name), score: r.score, seq: r.seq }));
for (let i = 0; i < scores.length; i += 500) {
  const { error } = await db.from("scores").insert(scores.slice(i, i + 500));
  if (error) throw error;
}

console.log(`회원 ${members.length}명 (활성 ${tierRows.length}, 비활성 ${extras.size}) · 점수 ${scores.length}게임 가져옴`);
for (const [name, list] of extras) console.log(`  비활성 추가: ${name} (${list.length}게임)`);
