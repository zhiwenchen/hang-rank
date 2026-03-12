import { NextRequest, NextResponse } from "next/server";
import { createRanking, getHomepageData, getRankingsPayload } from "@/lib/data";
import { createRankingSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category") ?? undefined;
  return NextResponse.json(await getRankingsPayload(category));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createRankingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "请求参数不合法" }, { status: 400 });
  }

  const ranking = await createRanking(parsed.data);
  const homepageData = await getHomepageData();
  return NextResponse.json({ ranking, stats: homepageData.stats }, { status: 201 });
}
