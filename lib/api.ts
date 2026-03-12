import { NextResponse } from "next/server";

export function handleApiError(error: unknown) {
  if (error instanceof Error) {
    switch (error.message) {
      case "RATE_LIMITED":
        return NextResponse.json({ message: "请求过于频繁，请稍后再试" }, { status: 429 });
      case "INVALID_IMAGE_TYPE":
        return NextResponse.json({ message: "图片格式不支持，只允许 png/jpg/jpeg/webp/gif" }, { status: 400 });
      case "IMAGE_TOO_LARGE":
        return NextResponse.json({ message: "图片过大，请控制在 2MB 以内" }, { status: 400 });
      case "UNAUTHORIZED_ADMIN":
        return NextResponse.json({ message: "管理员鉴权失败" }, { status: 401 });
      default:
        if (error.message.startsWith("FORBIDDEN_CONTENT:")) {
          return NextResponse.json({ message: "内容包含不允许发布的词，请修改后再试" }, { status: 400 });
        }
    }
  }

  return NextResponse.json({ message: "请求处理失败" }, { status: 500 });
}
