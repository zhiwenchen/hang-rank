import { NextRequest, NextResponse } from "next/server";
import { rateRankingItem } from "@/lib/data";
import { rateItemSchema } from "@/lib/validators";
import { assertSafeText, cleanupRateLimitStore, enforceRateLimit, getClientIdentifier } from "@/lib/security";
import { handleApiError } from "@/lib/api";
import { getOptionalCurrentUserFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    cleanupRateLimitStore();
    enforceRateLimit(`rate:${params.id}:${params.itemId}:${getClientIdentifier(request)}`, 12, 10 * 60 * 1000);

    const body = await request.json();
    const parsed = rateItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: "请求参数不合法" }, { status: 400 });
    }

    assertSafeText(parsed.data.review ?? "", "review");

    const currentUser = await getOptionalCurrentUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ message: "匿名登录状态初始化失败，请刷新后重试" }, { status: 401 });
    }

    const ranking = await rateRankingItem(params.id, params.itemId, parsed.data, currentUser);
    if (!ranking) {
      return NextResponse.json({ message: "评分目标不存在" }, { status: 404 });
    }

    return NextResponse.json({ ranking, currentUser });
  } catch (error) {
    return handleApiError(error);
  }
}
