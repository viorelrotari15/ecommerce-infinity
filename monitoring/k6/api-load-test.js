import http from "k6/http";
import { sleep, check, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("error_rate");
const apiLatency = new Trend("api_latency_ms");

const baseUrl = __ENV.K6_BASE_URL || "http://backend:3001";
const thinkMin = Number(__ENV.K6_THINK_MIN || "0.4");
const thinkMax = Number(__ENV.K6_THINK_MAX || "1.8");
const mode = (__ENV.K6_MODE || "full").toLowerCase();
const searchTerms = ["shirt", "shoes", "jacket", "bag", "hat", "sport"];

export const options = {
  scenarios: buildScenarios(mode),
  thresholds: {
    error_rate: ["rate<0.02"],
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
    http_req_duration: ["p(95)<2500"],
    "http_req_duration{scenario:baseline}": ["p(95)<1500"],
  },
};

export default function () {
  group("browse_catalog", () => {
    listAndDetailProducts();
    getSimpleList("/api/categories");
    getSimpleList("/api/brands");
    getSimpleList("/api/attributes");
  });

  group("search", () => {
    const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    getSimpleList(`/api/products?search=${encodeURIComponent(term)}`);
  });

  sleep(randomThinkTime());
}

function buildScenarios(selectedMode) {
  const scenarios = {
    smoke: {
      executor: "per-vu-iterations",
      vus: 5,
      iterations: 10,
      maxDuration: "2m",
    },
    baseline: {
      executor: "ramping-arrival-rate",
      startRate: 30,
      timeUnit: "1s",
      preAllocatedVUs: 300,
      maxVUs: 800,
      stages: [
        { duration: "2m", target: 50 },
        { duration: "5m", target: 150 },
        { duration: "5m", target: 300 },
        { duration: "3m", target: 0 },
      ],
    },
    stress: {
      executor: "ramping-vus",
      startVUs: 20,
      stages: [
        { duration: "2m", target: 200 },
        { duration: "4m", target: 600 },
        { duration: "6m", target: 1000 },
        { duration: "3m", target: 1200 },
        { duration: "2m", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
    spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 800 },
        { duration: "90s", target: 800 },
        { duration: "30s", target: 0 },
      ],
    },
  };

  if (selectedMode === "smoke") return { smoke: scenarios.smoke };
  if (selectedMode === "baseline") return { baseline: scenarios.baseline };
  if (selectedMode === "stress") return { stress: scenarios.stress };
  if (selectedMode === "spike") return { spike: scenarios.spike };
  return {
    baseline: scenarios.baseline,
    stress: scenarios.stress,
    spike: scenarios.spike,
  };
}

function listAndDetailProducts() {
  const listRes = http.get(`${baseUrl}/api/products?limit=20`, {
    tags: { endpoint: "/api/products", test_type: "api" },
  });
  recordMetrics(listRes);
  const ok = check(listRes, {
    "products list ok": (r) => r.status >= 200 && r.status < 400,
  });
  if (!ok) return;

  const body = listRes.json();
  const products = body?.data || [];
  if (products.length === 0) return;
  const picked = products[Math.floor(Math.random() * products.length)];
  if (!picked?.id) return;

  const detailRes = http.get(`${baseUrl}/api/products/id/${picked.id}`, {
    tags: { endpoint: "/api/products/id/:id", test_type: "api" },
  });
  recordMetrics(detailRes);
  check(detailRes, {
    "product detail ok": (r) => r.status >= 200 && r.status < 400,
  });
}

function getSimpleList(path) {
  const response = http.get(`${baseUrl}${path}`, {
    tags: { endpoint: path.split("?")[0], test_type: "api" },
  });
  recordMetrics(response);
  check(response, {
    "status is 2xx/3xx": (r) => r.status >= 200 && r.status < 400,
  });
}

function recordMetrics(response) {
  errorRate.add(response.status >= 400);
  apiLatency.add(response.timings.duration);
}

function randomThinkTime() {
  return thinkMin + Math.random() * Math.max(0, thinkMax - thinkMin);
}
