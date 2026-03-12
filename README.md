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
- 图片上传当前以前端 Data URL 字符串方式提交
- 用户界面只展示 `夯 / 顶级 / 人上人 / NPC / 拉完了`

## 本地启动

1. 安装依赖

```powershell
npm.cmd install
```

2. 配置环境变量

```powershell
Copy-Item .env.example .env
```

3. 准备数据库并生成 Prisma Client

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
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

## 技术文档

- `docs/technical-architecture.md`
