import { CompareDetail } from "@/components/marketing/compare-detail";
import { compareMetadata } from "@/lib/compare-pages";

export const metadata = compareMetadata("carrd");

export default function CompareCarrdPage() {
  return <CompareDetail slug="carrd" />;
}
