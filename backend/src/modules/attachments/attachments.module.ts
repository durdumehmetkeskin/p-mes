import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module';
import { OrderItem } from '../project/entities/order-item.entity';
import { Process } from '../project/entities/process.entity';
import { ProcessStage } from '../project/entities/process-stage.entity';
import { ProjectModule } from '../project/project.module';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { Attachment } from './entities/attachment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attachment, OrderItem, Process, ProcessStage]),
    StorageModule,
    // For membership-scoped reads (ProjectsService.isMember).
    ProjectModule,
  ],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
})
export class AttachmentsModule {}
