/** 승급 후보(연파랑) · 강등 후보(검정) 캡슐 */
export function CandidateBadge({ kind }: { kind: "up" | "down" }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-[7px] py-0.5 text-[11px] font-semibold tracking-normal ${
        kind === "up" ? "bg-accent-soft text-[#0058b0]" : "bg-foreground text-white"
      }`}
    >
      {kind === "up" ? "승급 후보" : "강등 후보"}
    </span>
  );
}
