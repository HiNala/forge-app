import { SITE_URL } from "@/lib/marketing-content";

export function MarketingJsonLd() {
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Forge",
    url: SITE_URL,
    description:
      "The mini-app platform: describe a form, landing page, proposal, deck, or site. Forge builds it, hosts it, and tracks it — or hands off exports when you are ready.",
  };
  const app = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Forge",
    applicationCategory: "WebApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    url: SITE_URL,
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify([org, app]),
      }}
    />
  );
}
