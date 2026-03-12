import { getHomepageData } from "@/lib/data";
import { HomeClient } from "@/components/home-client";
import { getOptionalCurrentUserFromCookies } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Page() {
  const currentUser = await getOptionalCurrentUserFromCookies().catch(() => null);
  const initialData = await getHomepageData(undefined, currentUser?.id)
    .then((data) => ({ ...data, currentUser }))
    .catch(() => ({
      currentUser,
      rankings: [],
      rankingDetails: [],
      categories: ["全部"],
      stats: { rankings: 0, reviews: 0, votes: 0 }
    }));

  return <HomeClient initialData={initialData} />;
}
