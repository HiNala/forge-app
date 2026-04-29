import { CompareDetail } from "@/components/marketing/compare-detail";
import { compareMetadata } from "@/lib/compare-pages";

export const metadata = compareMetadata("typeform");

export default function CompareTypeformPage() {
  return <CompareDetail slug="typeform" />;
}
