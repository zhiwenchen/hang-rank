import { NextResponse } from "next/server";
import { getRankingDetail } from "@/lib/data";
import { getOptionalCurrentUserFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const currentUser = await getOptionalCurrentUserFromRequest(request);
  const ranking = await getRankingDetail(params.id, currentUser?.id);
  if (!ranking) {
    return NextResponse.json({ message: "榜单不存在" }, { status: 404 });
  }

  return NextResponse.json({ ranking, currentUser });
}
