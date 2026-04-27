import { NotFoundHelp } from "@/components/chrome/not-found-help";

/** Global 404 — used for unmatched routes outside the app shell (FE-07). */
export default function NotFound() {
  return (
    <div className="min-h-[70vh] bg-bg">
      <NotFoundHelp />
    </div>
  );
}
