# 夯拉排行榜

一个基于 Next.js 14 App Router 的全栈 Web 应用：用户可以浏览社区总榜、给条目定档和锐评、点赞榜单，也可以发布自己的排行榜。

## 技术栈

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- PostgreSQL + Prisma ORM
- Vercel + Neon

## 当前能力

- 首页展示多个排行榜，按社区评价聚合排序
- 条目支持追加档位和锐评
- 榜单支持点赞
- 用户可创建自己的排行榜
- 访问站点时会自动匿名登录，并持久化到浏览器 Cookie
- 会记住每个匿名用户点过哪些赞、写过哪些评论
- 图片上传当前以前端 Data URL 字符串方式提交
- 用户界面只展示 `夯 / 顶级 / 人上人 / NPC / 拉完了`
- 已增加最基础的匿名限流、敏感词过滤、图片大小/类型限制
- 已提供最小管理员删除接口

## 本地启动

1. 安装依赖

```powershell
npm.cmd install
```

2. 配置环境变量

```powershell
Copy-Item .env.example .env
```

3. 同步数据库结构并生成 Prisma Client

```powershell
npm.cmd run prisma:generate
npm.cmd exec prisma db push
npm.cmd run prisma:seed
```

4. 启动开发环境

```powershell
npm.cmd run dev
```

默认访问：

```text
http://127.0.0.1:3000
```

## 部署

默认部署到 Vercel，数据库使用 Neon。

需要配置的环境变量：

- `DATABASE_URL`
- `DIRECT_URL`
- `ADMIN_TOKEN`

匿名登录说明：

- 首次访问会由 `middleware.ts` 自动下发匿名会话 Cookie
- 服务端会基于 Cookie 自动创建 `AppUser`
- 点赞记录和评论作者都会绑定到这个匿名用户

## 最小管理接口

通过请求头传 `x-admin-token: $ADMIN_TOKEN` 调用：

- `DELETE /api/admin/rankings/:id`
- `DELETE /api/admin/rankings/:id/items/:itemId`

## 技术文档

- `docs/technical-architecture.md`
