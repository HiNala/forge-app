import Link from "next/link";

export default function EngagementAnalyticsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-text">Engagement analytics</h1>
        <p className="text-sm text-text-muted mt-1">
          Funnels, retention, realtime activity, and user timelines (GL-01). Use the API endpoints under{" "}
          <code className="text-xs">/api/v1/analytics/*</code> for programmatic access.
        </p>
      </div>
      <ul className="list-disc pl-5 text-sm space-y-2">
        <li>
          <Link className="underline" href="/analytics">
            Organization overview
          </Link>
        </li>
        <li>Realtime: GET /api/v1/analytics/realtime</li>
        <li>Retention grid: GET /api/v1/analytics/retention</li>
        <li>Default contact funnel: GET /api/v1/analytics/funnels/default/contact-form/compute</li>
      </ul>
    </div>
  );
}
