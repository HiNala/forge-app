/**
 * GL-03 — placeholder burst against API (swap URL to real analytics ingest when exposed publicly).
 * Uses liveness endpoint so the script is runnable without auth; not a substitute for real ingest load tests.
 */
import http from "k6/http";
import { check } from "k6";

const BASE = __ENV.BASE_URL || "http://127.0.0.1:8000";

export const options = {
  scenarios: {
    burst: {
      executor: "constant-arrival-rate",
      rate: 2000,
      timeUnit: "1s",
      duration: "2m",
      preAllocatedVUs: 100,
      maxVUs: 500,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
  },
};

export default function () {
  const res = http.get(`${BASE}/health/live`);
  check(res, { ok: (r) => r.status === 200 });
}
