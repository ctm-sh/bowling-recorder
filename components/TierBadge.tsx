// 티어 0(최상위) ~ 14. 상위일수록 진한 남색, 미정은 점선 회색.
export function TierBadge({ tier }: { tier: number | null }) {
  if (tier === null) {
    return (
      <span className="inline-flex h-6 min-w-9 items-center justify-center rounded-md border border-dashed border-muted px-1 text-xs text-muted">
        미정
      </span>
    );
  }
  const strong = tier <= 4;
  return (
    <span
      className={`inline-flex h-6 min-w-9 items-center justify-center rounded-md px-1 text-xs font-bold ${
        strong ? "bg-brand text-white" : "bg-brand-soft text-brand"
      }`}
    >
      {tier}티어
    </span>
  );
}

export function tierLabel(tier: number | null) {
  return tier === null ? "미정" : `${tier}티어`;
}
