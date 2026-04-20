/**
 * GL-03 — public page form submissions at scale (template).
 * Set BASE_URL (API origin), ORG_SLUG, PAGE_SLUG for your environment.
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://127.0.0.1:8000";
const ORG = __ENV.ORG_SLUG || "test-org";
const PAGE = __ENV.PAGE_SLUG || "test-form";

export const options = {
  stages: [
    { duration: "1m", target: 100 },
    { duration: "3m", target: 500 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  const url = `${BASE}/p/${ORG}/${PAGE}/submit`;
  const res = http.post(
    url,
    JSON.stringify({
      name: `User-${__VU}-${__ITER}`,
      email: `user${__VU}-${__ITER}@test.local`,
      message: "Load test submission",
    }),
    { headers: { "Content-Type": "application/json" } },
  );
  check(res, { "status is 200 or 404": (r) => r.status === 200 || r.status === 404 });
  sleep(1);
}
