import type { Tier } from "@/lib/tiers";

export type CurrentUserDTO = {
  id: string;
  displayName: string;
  isAnonymous: boolean;
};

export type RankingListItemDTO = {
  id: string;
  title: string;
  category: string;
  description: string;
  likes: number;
  votes: number;
  headlineTier: Tier;
  likedByViewer: boolean;
};

export type RankingItemDTO = {
  id: string;
  name: string;
  review: string;
  image: string | null;
  emoji: string | null;
  displayTier: Tier;
  ratingsCount: number;
  reviews: RankingItemReviewDTO[];
};

export type RankingItemReviewDTO = {
  id: string;
  tier: Tier;
  review: string;
  likes: number;
  createdAt: string;
  authorName: string;
  likedByViewer: boolean;
  isOwnedByViewer: boolean;
};

export type RankingDetailDTO = RankingListItemDTO & {
  items: RankingItemDTO[];
};

export type RankingsPayload = {
  currentUser: CurrentUserDTO | null;
  rankings: RankingListItemDTO[];
  categories: string[];
  stats: {
    rankings: number;
    reviews: number;
    votes: number;
  };
};

export type HomepageData = RankingsPayload & {
  rankingDetails: RankingDetailDTO[];
};

export type CreateRankingInput = {
  title: string;
  category: string;
  description: string;
  items: Array<{
    name: string;
    tier: Tier;
    review: string;
    image?: string;
    emoji?: string;
  }>;
};

export type RateItemInput = {
  tier: Tier;
  review?: string;
};
