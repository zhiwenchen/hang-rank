import { prisma } from "@/lib/prisma";
import { scoreToTier, tierToScore, type Tier } from "@/lib/tiers";
import type {
  CreateRankingInput,
  CurrentUserDTO,
  HomepageData,
  RankingDetailDTO,
  RankingItemReviewDTO,
  RankingListItemDTO,
  RankingsPayload,
  RateItemInput
} from "@/lib/types";

const EMPTY_VIEWER_ID = "__anonymous_viewer__";

function normalizeViewerId(viewerId?: string | null) {
  return viewerId ?? EMPTY_VIEWER_ID;
}

function nextAverageScore(currentScore: number, ratingCount: number, incomingScore: number) {
  const next = ((currentScore * ratingCount) + incomingScore) / (ratingCount + 1);
  return Math.min(10, Math.max(1, Number(next.toFixed(1))));
}

function toRankingListItem(ranking: {
  id: string;
  title: string;
  category: string;
  description: string;
  likes: number;
  votes: number;
  items: Array<{ score: number }>;
  rankingLikes: Array<{ id: string }>;
}): RankingListItemDTO {
  const average = ranking.items.reduce((sum, item) => sum + item.score, 0) / ranking.items.length;
  return {
    id: ranking.id,
    title: ranking.title,
    category: ranking.category,
    description: ranking.description,
    likes: ranking.likes,
    votes: ranking.votes,
    headlineTier: scoreToTier(average),
    likedByViewer: ranking.rankingLikes.length > 0
  };
}

function toReviewDTO(
  review: {
    id: string;
    userId: string | null;
    authorName: string;
    tier: string;
    review: string;
    likes: number;
    createdAt: Date;
    reviewLikes: Array<{ id: string }>;
  },
  viewerId?: string | null
): RankingItemReviewDTO {
  return {
    id: review.id,
    tier: review.tier as Tier,
    review: review.review,
    likes: review.likes,
    createdAt: review.createdAt.toISOString(),
    authorName: review.authorName,
    likedByViewer: review.reviewLikes.length > 0,
    isOwnedByViewer: Boolean(viewerId && review.userId === viewerId)
  };
}

function toRankingDetail(
  ranking: {
    id: string;
    title: string;
    category: string;
    description: string;
    likes: number;
    votes: number;
    items: Array<{
      id: string;
      name: string;
      review: string;
      image: string | null;
      emoji: string | null;
      score: number;
      ratingsCount: number;
      reviews: Array<{
        id: string;
        userId: string | null;
        authorName: string;
        tier: string;
        review: string;
        likes: number;
        createdAt: Date;
        reviewLikes: Array<{ id: string }>;
      }>;
    }>;
    rankingLikes: Array<{ id: string }>;
  },
  viewerId?: string | null
): RankingDetailDTO {
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
        ratingsCount: item.ratingsCount,
        reviews: item.reviews
          .slice()
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
          .map((review) => toReviewDTO(review, viewerId))
      }))
  };
}

function sortRankings<T extends RankingListItemDTO>(rankings: T[]): T[] {
  const order: Record<Tier, number> = { 夯: 5, 顶级: 4, 人上人: 3, NPC: 2, 拉完了: 1 };
  return rankings.sort((a, b) => order[b.headlineTier] - order[a.headlineTier] || b.likes - a.likes || b.votes - a.votes);
}

function viewerInclude(viewerId?: string | null) {
  const currentViewerId = normalizeViewerId(viewerId);
  return {
    rankingLikes: {
      where: { userId: currentViewerId },
      select: { id: true }
    },
    items: {
      include: {
        reviews: {
          include: {
            reviewLikes: {
              where: { userId: currentViewerId },
              select: { id: true }
            }
          }
        }
      }
    }
  };
}

export async function getHomepageData(category?: string, viewerId?: string | null): Promise<HomepageData> {
  const where = category && category !== "全部" ? { category } : {};
  const include = viewerInclude(viewerId);

  const [rankings, allRankings] = await Promise.all([
    prisma.ranking.findMany({ where, include, orderBy: { createdAt: "desc" } }),
    prisma.ranking.findMany({ include, orderBy: { createdAt: "desc" } })
  ]);

  const rankingDetails: RankingDetailDTO[] = sortRankings(rankings.map((ranking) => toRankingDetail(ranking, viewerId)));
  const summaries: RankingListItemDTO[] = rankingDetails.map((ranking) => ({
    id: ranking.id,
    title: ranking.title,
    category: ranking.category,
    description: ranking.description,
    likes: ranking.likes,
    votes: ranking.votes,
    headlineTier: ranking.headlineTier,
    likedByViewer: ranking.likedByViewer
  }));
  const categories = ["全部", ...new Set<string>(allRankings.map((ranking) => ranking.category))];
  const stats = {
    rankings: allRankings.length,
    reviews: allRankings.reduce((sum, ranking) => sum + ranking.items.length, 0),
    votes: allRankings.reduce((sum, ranking) => sum + ranking.votes, 0)
  };

  return {
    currentUser: null,
    rankings: summaries,
    rankingDetails,
    categories,
    stats
  };
}

export async function getRankingsPayload(category?: string, viewer?: CurrentUserDTO | null): Promise<RankingsPayload> {
  const data = await getHomepageData(category, viewer?.id);
  return {
    currentUser: viewer ?? null,
    rankings: data.rankings,
    categories: data.categories,
    stats: data.stats
  };
}

export async function getRankingDetail(id: string, viewerId?: string | null): Promise<RankingDetailDTO | null> {
  const ranking = await prisma.ranking.findUnique({
    where: { id },
    include: viewerInclude(viewerId)
  });
  return ranking ? toRankingDetail(ranking, viewerId) : null;
}

export async function createRanking(input: CreateRankingInput, viewer: CurrentUserDTO) {
  const ranking = await prisma.ranking.create({
    data: {
      title: input.title,
      category: input.category,
      description: input.description,
      source: "user",
      authorId: viewer.id,
      likes: 0,
      votes: input.items.length * 5,
      items: {
        create: input.items.map((item) => ({
          name: item.name,
          score: tierToScore(item.tier),
          review: item.review,
          image: item.image || "",
          emoji: item.emoji || "✦",
          ratingsCount: 5,
          reviews: {
            create: {
              userId: viewer.id,
              authorName: viewer.displayName,
              tier: item.tier,
              review: item.review,
              likes: 0
            }
          }
        }))
      }
    }
  });

  return getRankingDetail(ranking.id, viewer.id);
}

export async function toggleRankingLike(id: string, viewer: CurrentUserDTO) {
  const ranking = await prisma.ranking.findUnique({
    where: { id },
    select: {
      id: true,
      likes: true,
      rankingLikes: {
        where: { userId: viewer.id },
        select: { id: true }
      }
    }
  });

  if (!ranking) {
    return null;
  }

  await prisma.$transaction(async (tx) => {
    const existingLike = ranking.rankingLikes[0];
    if (existingLike) {
      await tx.rankingLike.delete({ where: { id: existingLike.id } });
      await tx.ranking.update({
        where: { id },
        data: { likes: { decrement: ranking.likes > 0 ? 1 : 0 } }
      });
      return;
    }

    await tx.rankingLike.create({
      data: {
        rankingId: id,
        userId: viewer.id
      }
    });
    await tx.ranking.update({
      where: { id },
      data: { likes: { increment: 1 } }
    });
  });

  return getRankingDetail(id, viewer.id);
}

export async function deleteRanking(id: string) {
  await prisma.ranking.delete({ where: { id } });
}

export async function deleteRankingItem(rankingId: string, itemId: string) {
  const item = await prisma.rankingItem.findFirst({ where: { id: itemId, rankingId }, include: { reviews: true } });
  if (!item) {
    return null;
  }

  await prisma.$transaction([
    prisma.rankingItem.delete({ where: { id: itemId } }),
    prisma.ranking.update({
      where: { id: rankingId },
      data: {
        votes: {
          decrement: Math.min(1, item.ratingsCount)
        }
      }
    })
  ]);

  return getRankingDetail(rankingId);
}

export async function rateRankingItem(rankingId: string, itemId: string, input: RateItemInput, viewer: CurrentUserDTO) {
  const item = await prisma.rankingItem.findFirst({ where: { id: itemId, rankingId } });
  if (!item) {
    return null;
  }

  const nextReview = input.review?.trim() || `给了一个 ${input.tier}，但没有留下锐评。`;

  await prisma.$transaction([
    prisma.rankingItem.update({
      where: { id: itemId },
      data: {
        score: nextAverageScore(item.score, item.ratingsCount, tierToScore(input.tier)),
        ratingsCount: { increment: 1 },
        review: input.review?.trim() ? input.review : item.review
      }
    }),
    prisma.rankingItemReview.create({
      data: {
        rankingItemId: itemId,
        userId: viewer.id,
        authorName: viewer.displayName,
        tier: input.tier,
        review: nextReview,
        likes: 0
      }
    }),
    prisma.ranking.update({
      where: { id: rankingId },
      data: { votes: { increment: 1 } }
    })
  ]);

  return getRankingDetail(rankingId, viewer.id);
}

export async function toggleItemReviewLike(reviewId: string, viewer: CurrentUserDTO) {
  const review = await prisma.rankingItemReview.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      likes: true,
      item: {
        select: {
          rankingId: true
        }
      },
      reviewLikes: {
        where: { userId: viewer.id },
        select: { id: true }
      }
    }
  });

  if (!review) {
    return null;
  }

  const existingLike = review.reviewLikes[0];

  await prisma.$transaction(async (tx) => {
    if (existingLike) {
      await tx.reviewLike.delete({ where: { id: existingLike.id } });
      await tx.rankingItemReview.update({
        where: { id: reviewId },
        data: { likes: { decrement: review.likes > 0 ? 1 : 0 } }
      });
      return;
    }

    await tx.reviewLike.create({
      data: {
        reviewId,
        userId: viewer.id
      }
    });
    await tx.rankingItemReview.update({
      where: { id: reviewId },
      data: { likes: { increment: 1 } }
    });
  });

  const updated = await prisma.rankingItemReview.findUnique({
    where: { id: reviewId },
    select: {
      id: true,
      likes: true,
      item: {
        select: {
          rankingId: true
        }
      },
      reviewLikes: {
        where: { userId: viewer.id },
        select: { id: true }
      }
    }
  });

  if (!updated) {
    return null;
  }

  return {
    reviewId: updated.id,
    likes: updated.likes,
    likedByViewer: updated.reviewLikes.length > 0,
    rankingId: updated.item.rankingId
  };
}
