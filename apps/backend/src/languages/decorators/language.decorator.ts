import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { LANGUAGE_HEADER } from '../interceptors/language.interceptor';

export const Language = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.headers[LANGUAGE_HEADER] as string | undefined;
  },
);

