import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditController } from './audit.controller';
import { AuditRepository } from './audit.repository';
import { AuditService } from './audit.service';
import { AuditSubscriber } from './audit.subscriber';
import { AuditLog } from './entities/audit-log.entity';
import { ImmutabilitySubscriber } from './immutability.subscriber';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  controllers: [AuditController],
  // Subscribers register themselves with the DataSource via their constructors.
  providers: [
    AuditService,
    AuditRepository,
    AuditSubscriber,
    ImmutabilitySubscriber,
  ],
})
export class AuditModule {}
