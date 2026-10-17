import { getPublicContent as getContent } from "@/lib/data";
import { Home } from "@/components/public-site";
import { pageMetadata } from "@/lib/seo";
export async function generateMetadata() {
  const c = await getContent();
  return pageMetadata(c, "/", c.seo.title, c.seo.description);
}
export default async function Page() {
  return <Home content={await getContent()} />;
}
