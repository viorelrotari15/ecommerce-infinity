import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Registry, collectDefaultMetrics } from 'prom-client';

type HttpMetricLabel = 'method' | 'route' | 'status_code';

@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly httpRequestDuration: Histogram<HttpMetricLabel>;
  private readonly httpRequestCount: Counter<HttpMetricLabel>;
  private readonly httpErrorCount: Counter<HttpMetricLabel>;
  private readonly ordersCreatedTotal: Counter<string>;

  constructor() {
    collectDefaultMetrics({ register: this.registry });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.httpRequestCount = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpErrorCount = new Counter({
      name: 'http_errors_total',
      help: 'Total HTTP 5xx responses',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.ordersCreatedTotal = new Counter({
      name: 'orders_created_total',
      help: 'Total number of orders created',
      registers: [this.registry],
    });
  }

  get contentType(): string {
    return this.registry.contentType;
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  observeHttpRequest(
    labels: Record<HttpMetricLabel, string>,
    durationSeconds: number,
    isError: boolean,
  ): void {
    this.httpRequestDuration.observe(labels, durationSeconds);
    this.httpRequestCount.inc(labels);
    if (isError) {
      this.httpErrorCount.inc(labels);
    }
  }

  incrementOrdersCreated(): void {
    this.ordersCreatedTotal.inc();
  }
}
