# 夯拉排行榜技术架构文档

## 1. 目标

项目围绕三个核心能力实现：

1. 首页展示社区总榜，按大多数人的评价生成排行。
2. 用户可对榜单和条目点赞、定档、写锐评。
3. 用户可创建自己的排行榜，上传图片和条目内容。
4. 用户首次访问即自动匿名登录，并记住个人点赞和评论。

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
│  ├─ session.ts
│  ├─ tiers.ts
│  ├─ types.ts
│  └─ validators.ts
├─ middleware.ts
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
- `middleware.ts` 负责首次访问时自动下发匿名会话 Cookie

### 4.2 Route Handlers

- `GET /api/rankings`：返回榜单列表、分类、统计
- `POST /api/rankings`：创建榜单
- `GET /api/rankings/:id`：返回榜单详情
- `POST /api/rankings/:id/like`：切换当前匿名用户对榜单的点赞
- `POST /api/rankings/:id/items/:itemId/rate`：条目定档和锐评
- `GET /api/session`：返回当前匿名用户
- `POST /api/reviews/:id/like`：切换当前匿名用户对评价的点赞
- `GET /api/health`：健康检查
- `DELETE /api/admin/rankings/:id`：管理员删除榜单
- `DELETE /api/admin/rankings/:id/items/:itemId`：管理员删除条目

### 4.3 数据访问层

- `lib/prisma.ts`：Prisma Client 单例
- `lib/data.ts`：封装查询、创建、点赞、定档、DTO 转换
- `lib/session.ts`：基于 Cookie 自动识别或创建匿名用户
- `lib/validators.ts`：用 Zod 校验请求体
- `lib/tiers.ts`：统一档位和内部数值映射

## 5. 数据模型

### 5.1 AppUser

- `id`
- `sessionToken`
- `displayName`
- `isAnonymous`
- `createdAt`
- `updatedAt`

### 5.1 Ranking

- `id`
- `title`
- `category`
- `description`
- `source`
- `authorId`
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

### 5.3 RankingItemReview

- `id`
- `rankingItemId`
- `userId`
- `authorName`
- `tier`
- `review`
- `likes`
- `createdAt`
- `updatedAt`

### 5.4 RankingLike / ReviewLike

- 记录“哪个匿名用户点过哪个赞”
- 使用联合唯一约束避免同一用户重复点赞同一目标
- `Ranking.likes` 与 `RankingItemReview.likes` 保留为聚合字段，便于列表页快速读取

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

1. 首次访问时 `middleware.ts` 自动写入匿名会话 Cookie
2. Route Handler 基于 Cookie 识别匿名用户
3. 调用 `POST /api/rankings/:id/like` 或 `POST /api/reviews/:id/like`
4. 服务端写入或删除点赞关系表，并同步更新聚合 `likes`
5. 前端重新拉取数据并刷新当前视图

### 7.3 用户定档

1. 用户在弹窗里选择档位和锐评
2. 前端调用 `POST /api/rankings/:id/items/:itemId/rate`
3. 服务端将档位转换为内部数值后更新聚合结果
4. 同时写入一条带 `userId` 和 `authorName` 的评价记录
5. 前端重新拉取数据

### 7.4 用户发布榜单

1. 前端先维护一个草稿条目列表
2. 发布时调用 `POST /api/rankings`
3. 服务端写入 `Ranking`、`RankingItem` 和初始评价记录
4. 榜单作者归属到当前匿名用户
5. 前端重新拉取首页数据

## 8. 部署

### 8.1 Vercel

- 使用 Next.js 默认部署流程
- 生产环境直接运行 App Router 页面和 Route Handlers

### 8.2 Neon

环境变量：

- `DATABASE_URL`
- `DIRECT_URL`
- `ADMIN_TOKEN`

Prisma 配置：

- `DATABASE_URL` 用于运行时连接
- `DIRECT_URL` 用于迁移

### 8.3 数据库初始化

```powershell
npm.cmd run prisma:generate
npm.cmd exec prisma db push
npm.cmd run prisma:seed
```

## 9. 风险与限制

当前仍保留的限制：

- 当前是匿名用户体系，没有实名注册、手机号登录或第三方 OAuth
- 当前限流是进程内内存实现，适合早期低流量，不适合多实例强一致
- 图片暂时存为字符串，数据库体积会膨胀
- 当前审核只包含基础敏感词拦截和管理员删除，不是完整内容治理体系

当前已补的最低上线能力：

- 写接口限流
- 文本敏感词过滤
- 图片类型和大小限制
- 管理员删除接口

后续建议优先升级：

1. 图片切到对象存储
2. 从匿名用户扩展到正式注册用户和账号绑定
3. 给匿名身份增加昵称修改、设备迁移和合并机制
4. 增加后台审核
5. 补视频生成异步任务链路
