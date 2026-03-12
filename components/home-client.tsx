"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import type { HomepageData } from "@/lib/types";
import type { Tier } from "@/lib/tiers";

const previewSets = [
  [
    { label: "夯", color: "#ff7f7f", emojis: ["🍓", "🪽"] },
    { label: "顶级", color: "#f1b876", emojis: ["🐦", "👑", "⛰️"] },
    { label: "人上人", color: "#efd77a", emojis: ["🚗"] },
    { label: "NPC", color: "#e7ee76", emojis: ["✨", "🟦", "👑"] },
    { label: "拉完了", color: "#b6ef71", emojis: ["🧍"] }
  ],
  [
    { label: "夯", color: "#ff7f7f", emojis: ["🔥", "🦞"] },
    { label: "顶级", color: "#f1b876", emojis: ["🍢", "🌮"] },
    { label: "人上人", color: "#efd77a", emojis: ["🥟", "🍜"] },
    { label: "NPC", color: "#e7ee76", emojis: ["🥤"] },
    { label: "拉完了", color: "#b6ef71", emojis: ["🧊"] }
  ]
] as const;

const tiers: Tier[] = ["夯", "顶级", "人上人", "NPC", "拉完了"];

type DraftItem = {
  name: string;
  tier: Tier;
  review: string;
  image: string;
  emoji: string;
};

type BuilderState = {
  title: string;
  category: string;
  description: string;
  itemName: string;
  tier: Tier;
  review: string;
};

const initialBuilderState: BuilderState = {
  title: "",
  category: "",
  description: "",
  itemName: "",
  tier: "顶级",
  review: ""
};

export function HomeClient({ initialData }: { initialData: HomepageData }) {
  const [data, setData] = useState(initialData);
  const [currentCategory, setCurrentCategory] = useState("全部");
  const [currentRankingId, setCurrentRankingId] = useState(initialData.rankings[0]?.id ?? null);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [builder, setBuilder] = useState<BuilderState>(initialBuilderState);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [draftImage, setDraftImage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rateContext, setRateContext] = useState<{ rankingId: string; itemId: string; itemName: string } | null>(null);
  const [rateTier, setRateTier] = useState<Tier>("人上人");
  const [rateReview, setRateReview] = useState("");

  const currentRanking = useMemo(
    () => data.rankingDetails.find((ranking) => ranking.id === currentRankingId) ?? data.rankingDetails[0] ?? null,
    [currentRankingId, data.rankingDetails]
  );

  async function refresh(nextCategory?: string) {
    const category = nextCategory ?? currentCategory;
    const listUrl = category !== "全部" ? `/api/rankings?category=${encodeURIComponent(category)}` : "/api/rankings";
    const rankingsRes = await fetch(listUrl, { cache: "no-store" });
    const rankingsPayload = await rankingsRes.json();
    const detailPayloads = await Promise.all(
      rankingsPayload.rankings.map((ranking: { id: string }) =>
        fetch(`/api/rankings/${ranking.id}`, { cache: "no-store" }).then((res) => res.json())
      )
    );

    const nextData: HomepageData = {
      rankings: rankingsPayload.rankings,
      categories: rankingsPayload.categories,
      stats: rankingsPayload.stats,
      rankingDetails: detailPayloads.map((payload) => payload.ranking)
    };

    setData(nextData);
    setCurrentRankingId((prev) => nextData.rankings.some((ranking) => ranking.id === prev) ? prev : nextData.rankings[0]?.id ?? null);
  }

  async function handleCategoryChange(category: string) {
    setCurrentCategory(category);
    await refresh(category);
  }

  async function handleLike(rankingId: string) {
    await fetch(`/api/rankings/${rankingId}/like`, { method: "POST" });
    await refresh();
  }

  function handleAddDraftItem() {
    if (!builder.itemName.trim() || !builder.review.trim()) {
      window.alert("请先填写条目名称和锐评。");
      return;
    }

    setDraftItems((current) => [
      ...current,
      {
        name: builder.itemName.trim(),
        tier: builder.tier,
        review: builder.review.trim(),
        image: draftImage,
        emoji: pickEmojiByCategory(builder.category)
      }
    ]);
    setBuilder((current) => ({ ...current, itemName: "", tier: "顶级", review: "" }));
    setDraftImage("");
  }

  async function handlePublishRanking() {
    if (!builder.title.trim() || !builder.category.trim() || !builder.description.trim() || draftItems.length === 0) {
      window.alert("请填写完整榜单信息，并至少添加一个条目。");
      return;
    }

    setIsSubmitting(true);
    const response = await fetch("/api/rankings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: builder.title.trim(),
        category: builder.category.trim(),
        description: builder.description.trim(),
        items: draftItems
      })
    });

    if (!response.ok) {
      window.alert("发布失败，请稍后重试。");
      setIsSubmitting(false);
      return;
    }

    setBuilder(initialBuilderState);
    setDraftItems([]);
    setDraftImage("");
    setCurrentCategory("全部");
    await refresh("全部");
    setIsSubmitting(false);
  }

  async function handleRateSubmit() {
    if (!rateContext) return;
    setIsSubmitting(true);
    const response = await fetch(`/api/rankings/${rateContext.rankingId}/items/${rateContext.itemId}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tier: rateTier,
        review: rateReview.trim()
      })
    });

    if (!response.ok) {
      window.alert("提交评价失败，请稍后重试。");
      setIsSubmitting(false);
      return;
    }

    setRateContext(null);
    setRateTier("人上人");
    setRateReview("");
    await refresh();
    setIsSubmitting(false);
  }

  return (
    <div className="mx-auto w-[min(1240px,calc(100%-32px))] py-6 pb-12">
      <header className="glass-panel overflow-hidden rounded-[36px] p-6">
        <nav className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[linear-gradient(135deg,#ff8d4d,#ff4f6d)] font-display text-lg font-bold text-[#25150f]">HL</div>
            <div>
              <p className="font-bold text-sand">夯拉排行榜</p>
              <span className="text-sm text-muted">社区定档、锐评、发布都在一个站里</span>
            </div>
          </div>
          <a href="#builder" className="action-button border border-line bg-white/5 text-sand">发布我的榜单</a>
        </nav>

        <section className="mt-7 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <span className="text-sm text-muted">社区共创榜单</span>
            <h1 className="mt-2 max-w-[12ch] text-5xl font-bold leading-none tracking-[-0.04em] text-sand md:text-7xl">把好东西夯上去，把拉垮的直接放到底</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-sand/90">首页展示社区总榜，详情里可以追加定档、留锐评、给榜单点赞。任何主题都能创建自己的排行，并支持上传图片。</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#community" className="action-button bg-[linear-gradient(135deg,#ff8d4d,#ffbb5c)] font-bold text-[#26150d]">看热门总榜</a>
              <a href="#builder" className="action-button border border-line bg-white/5 text-sand">创建新排行</a>
            </div>
            <ul className="mt-7 flex flex-wrap gap-4">
              <StatCard label="活跃榜单" value={String(data.stats.rankings)} />
              <StatCard label="榜单条目" value={String(data.stats.reviews)} />
              <StatCard label="累计评价" value={String(data.stats.votes)} />
            </ul>
          </div>

          <div className="rounded-[32px] border border-line bg-[linear-gradient(135deg,rgba(255,141,77,0.14),transparent_36%),rgba(255,255,255,0.03)] p-5">
            <div className="mb-4 grid grid-cols-[1fr_auto] items-center gap-4">
              <span className="text-sm text-muted">今日热榜示意</span>
              <button type="button" className="action-button border border-line bg-white/5 px-4 py-2 text-sm text-sand" onClick={() => setPreviewIndex((current) => (current + 1) % previewSets.length)}>
                换一组看看
              </button>
            </div>
            <div className="grid gap-4">
              {previewSets[previewIndex].map((row) => (
                <div key={row.label} className="grid min-h-[84px] gap-0 md:grid-cols-[108px_1fr]">
                  <div className="grid place-items-center rounded-t-[18px] text-2xl font-bold text-[#24150f] md:rounded-l-[18px] md:rounded-tr-none" style={{ background: row.color }}>
                    {row.label}
                  </div>
                  <div className="flex items-center gap-3 overflow-x-auto rounded-b-[18px] border border-line bg-white/5 px-4 py-3 md:rounded-b-none md:rounded-r-[18px]">
                    {row.emojis.map((emoji) => (
                      <span key={emoji} className="grid h-14 w-14 place-items-center rounded-2xl bg-white/5 text-2xl">{emoji}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </header>

      <main>
        <section id="community" className="glass-panel mt-6 rounded-[32px] p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="text-sm text-muted">首页总榜</span>
              <h2 className="mt-1 text-3xl font-bold text-sand">按大多数人评价聚合出的夯拉排名</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={clsx("chip-button", category === currentCategory && "chip-button-active")}
                  onClick={() => void handleCategoryChange(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="soft-panel grid content-start gap-3 p-3">
              {data.rankings.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-line bg-white/5 p-7 text-muted">这个分类下还没有榜单。</div>
              ) : (
                data.rankings.map((ranking) => (
                  <button
                    key={ranking.id}
                    type="button"
                    onClick={() => setCurrentRankingId(ranking.id)}
                    className={clsx(
                      "rounded-[20px] border px-4 py-5 text-left transition hover:-translate-y-0.5",
                      ranking.id === currentRankingId ? "border-[rgba(255,209,102,0.48)] bg-[rgba(255,209,102,0.08)]" : "border-transparent bg-white/5"
                    )}
                  >
                    <div className="flex items-center justify-between gap-4 text-sm text-muted">
                      <span>{ranking.category}</span>
                      <span>♥ {ranking.likes}</span>
                    </div>
                    <h3 className="mt-3 text-xl font-semibold text-sand">{ranking.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-sand/85">{ranking.description}</p>
                    <div className="mt-4 flex items-center justify-between gap-4 text-sm">
                      <strong className="font-display text-lg text-sand">{ranking.headlineTier}</strong>
                      <span className="text-muted">{ranking.votes} 次评价</span>
                    </div>
                  </button>
                ))
              )}
            </aside>

            <article className="soft-panel min-h-[420px] p-6">
              {!currentRanking ? (
                <div className="rounded-[20px] border border-dashed border-line bg-white/5 p-7 text-muted">选择一个榜单查看详情。</div>
              ) : (
                <>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <span className="text-sm text-muted">{currentRanking.category}</span>
                      <h3 className="mt-1 text-3xl font-bold text-sand">{currentRanking.title}</h3>
                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted">
                        <span>当前总档 {currentRanking.headlineTier}</span>
                        <span>{currentRanking.votes} 次评价</span>
                        <span>{currentRanking.likes} 个点赞</span>
                      </div>
                      <p className="mt-5 max-w-3xl leading-7 text-sand/90">{currentRanking.description}</p>
                    </div>
                    <button type="button" className="action-button border border-line bg-white/5 text-sand" onClick={() => void handleLike(currentRanking.id)}>
                      ♥ 点赞榜单
                    </button>
                  </div>

                  <div className="mt-6 grid gap-3">
                    {currentRanking.items.map((item) => (
                      <div key={item.id} className="grid gap-4 rounded-[20px] border border-line bg-white/5 p-4 md:grid-cols-[86px_96px_1fr_auto] md:items-center">
                        <div className="text-center font-semibold text-muted">{item.displayTier}</div>
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image} alt={item.name} className="h-24 w-24 rounded-[20px] object-cover" />
                        ) : (
                          <div className="grid h-24 w-24 place-items-center rounded-[20px] bg-[linear-gradient(135deg,rgba(255,141,77,0.38),rgba(182,240,111,0.3))] text-4xl">
                            {item.emoji || "✦"}
                          </div>
                        )}
                        <div>
                          <h4 className="text-xl font-semibold text-sand">{item.name}</h4>
                          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted">
                            <span>{currentRanking.category}</span>
                            <span>{item.displayTier}</span>
                            <span>{item.ratingsCount} 人参与</span>
                          </div>
                          <p className="mt-2 leading-7 text-sand/90">{item.review}</p>
                        </div>
                        <div className="flex flex-col items-start gap-3 md:items-end">
                          <div className="font-display text-3xl text-sand">{item.displayTier}</div>
                          <button
                            type="button"
                            className="action-button border border-line bg-white/5 px-4 py-2 text-sm text-sand"
                            onClick={() => {
                              setRateContext({ rankingId: currentRanking.id, itemId: item.id, itemName: item.name });
                              setRateTier(item.displayTier);
                              setRateReview("");
                            }}
                          >
                            我要评价
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </article>
          </div>
        </section>

        <section className="glass-panel mt-6 rounded-[32px] p-7">
          <div>
            <span className="text-sm text-muted">互动方式</span>
            <h2 className="mt-1 text-3xl font-bold text-sand">定档、锐评、点赞，一页内完成</h2>
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <FeatureCard title="给条目定档" body="每个条目都支持追加夯拉档位，后端会基于内部权重更新总排行。" />
            <FeatureCard title="留下锐评" body="你的评价可以附带一句评论，新的高信号表达会覆盖默认锐评展示。" />
            <FeatureCard title="发布个人榜单" body="提交后会直接进入系统数据源，首页和分类筛选都会立即看到。" />
          </div>
        </section>

        <section id="builder" className="glass-panel mt-6 rounded-[32px] p-7">
          <div>
            <span className="text-sm text-muted">发布器</span>
            <h2 className="mt-1 text-3xl font-bold text-sand">创建你的夯拉排行榜</h2>
          </div>
          <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_0.95fr]">
            <div className="soft-panel grid gap-4 p-6">
              <Field label="榜单标题">
                <input className="w-full rounded-2xl border border-line bg-white/5 px-4 py-3 text-sand outline-none" type="text" value={builder.title} onChange={(event) => setBuilder((current) => ({ ...current, title: event.target.value }))} maxLength={40} placeholder="例如：这城市最好吃的夜宵" />
              </Field>
              <Field label="分类">
                <input className="w-full rounded-2xl border border-line bg-white/5 px-4 py-3 text-sand outline-none" type="text" value={builder.category} onChange={(event) => setBuilder((current) => ({ ...current, category: event.target.value }))} maxLength={20} placeholder="例如：美食 / 游戏 / 动画" />
              </Field>
              <Field label="榜单简介">
                <textarea className="w-full rounded-2xl border border-line bg-white/5 px-4 py-3 text-sand outline-none" value={builder.description} onChange={(event) => setBuilder((current) => ({ ...current, description: event.target.value }))} rows={4} maxLength={120} placeholder="写一句这个榜为什么存在" />
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="条目名称">
                  <input className="w-full rounded-2xl border border-line bg-white/5 px-4 py-3 text-sand outline-none" type="text" value={builder.itemName} onChange={(event) => setBuilder((current) => ({ ...current, itemName: event.target.value }))} maxLength={24} placeholder="例如：炸串摊 23 号" />
                </Field>
                <Field label="初始档位">
                  <select className="w-full rounded-2xl border border-line bg-white/5 px-4 py-3 text-sand outline-none" value={builder.tier} onChange={(event) => setBuilder((current) => ({ ...current, tier: event.target.value as Tier }))}>
                    {tiers.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
                  </select>
                </Field>
              </div>
              <Field label="你的锐评">
                <textarea className="w-full rounded-2xl border border-line bg-white/5 px-4 py-3 text-sand outline-none" value={builder.review} onChange={(event) => setBuilder((current) => ({ ...current, review: event.target.value }))} rows={3} maxLength={100} placeholder="例如：凌晨两点吃一口，人生都能被治愈" />
              </Field>
              <Field label="上传条目图片">
                <input
                  className="w-full rounded-2xl border border-line bg-white/5 px-4 py-3 text-sand outline-none file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sand"
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) {
                      setDraftImage("");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => setDraftImage(typeof reader.result === "string" ? reader.result : "");
                    reader.readAsDataURL(file);
                  }}
                />
              </Field>
              <div className="flex flex-wrap gap-3">
                <button type="button" className="action-button border border-line bg-white/5 text-sand" onClick={handleAddDraftItem}>添加到榜单</button>
                <button type="button" className="action-button bg-[linear-gradient(135deg,#ff8d4d,#ffbb5c)] font-bold text-[#26150d]" onClick={() => void handlePublishRanking()} disabled={isSubmitting}>
                  {isSubmitting ? "处理中..." : "发布排行榜"}
                </button>
              </div>
            </div>

            <div className="soft-panel p-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-xl font-semibold text-sand">发布预览</h3>
                <span className="text-sm text-muted">{draftItems.length} 个条目</span>
              </div>
              <div className="mt-4 grid gap-3">
                {draftItems.length === 0 ? (
                  <div className="rounded-[20px] border border-dashed border-line bg-white/5 p-6 text-muted">先添加几个条目，这里会生成你的榜单预览。</div>
                ) : (
                  draftItems.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="flex items-center gap-3 rounded-[18px] border border-line bg-white/5 p-3">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt={item.name} className="h-20 w-20 rounded-[18px] object-cover" />
                      ) : (
                        <div className="grid h-20 w-20 place-items-center rounded-[18px] bg-[linear-gradient(135deg,rgba(255,141,77,0.38),rgba(182,240,111,0.3))] text-3xl">
                          {item.emoji}
                        </div>
                      )}
                      <div className="flex-1">
                        <strong className="text-sand">{item.name}</strong>
                        <p className="mt-1 text-sm text-sand/85">{item.tier} · {item.review}</p>
                      </div>
                      <button type="button" className="action-button border border-[rgba(255,159,159,0.24)] bg-transparent px-3 py-2 text-sm text-[#ff9f9f]" onClick={() => setDraftItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                        删除
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {rateContext ? (
        <dialog open className="fixed inset-0 z-50 m-0 h-full w-full bg-black/60 p-3 backdrop-blur">
          <div className="mx-auto mt-16 w-full max-w-[560px] rounded-[28px] border border-line bg-[linear-gradient(180deg,rgba(28,25,20,0.96),rgba(18,17,13,0.96))] p-6 shadow-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-sm text-muted">追加评价</span>
                <h3 className="mt-1 text-2xl font-bold text-sand">给 {rateContext.itemName} 定档</h3>
              </div>
              <button type="button" className="action-button border border-line bg-white/5 px-4 py-2 text-sand" onClick={() => setRateContext(null)}>关闭</button>
            </div>
            <div className="mt-5 grid gap-4">
              <Field label="你的档位">
                <select className="w-full rounded-2xl border border-line bg-white/5 px-4 py-3 text-sand outline-none" value={rateTier} onChange={(event) => setRateTier(event.target.value as Tier)}>
                  {tiers.map((tier) => <option key={tier} value={tier}>{tier}</option>)}
                </select>
              </Field>
              <Field label="你的锐评">
                <textarea className="w-full rounded-2xl border border-line bg-white/5 px-4 py-3 text-sand outline-none" value={rateReview} onChange={(event) => setRateReview(event.target.value)} rows={4} maxLength={100} placeholder="说点真话" />
              </Field>
              <div className="flex flex-wrap gap-3">
                <button type="button" className="action-button border border-line bg-white/5 text-sand" onClick={() => setRateContext(null)}>取消</button>
                <button type="button" className="action-button bg-[linear-gradient(135deg,#ff8d4d,#ffbb5c)] font-bold text-[#26150d]" disabled={isSubmitting} onClick={() => void handleRateSubmit()}>
                  {isSubmitting ? "提交中..." : "提交评价"}
                </button>
              </div>
            </div>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <li className="list-none rounded-[18px] border border-line bg-white/5 px-4 py-3">
      <strong className="block text-3xl text-sand">{value}</strong>
      <span className="text-sm text-muted">{label}</span>
    </li>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <article className="soft-panel p-6">
      <h3 className="text-xl font-semibold text-sand">{title}</h3>
      <p className="mt-3 leading-7 text-muted">{body}</p>
    </article>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm text-sand">{label}</span>
      {children}
    </label>
  );
}

function pickEmojiByCategory(category: string) {
  if (category.includes("吃") || category.includes("美食")) return "🍜";
  if (category.includes("游")) return "🎮";
  if (category.includes("动画") || category.includes("角色")) return "✨";
  return "✦";
}
