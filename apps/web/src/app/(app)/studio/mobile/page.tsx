import { redirect } from "next/navigation";

/** Default `/studio/mobile` forwards to canvases keyed by slug (`new` placeholder or UUID). */
export default function StudioMobileIndexPage() {
  redirect("/studio/mobile/new");
}
