import { Histogram, Registry, collectDefaultMetrics } from 'prom-client';

type WebVitalRating = 'good' | 'needs-improvement' | 'poor';
type WebVitalName = 'CLS' | 'LCP' | 'INP' | 'FCP' | 'TTFB';

declare global {
  // eslint-disable-next-line no-var
  var frontendMetricsRegistry: Registry | undefined;
  // eslint-disable-next-line no-var
  var webVitalTimingHistogram:
    | Histogram<'name' | 'rating' | 'page'>
    | undefined;
  // eslint-disable-next-line no-var
  var webVitalClsHistogram: Histogram<'rating' | 'page'> | undefined;
}

const registry = global.frontendMetricsRegistry ?? new Registry();

if (!global.frontendMetricsRegistry) {
  collectDefaultMetrics({ register: registry });
  global.frontendMetricsRegistry = registry;
}

const webVitalTiming =
  global.webVitalTimingHistogram ??
  new Histogram({
    name: 'web_vital_timing_seconds',
    help: 'Web vitals timing metrics in seconds',
    labelNames: ['name', 'rating', 'page'],
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 1.5, 2.5, 4, 6, 10],
    registers: [registry],
  });

const webVitalCls =
  global.webVitalClsHistogram ??
  new Histogram({
    name: 'web_vital_cls',
    help: 'Cumulative layout shift values',
    labelNames: ['rating', 'page'],
    buckets: [0.01, 0.05, 0.1, 0.15, 0.25, 0.4, 0.6, 1],
    registers: [registry],
  });

if (!global.webVitalTimingHistogram) {
  global.webVitalTimingHistogram = webVitalTiming;
}

if (!global.webVitalClsHistogram) {
  global.webVitalClsHistogram = webVitalCls;
}

export function getMetricsRegistry(): Registry {
  return registry;
}

export function observeWebVital(input: {
  name: WebVitalName;
  value: number;
  rating: WebVitalRating;
  page: string;
}): void {
  const page = input.page || 'unknown';
  if (input.name === 'CLS') {
    webVitalCls.observe({ rating: input.rating, page }, input.value);
    return;
  }

  const seconds = input.value / 1000;
  webVitalTiming.observe(
    { name: input.name, rating: input.rating, page },
    seconds,
  );
}
