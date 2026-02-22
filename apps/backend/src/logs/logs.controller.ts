import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { getLogFilePath, getClientErrorsLogFilePath } from './file-logger';
import * as fs from 'fs';

@ApiTags('admin')
@Controller('admin/logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class LogsController {
  @Get()
  @ApiOperation({ summary: 'View or download backend logs or client-error log (Admin only)' })
  async getLogs(
    @Query('tail') tailStr: string | undefined,
    @Query('download') download: string | undefined,
    @Query('file') file: string | undefined,
    @Res() res: Response,
  ) {
    const logPath =
      file === 'client-errors' ? getClientErrorsLogFilePath() : getLogFilePath();
    if (!fs.existsSync(logPath)) {
      throw new NotFoundException('Log file not found. Logs are written after the first requests.');
    }
    let content = fs.readFileSync(logPath, 'utf-8');
    const tail = tailStr ? Math.min(Math.max(1, parseInt(tailStr, 10) || 500), 10000) : undefined;
    if (tail) {
      const lines = content.split('\n');
      content = lines.slice(-tail).join('\n');
    }
    const basename = file === 'client-errors' ? 'client-errors' : 'backend-logs';
    if (download === '1' || download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="${basename}-${Date.now()}.txt"`);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(content);
    }
    return res.json({ logs: content, tail: tail ?? null });
  }
}
