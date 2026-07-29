import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditConsumer } from './audit.consumer';
import { AuditController } from './audit.controller';

@Module({
  controllers: [AuditConsumer, AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
