import { NextResponse } from "next/server";
import { getOptionalCurrentUserFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const currentUser = await getOptionalCurrentUserFromRequest(request);
  return NextResponse.json({ currentUser });
}
