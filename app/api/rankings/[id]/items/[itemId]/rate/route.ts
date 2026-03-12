import { NextRequest, NextResponse } from "next/server";
import { rateRankingItem } from "@/lib/data";
import { rateItemSchema } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  const body = await request.json();
  const parsed = rateItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ message: "请求参数不合法" }, { status: 400 });
  }

  const ranking = await rateRankingItem(params.id, params.itemId, parsed.data);
  if (!ranking) {
    return NextResponse.json({ message: "评分目标不存在" }, { status: 404 });
  }

  return NextResponse.json({ ranking });
}
