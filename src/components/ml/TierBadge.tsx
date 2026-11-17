import { TIER_META } from "@/lib/ml/risk";
import type { Tier } from "@/lib/ml/types";

export function TierBadge({ tier, className = "" }: { tier: Tier | null | undefined; className?: string }) {
  if (!tier) {
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 ${className}`}>
        NOT SCORED
      </span>
    );
  }
  const meta = TIER_META[tier];
  return (
    <span
      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${className}`}
      style={{ color: meta.color, background: meta.bg }}
    >
      {meta.label}
    </span>
  );
}
