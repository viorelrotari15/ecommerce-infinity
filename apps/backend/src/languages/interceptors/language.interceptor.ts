import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

export const LANGUAGE_HEADER = 'x-language';

@Injectable()
export class LanguageInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();

    // Priority: query param > cookie > header > default
    let language: string | undefined;

    // 1. Check query param
    if (request.query?.lang && typeof request.query.lang === 'string') {
      language = request.query.lang;
    }
    // 2. Check cookie
    else if (request.cookies?.lang) {
      language = request.cookies.lang;
    }
    // 3. Check Accept-Language header
    else if (request.headers['accept-language']) {
      const acceptLanguage = request.headers['accept-language'];
      // Parse Accept-Language header (e.g., "en-US,en;q=0.9,ro;q=0.8")
      const languages = acceptLanguage
        .split(',')
        .map((lang) => lang.split(';')[0].trim().toLowerCase().split('-')[0]);
      language = languages[0]; // Take first language
    }

    // Set language in request for services to access
    if (language) {
      request.headers[LANGUAGE_HEADER] = language;
    }

    return next.handle();
  }
}

