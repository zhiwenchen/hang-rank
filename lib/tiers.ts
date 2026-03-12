export const TIERS = ["夯", "顶级", "人上人", "NPC", "拉完了"] as const;

export type Tier = (typeof TIERS)[number];

export const tierScoreMap: Record<Tier, number> = {
  夯: 9.6,
  顶级: 8.9,
  人上人: 8.2,
  NPC: 7.3,
  拉完了: 5.8
};

export function tierToScore(tier: Tier): number {
  return tierScoreMap[tier];
}

export function scoreToTier(score: number): Tier {
  if (score >= 9.3) return "夯";
  if (score >= 8.7) return "顶级";
  if (score >= 8.0) return "人上人";
  if (score >= 7.0) return "NPC";
  return "拉完了";
}

export function weightedScore(currentScore: number, ratingCount: number, incomingScore: number): number {
  const next = ((currentScore * ratingCount) + incomingScore) / (ratingCount + 1);
  return Math.min(10, Math.max(1, Number(next.toFixed(1))));
}
