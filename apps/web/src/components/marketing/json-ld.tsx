import { SITE_URL } from "@/lib/marketing-content";

export function MarketingJsonLd() {
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "GlideDesign",
    url: SITE_URL,
    description:
      "GlideDesign is the AI design tool that turns plain English into product strategy, screens, code, exports, and next moves.",
    sameAs: ["https://x.com/glidedesignai"],
  };
  const site = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "GlideDesign",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/templates?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify([org, site]),
      }}
    />
  );
}
