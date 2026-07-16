import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Process } from '../project/entities/process.entity';
import { ProcessStage } from '../project/entities/process-stage.entity';
import { Project } from '../project/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { DeadlineScannerService } from './deadline-scanner.service';
import { Notification } from './entities/notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      User,
      ProcessStage,
      Process,
      Project,
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, DeadlineScannerService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
