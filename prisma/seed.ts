import { PrismaClient } from "@prisma/client";
import { scoreToTier } from "../lib/tiers";

const prisma = new PrismaClient();

const rankings = [
  {
    id: "games-001",
    source: "seed",
    title: "像素游戏夯拉总榜",
    category: "游戏",
    description: "社区玩家按综合体验、耐玩度和朋友安利强度投出来的像素游戏排行榜。",
    likes: 824,
    votes: 1432,
    createdAt: new Date("2026-03-10T10:00:00.000Z"),
    updatedAt: new Date("2026-03-12T09:00:00.000Z"),
    items: [
      { id: "stardew", name: "星露谷物语", score: 9.7, review: "看似养老，实则偷走你整个周末。", image: "", emoji: "🍓", ratingsCount: 480 },
      { id: "deadcells", name: "死亡细胞", score: 9.3, review: "每次觉得自己会了，下一把又被教育。", image: "", emoji: "🗡️", ratingsCount: 360 },
      { id: "undertale", name: "传说之下", score: 8.8, review: "梗、音乐、情绪，全都踩在点上。", image: "", emoji: "💛", ratingsCount: 295 },
      { id: "celeste", name: "蔚蓝", score: 8.2, review: "难，但难得很有理由。", image: "", emoji: "⛰️", ratingsCount: 215 }
    ]
  },
  {
    id: "food-001",
    source: "seed",
    title: "夜宵摊夯拉总榜",
    category: "美食",
    description: "只看深夜战斗力，谁能在凌晨一点还让人眼前一亮。",
    likes: 512,
    votes: 960,
    createdAt: new Date("2026-03-09T18:00:00.000Z"),
    updatedAt: new Date("2026-03-12T09:00:00.000Z"),
    items: [
      { id: "bbq", name: "路边炭烤", score: 9.4, review: "烟火气就是王道，拿起签子就没人端着了。", image: "", emoji: "🔥", ratingsCount: 315 },
      { id: "crayfish", name: "十三香小龙虾", score: 9.1, review: "剥的时候嫌麻烦，吃的时候又完全停不下。", image: "", emoji: "🦞", ratingsCount: 280 },
      { id: "fried", name: "炸串摊", score: 8.5, review: "酱刷到位了，快乐就很廉价且直接。", image: "", emoji: "🍢", ratingsCount: 240 },
      { id: "tofu", name: "铁板豆腐", score: 7.6, review: "便宜、稳、没惊喜，但永远不会出大错。", image: "", emoji: "🥢", ratingsCount: 125 }
    ]
  },
  {
    id: "anime-001",
    source: "seed",
    title: "抽象动画角色总榜",
    category: "动画",
    description: "按角色气场、名场面和互联网传播度综合计算。",
    likes: 693,
    votes: 1187,
    createdAt: new Date("2026-03-08T08:00:00.000Z"),
    updatedAt: new Date("2026-03-12T09:00:00.000Z"),
    items: [
      { id: "mob", name: "影山茂夫", score: 9.1, review: "平静得像白纸，爆发时直接撕开天花板。", image: "", emoji: "⚡", ratingsCount: 310 },
      { id: "gojo", name: "五条悟", score: 8.9, review: "出场就是流量，离场还是流量。", image: "", emoji: "🕶️", ratingsCount: 295 },
      { id: "anya", name: "阿尼亚", score: 8.4, review: "表情包储备量极其夸张。", image: "", emoji: "🥜", ratingsCount: 235 },
      { id: "shinji", name: "碇真嗣", score: 6.9, review: "让人复杂到很难只用喜欢或不喜欢来评价。", image: "", emoji: "🪑", ratingsCount: 150 }
    ]
  }
];

async function main() {
  for (const ranking of rankings) {
    await prisma.ranking.upsert({
      where: { id: ranking.id },
      update: {
        title: ranking.title,
        category: ranking.category,
        description: ranking.description,
        source: ranking.source,
        likes: ranking.likes,
        votes: ranking.votes,
        createdAt: ranking.createdAt,
        updatedAt: ranking.updatedAt,
        items: {
          deleteMany: {},
          create: ranking.items.map((item) => ({
            ...item,
            reviews: {
              create: {
                authorName: "系统热评",
                tier: scoreToTier(item.score),
                review: item.review,
                likes: 0,
                createdAt: ranking.createdAt,
                updatedAt: ranking.updatedAt
              }
            }
          }))
        }
      },
      create: {
        ...ranking,
        items: {
          create: ranking.items.map((item) => ({
            ...item,
            reviews: {
              create: {
                authorName: "系统热评",
                tier: scoreToTier(item.score),
                review: item.review,
                likes: 0,
                createdAt: ranking.createdAt,
                updatedAt: ranking.updatedAt
              }
            }
          }))
        }
      }
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
