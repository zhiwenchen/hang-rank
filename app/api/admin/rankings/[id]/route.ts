import { NextRequest, NextResponse } from "next/server";
import { deleteRanking } from "@/lib/data";
import { assertAdminAccess } from "@/lib/security";
import { handleApiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    assertAdminAccess(request);
    await deleteRanking(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message !== "UNAUTHORIZED_ADMIN") {
      return NextResponse.json({ message: "榜单不存在" }, { status: 404 });
    }
    return handleApiError(error);
  }
}
