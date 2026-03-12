import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ANONYMOUS_SESSION_COOKIE } from "@/lib/auth-constants";

export function middleware(request: NextRequest) {
  if (request.cookies.get(ANONYMOUS_SESSION_COOKIE)?.value) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.cookies.set({
    name: ANONYMOUS_SESSION_COOKIE,
    value: crypto.randomUUID(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
