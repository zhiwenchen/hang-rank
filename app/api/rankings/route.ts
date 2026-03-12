import { NextRequest, NextResponse } from "next/server";
import { createRanking, getHomepageData, getRankingsPayload } from "@/lib/data";
import { createRankingSchema } from "@/lib/validators";
import { assertSafeImage, assertSafeText, cleanupRateLimitStore, enforceRateLimit, getClientIdentifier } from "@/lib/security";
import { handleApiError } from "@/lib/api";
import { getOptionalCurrentUserFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category") ?? undefined;
  const currentUser = await getOptionalCurrentUserFromRequest(request);
  return NextResponse.json(await getRankingsPayload(category, currentUser));
}

export async function POST(request: NextRequest) {
  try {
    cleanupRateLimitStore();
    enforceRateLimit(`create:${getClientIdentifier(request)}`, 6, 10 * 60 * 1000);

    const body = await request.json();
    const parsed = createRankingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "请求参数不合法" }, { status: 400 });
    }

    assertSafeText(parsed.data.title, "title");
    assertSafeText(parsed.data.category, "category");
    assertSafeText(parsed.data.description, "description");
    parsed.data.items.forEach((item) => {
      assertSafeText(item.name, "itemName");
      assertSafeText(item.review, "review");
      assertSafeImage(item.image);
    });

    const currentUser = await getOptionalCurrentUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ message: "匿名登录状态初始化失败，请刷新后重试" }, { status: 401 });
    }

    const ranking = await createRanking(parsed.data, currentUser);
    const homepageData = await getHomepageData(undefined, currentUser.id);
    return NextResponse.json({ ranking, stats: homepageData.stats }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
