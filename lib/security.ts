import { NextRequest } from "next/server";

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

const bannedPatterns = [
  /赌博/i,
  /博彩/i,
  /约炮/i,
  /嫖/i,
  /代孕/i,
  /冰毒/i,
  /海洛因/i,
  /出售微信/i,
  /加v/i,
  /vx[:：]?\s*[a-z0-9_-]+/i,
  /telegram/i,
  /黄网站/i,
  /兼职刷单/i
];

const allowedImagePrefixes = [
  "data:image/png;base64,",
  "data:image/jpeg;base64,",
  "data:image/jpg;base64,",
  "data:image/webp;base64,",
  "data:image/gif;base64,"
];

const defaultImageMaxBytes = 2 * 1024 * 1024;

export function getClientIdentifier(request: NextRequest | Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "anonymous";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "anonymous";
}

export function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (current.count >= limit) {
    throw new Error("RATE_LIMITED");
  }

  current.count += 1;
}

export function assertSafeText(value: string, fieldName: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return;
  }

  const matched = bannedPatterns.some((pattern) => pattern.test(trimmed));
  if (matched) {
    throw new Error(`FORBIDDEN_CONTENT:${fieldName}`);
  }
}

export function assertSafeImage(image?: string) {
  if (!image) {
    return;
  }

  const isAllowedType = allowedImagePrefixes.some((prefix) => image.startsWith(prefix));
  if (!isAllowedType) {
    throw new Error("INVALID_IMAGE_TYPE");
  }

  const base64 = image.split(",", 2)[1] || "";
  const byteLength = Buffer.byteLength(base64, "base64");
  if (byteLength > defaultImageMaxBytes) {
    throw new Error("IMAGE_TOO_LARGE");
  }
}

export function assertAdminAccess(request: NextRequest | Request) {
  const configuredToken = process.env.ADMIN_TOKEN;
  const suppliedToken = request.headers.get("x-admin-token");

  if (!configuredToken || !suppliedToken || suppliedToken !== configuredToken) {
    throw new Error("UNAUTHORIZED_ADMIN");
  }
}

export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}
