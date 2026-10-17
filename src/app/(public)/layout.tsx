import "../public-refinement.css";
import { getPublicContent as getContent } from "@/lib/data";
import { SiteFrame } from "@/components/public-site";
import { businessSchema } from "@/lib/seo";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const content = await getContent();
  return (
    <SiteFrame content={content}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: businessSchema(content) }}
      />
      <main id="main">{children}</main>
    </SiteFrame>
  );
}
