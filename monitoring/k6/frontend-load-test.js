import http from "k6/http";
import { sleep, check, group } from "k6";
import { Rate, Trend } from "k6/metrics";

const errorRate = new Rate("frontend_error_rate");
const pageLatency = new Trend("frontend_page_latency_ms");

const baseUrl = __ENV.K6_FRONTEND_URL || "http://frontend:3000";
const thinkMin = Number(__ENV.K6_THINK_MIN || "0.6");
const thinkMax = Number(__ENV.K6_THINK_MAX || "2.2");
const mode = (__ENV.K6_MODE || "baseline").toLowerCase();

export const options = {
  scenarios: buildScenarios(mode),
  thresholds: {
    frontend_error_rate: ["rate<0.02"],
    http_req_failed: ["rate<0.01"],
    "http_req_duration{test_type:frontend}": ["p(95)<2500"],
  },
};

export default function () {
  group("public_pages", () => {
    hitPage("/", "home");
    hitPage("/products", "products");
    hitPage("/categories", "categories");
    hitPage("/brands", "brands");
    hitPage("/cart", "cart");
    hitPage("/checkout", "checkout");
  });

  sleep(randomThinkTime());
}

function buildScenarios(selectedMode) {
  const scenarios = {
    smoke: {
      executor: "per-vu-iterations",
      vus: 3,
      iterations: 6,
      maxDuration: "2m",
    },
    baseline: {
      executor: "ramping-arrival-rate",
      startRate: 20,
      timeUnit: "1s",
      preAllocatedVUs: 200,
      maxVUs: 600,
      stages: [
        { duration: "2m", target: 40 },
        { duration: "5m", target: 120 },
        { duration: "5m", target: 200 },
        { duration: "3m", target: 0 },
      ],
    },
    stress: {
      executor: "ramping-vus",
      startVUs: 10,
      stages: [
        { duration: "2m", target: 200 },
        { duration: "4m", target: 600 },
        { duration: "5m", target: 1000 },
        { duration: "2m", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  };

  if (selectedMode === "smoke") return { smoke: scenarios.smoke };
  if (selectedMode === "stress") return { stress: scenarios.stress };
  return { baseline: scenarios.baseline };
}

function hitPage(path, page) {
  const response = http.get(`${baseUrl}${path}`, {
    tags: { page, test_type: "frontend" },
  });
  const ok = check(response, {
    "status is 2xx/3xx": (r) => r.status >= 200 && r.status < 400,
  });
  errorRate.add(!ok);
  pageLatency.add(response.timings.duration);
}

function randomThinkTime() {
  return thinkMin + Math.random() * Math.max(0, thinkMax - thinkMin);
}
