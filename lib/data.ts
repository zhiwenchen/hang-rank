import { prisma } from "@/lib/prisma";
import { scoreToTier, tierToScore, weightedScore, type Tier } from "@/lib/tiers";
import type { CreateRankingInput, HomepageData, RankingDetailDTO, RankingListItemDTO, RankingsPayload, RateItemInput } from "@/lib/types";

function toRankingListItem(ranking: {
  id: string;
  title: string;
  category: string;
  description: string;
  likes: number;
  votes: number;
  items: Array<{ score: number }>;
}): RankingListItemDTO {
  const average = ranking.items.reduce((sum, item) => sum + item.score, 0) / ranking.items.length;
  return {
    id: ranking.id,
    title: ranking.title,
    category: ranking.category,
    description: ranking.description,
    likes: ranking.likes,
    votes: ranking.votes,
    headlineTier: scoreToTier(average)
  };
}

function toRankingDetail(ranking: {
  id: string;
  title: string;
  category: string;
  description: string;
  likes: number;
  votes: number;
  items: Array<{ id: string; name: string; review: string; image: string | null; emoji: string | null; score: number; ratingsCount: number }>;
}): RankingDetailDTO {
  return {
    ...toRankingListItem(ranking),
    items: ranking.items
      .slice()
      .sort((a, b) => b.score - a.score)
      .map((item) => ({
        id: item.id,
        name: item.name,
        review: item.review,
        image: item.image,
        emoji: item.emoji,
        displayTier: scoreToTier(item.score),
        ratingsCount: item.ratingsCount
      }))
  };
}

function sortRankings<T extends RankingListItemDTO>(rankings: T[]): T[] {
  const order: Record<Tier, number> = { 夯: 5, 顶级: 4, 人上人: 3, NPC: 2, 拉完了: 1 };
  return rankings.sort((a, b) => order[b.headlineTier] - order[a.headlineTier] || b.likes - a.likes || b.votes - a.votes);
}

export async function getHomepageData(category?: string): Promise<HomepageData> {
  const where = category && category !== "全部" ? { category } : {};
  const [rankings, allRankings] = await Promise.all([
    prisma.ranking.findMany({ where, include: { items: true }, orderBy: { createdAt: "desc" } }),
    prisma.ranking.findMany({ include: { items: true } })
  ]);

  const rankingDetails: RankingDetailDTO[] = sortRankings(rankings.map(toRankingDetail));
  const summaries: RankingListItemDTO[] = rankingDetails.map((ranking) => ({
    id: ranking.id,
    title: ranking.title,
    category: ranking.category,
    description: ranking.description,
    likes: ranking.likes,
    votes: ranking.votes,
    headlineTier: ranking.headlineTier
  }));
  const categories = ["全部", ...new Set<string>(allRankings.map((ranking: { category: string }) => ranking.category))];
  const stats = {
    rankings: allRankings.length,
    reviews: allRankings.reduce((sum: number, ranking: { items: Array<unknown> }) => sum + ranking.items.length, 0),
    votes: allRankings.reduce((sum: number, ranking: { votes: number }) => sum + ranking.votes, 0)
  };

  return {
    rankings: summaries,
    rankingDetails,
    categories,
    stats
  };
}

export async function getRankingsPayload(category?: string): Promise<RankingsPayload> {
  const data = await getHomepageData(category);
  return { rankings: data.rankings, categories: data.categories, stats: data.stats };
}

export async function getRankingDetail(id: string): Promise<RankingDetailDTO | null> {
  const ranking = await prisma.ranking.findUnique({ where: { id }, include: { items: true } });
  return ranking ? toRankingDetail(ranking) : null;
}

export async function createRanking(input: CreateRankingInput) {
  const ranking = await prisma.ranking.create({
    data: {
      title: input.title,
      category: input.category,
      description: input.description,
      source: "user",
      likes: 0,
      votes: input.items.length * 5,
      items: {
        create: input.items.map((item) => ({
          name: item.name,
          score: tierToScore(item.tier),
          review: item.review,
          image: item.image || "",
          emoji: item.emoji || "✦",
          ratingsCount: 5
        }))
      }
    },
    include: { items: true }
  });

  return toRankingDetail(ranking);
}

export async function likeRanking(id: string) {
  const ranking = await prisma.ranking.update({
    where: { id },
    data: { likes: { increment: 1 } },
    include: { items: true }
  });
  return toRankingDetail(ranking);
}

export async function rateRankingItem(rankingId: string, itemId: string, input: RateItemInput) {
  const item = await prisma.rankingItem.findFirst({ where: { id: itemId, rankingId } });
  if (!item) {
    return null;
  }

  await prisma.$transaction([
    prisma.rankingItem.update({
      where: { id: itemId },
      data: {
        score: weightedScore(item.score, item.ratingsCount, tierToScore(input.tier)),
        ratingsCount: { increment: 1 },
        review: input.review?.trim() ? input.review : item.review
      }
    }),
    prisma.ranking.update({
      where: { id: rankingId },
      data: { votes: { increment: 1 } }
    })
  ]);

  return getRankingDetail(rankingId);
}
