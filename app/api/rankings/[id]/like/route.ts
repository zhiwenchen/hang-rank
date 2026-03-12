import { NextResponse } from "next/server";
import { likeRanking } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json({ ranking: await likeRanking(params.id) });
  } catch {
    return NextResponse.json({ message: "榜单不存在" }, { status: 404 });
  }
}
