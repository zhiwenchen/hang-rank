import { getHomepageData } from "@/lib/data";
import { HomeClient } from "@/components/home-client";

export const dynamic = "force-dynamic";

export default async function Page() {
  const initialData = await getHomepageData().catch(() => ({
    rankings: [],
    rankingDetails: [],
    categories: ["全部"],
    stats: { rankings: 0, reviews: 0, votes: 0 }
  }));

  return <HomeClient initialData={initialData} />;
}
