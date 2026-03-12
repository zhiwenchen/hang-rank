import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ANONYMOUS_SESSION_COOKIE } from "@/lib/auth-constants";
import type { CurrentUserDTO } from "@/lib/types";

function parseCookieHeader(cookieHeader: string | null, key: string) {
  if (!cookieHeader) {
    return null;
  }

  const value = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${key}=`))
    ?.slice(key.length + 1);

  return value ? decodeURIComponent(value) : null;
}

function buildAnonymousName(sessionToken: string) {
  return `匿名${sessionToken.replace(/-/g, "").slice(-6).toUpperCase()}`;
}

function toCurrentUser(user: { id: string; displayName: string; isAnonymous: boolean }): CurrentUserDTO {
  return {
    id: user.id,
    displayName: user.displayName,
    isAnonymous: user.isAnonymous
  };
}

export async function ensureUserBySessionToken(sessionToken: string): Promise<CurrentUserDTO> {
  const user = await prisma.appUser.upsert({
    where: { sessionToken },
    update: {},
    create: {
      sessionToken,
      displayName: buildAnonymousName(sessionToken),
      isAnonymous: true
    },
    select: {
      id: true,
      displayName: true,
      isAnonymous: true
    }
  });

  return toCurrentUser(user);
}

export async function getOptionalCurrentUserFromRequest(request: Request) {
  const sessionToken = parseCookieHeader(request.headers.get("cookie"), ANONYMOUS_SESSION_COOKIE);
  if (!sessionToken) {
    return null;
  }

  return ensureUserBySessionToken(sessionToken);
}

export async function getOptionalCurrentUserFromCookies() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get(ANONYMOUS_SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return null;
  }

  return ensureUserBySessionToken(sessionToken);
}
