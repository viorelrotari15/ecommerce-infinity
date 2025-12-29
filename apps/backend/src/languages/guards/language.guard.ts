import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { LANGUAGE_HEADER } from '../interceptors/language.interceptor';

@Injectable()
export class LanguageGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const language = request.headers[LANGUAGE_HEADER] as string | undefined;

    if (!language) {
      return true; // Let interceptor handle default
    }

    // Verify language exists and is active
    const lang = await this.prisma.language.findUnique({
      where: { code: language },
    });

    if (!lang || !lang.isActive) {
      // Remove invalid language from header, will fallback to default
      delete request.headers[LANGUAGE_HEADER];
    }

    return true;
  }
}

