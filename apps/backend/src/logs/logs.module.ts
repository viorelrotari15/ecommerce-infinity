import { Module } from '@nestjs/common';
import { LogsController } from './logs.controller';
import { ClientErrorController } from './client-error.controller';

@Module({
  controllers: [LogsController, ClientErrorController],
})
export class LogsModule {}
