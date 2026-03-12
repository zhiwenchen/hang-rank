import { NextRequest, NextResponse } from "next/server";
import { toggleItemReviewLike } from "@/lib/data";
import { cleanupRateLimitStore, enforceRateLimit, getClientIdentifier } from "@/lib/security";
import { handleApiError } from "@/lib/api";
import { getOptionalCurrentUserFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    cleanupRateLimitStore();
    enforceRateLimit(`review-like:${params.id}:${getClientIdentifier(request)}`, 20, 10 * 60 * 1000);
    const currentUser = await getOptionalCurrentUserFromRequest(request);
    if (!currentUser) {
      return NextResponse.json({ message: "匿名登录状态初始化失败，请刷新后重试" }, { status: 401 });
    }

    const result = await toggleItemReviewLike(params.id, currentUser);
    if (!result) {
      return NextResponse.json({ message: "评价不存在" }, { status: 404 });
    }

    return NextResponse.json({ ...result, currentUser });
  } catch (error) {
    return handleApiError(error);
  }
}
