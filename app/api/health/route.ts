import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    now: new Date().toISOString()
  });
}
