# 夯拉排行榜技术架构文档

## 1. 目标

项目围绕三个核心能力实现：

1. 首页展示社区总榜，按大多数人的评价生成排行。
2. 用户可对榜单和条目点赞、定档、写锐评。
3. 用户可创建自己的排行榜，上传图片和条目内容。

当前版本基于 Next.js 14 全栈能力，目标是交付一个可部署到 Vercel、可连接 PostgreSQL 的完整 MVP。

## 2. 技术架构

### 2.1 选型

- 框架：Next.js 14 App Router
- 语言：TypeScript
- 样式：Tailwind CSS
- 数据库：PostgreSQL
- ORM：Prisma
- 部署：Vercel
- 数据库托管：Neon

### 2.2 选型原因

- Next.js 14 可以统一承载页面、API、服务端数据读取和部署入口。
- TypeScript 能把 DTO、表单输入、Route Handler 请求体验证统一起来。
- Tailwind 适合快速重建当前重视觉页面。
- Prisma 让 PostgreSQL 模型、迁移和 seed 更清晰。
- Vercel + Neon 是与 Next.js 配套最顺手的部署组合。

## 3. 目录结构

```text
hang-rank/
├─ app/
│  ├─ api/
│  │  ├─ health/route.ts
│  │  └─ rankings/
│  │     ├─ route.ts
│  │     └─ [id]/
│  │        ├─ route.ts
│  │        ├─ like/route.ts
│  │        └─ items/[itemId]/rate/route.ts
│  ├─ globals.css
│  ├─ layout.tsx
│  └─ page.tsx
├─ components/
│  └─ home-client.tsx
├─ lib/
│  ├─ data.ts
│  ├─ prisma.ts
│  ├─ tiers.ts
│  ├─ types.ts
│  └─ validators.ts
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts
├─ docs/
│  └─ technical-architecture.md
├─ .env.example
├─ package.json
└─ README.md
```

## 4. 模块职责

### 4.1 App Router 页面层

- `app/page.tsx` 作为服务端页面，负责首屏拉取榜单数据
- `components/home-client.tsx` 负责分类筛选、点赞、定档、发布榜单等客户端交互

### 4.2 Route Handlers

- `GET /api/rankings`：返回榜单列表、分类、统计
- `POST /api/rankings`：创建榜单
- `GET /api/rankings/:id`：返回榜单详情
- `POST /api/rankings/:id/like`：点赞
- `POST /api/rankings/:id/items/:itemId/rate`：条目定档和锐评
- `GET /api/health`：健康检查

### 4.3 数据访问层

- `lib/prisma.ts`：Prisma Client 单例
- `lib/data.ts`：封装查询、创建、点赞、定档、DTO 转换
- `lib/validators.ts`：用 Zod 校验请求体
- `lib/tiers.ts`：统一档位和内部数值映射

## 5. 数据模型

### 5.1 Ranking

- `id`
- `title`
- `category`
- `description`
- `source`
- `likes`
- `votes`
- `createdAt`
- `updatedAt`

### 5.2 RankingItem

- `id`
- `rankingId`
- `name`
- `score`
- `review`
- `image`
- `emoji`
- `ratingsCount`
- `createdAt`
- `updatedAt`

`score` 仅作为内部聚合和排序依据，前端不直接展示。

## 6. 档位策略

用户界面只展示以下档位：

- `夯`
- `顶级`
- `人上人`
- `NPC`
- `拉完了`

内部数值映射：

- `夯` -> `9.6`
- `顶级` -> `8.9`
- `人上人` -> `8.2`
- `NPC` -> `7.3`
- `拉完了` -> `5.8`

反向映射阈值：

- `>= 9.3` => `夯`
- `>= 8.7` => `顶级`
- `>= 8.0` => `人上人`
- `>= 7.0` => `NPC`
- `< 7.0` => `拉完了`

聚合公式：

```text
newScore = (currentScore * ratingsCount + incomingScore) / (ratingsCount + 1)
```

## 7. 前后端数据流

### 7.1 首屏加载

1. 用户访问首页
2. `app/page.tsx` 在服务端查询榜单数据
3. 页面首屏直接输出榜单列表与详情
4. 客户端接管后负责继续处理交互

### 7.2 用户点赞

1. 前端调用 `POST /api/rankings/:id/like`
2. Route Handler 调用 Prisma 更新 `likes`
3. 前端重新拉取数据并刷新当前视图

### 7.3 用户定档

1. 用户在弹窗里选择档位和锐评
2. 前端调用 `POST /api/rankings/:id/items/:itemId/rate`
3. 服务端将档位转换为内部数值后更新聚合结果
4. 前端重新拉取数据

### 7.4 用户发布榜单

1. 前端先维护一个草稿条目列表
2. 发布时调用 `POST /api/rankings`
3. 服务端写入 `Ranking` 和 `RankingItem`
4. 前端重新拉取首页数据

## 8. 部署

### 8.1 Vercel

- 使用 Next.js 默认部署流程
- 生产环境直接运行 App Router 页面和 Route Handlers

### 8.2 Neon

环境变量：

- `DATABASE_URL`
- `DIRECT_URL`

Prisma 配置：

- `DATABASE_URL` 用于运行时连接
- `DIRECT_URL` 用于迁移

### 8.3 数据库初始化

```powershell
npm.cmd run prisma:generate
npm.cmd run prisma:migrate
npm.cmd run prisma:seed
```

## 9. 风险与限制

当前仍保留的限制：

- 没有用户鉴权
- 没有限流
- 图片暂时存为字符串，数据库体积会膨胀
- 没有敏感词和审核机制

后续建议优先升级：

1. 图片切到对象存储
2. 增加用户系统和鉴权
3. 增加评分明细表
4. 增加后台审核
5. 补视频生成异步任务链路
