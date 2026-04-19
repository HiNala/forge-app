import { SITE_URL } from "@/lib/marketing-content";

export function MarketingJsonLd() {
  const org = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Forge",
    url: SITE_URL,
    description:
      "Describe what you need in plain English. Forge builds a branded, hosted page — forms, RSVPs, menus, and more.",
  };
  const app = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Forge",
    applicationCategory: "BusinessApplication",
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
