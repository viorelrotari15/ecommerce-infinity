import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { CURRENCY_HEADER } from '../interceptors/currency.interceptor';

export const Currency = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.headers[CURRENCY_HEADER] as string | undefined;
  },
);

