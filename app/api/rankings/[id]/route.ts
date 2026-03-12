import { NextResponse } from "next/server";
import { getRankingDetail } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const ranking = await getRankingDetail(params.id);
  if (!ranking) {
    return NextResponse.json({ message: "榜单不存在" }, { status: 404 });
  }

  return NextResponse.json({ ranking });
}
