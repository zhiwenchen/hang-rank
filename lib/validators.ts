import { z } from "zod";
import { TIERS } from "@/lib/tiers";

export const createRankingSchema = z.object({
  title: z.string().trim().min(1).max(40),
  category: z.string().trim().min(1).max(20),
  description: z.string().trim().min(1).max(120),
  items: z.array(z.object({
    name: z.string().trim().min(1).max(24),
    tier: z.enum(TIERS),
    review: z.string().trim().min(1).max(100),
    image: z.string().optional().default(""),
    emoji: z.string().optional().default("✦")
  })).min(1).max(20)
});

export const rateItemSchema = z.object({
  tier: z.enum(TIERS),
  review: z.string().trim().max(100).optional().default("")
});
