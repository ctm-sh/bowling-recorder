// 티어 0(최상위) ~ 14, 미정. 색 대신 회색 글자로만 표시한다.
export function TierBadge({ tier, className = "" }: { tier: number | null; className?: string }) {
  return <span className={`shrink-0 text-[13px] text-muted ${className}`}>{tierLabel(tier)}</span>;
}

export function tierLabel(tier: number | null) {
  return tier === null ? "미정" : `${tier}티어`;
}
