import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ClientErrorDto } from './dto/client-error.dto';
import { appendClientError } from './file-logger';

@ApiTags('logs')
@Controller('logs')
export class ClientErrorController {
  private readonly logger = new Logger(ClientErrorController.name);

  @Post('client-error')
  @ApiOperation({ summary: 'Report a client-side error (public, rate-limited)' })
  async reportClientError(@Body() dto: ClientErrorDto) {
    const url = dto.url ?? '';
    const msg = dto.message ?? 'Unknown error';
    const source = dto.source ?? 'client';
    const line = `[CLIENT][${source}] ${msg} | url=${url} | ua=${(dto.userAgent ?? '').slice(0, 120)}`;
    const withStack = dto.stack ? `${line}\n  ${dto.stack.replace(/\n/g, '\n  ')}` : line;

    this.logger.warn(`Frontend error: ${msg}`);
    appendClientError(withStack);

    return { ok: true };
  }
}
