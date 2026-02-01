import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();
    const start = process.hrtime.bigint();

    return next.handle().pipe(
      finalize(() => {
        const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
        const route = this.normalizeRoute(request);
        const statusCode = response.statusCode ?? 500;
        const labels = {
          method: request.method,
          route,
          status_code: String(statusCode),
        };

        this.metricsService.observeHttpRequest(
          labels,
          durationSeconds,
          statusCode >= 500,
        );
      }),
    );
  }

  private normalizeRoute(request: any): string {
    if (request?.route?.path) {
      return request.route.path;
    }
    if (typeof request?.originalUrl === 'string') {
      return request.originalUrl.split('?')[0];
    }
    return 'unknown';
  }
}
