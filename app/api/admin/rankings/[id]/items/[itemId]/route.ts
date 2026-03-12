import { NextRequest, NextResponse } from "next/server";
import { deleteRankingItem } from "@/lib/data";
import { assertAdminAccess } from "@/lib/security";
import { handleApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    assertAdminAccess(request);
    const ranking = await deleteRankingItem(params.id, params.itemId);
    if (!ranking) {
      return NextResponse.json({ message: "条目不存在" }, { status: 404 });
    }
    return NextResponse.json({ success: true, ranking });
  } catch (error) {
    return handleApiError(error);
  }
}
