import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryModule } from '../inventory/inventory.module';
import { QrModule } from '../qr/qr.module';
import { ToolAssignment } from './entities/tool-assignment.entity';
import { ToolCycleLog } from './entities/tool-cycle-log.entity';
import { ToolStatusHistory } from './entities/tool-status-history.entity';
import { ToolType } from './entities/tool-type.entity';
import { ToolUsage } from './entities/tool-usage.entity';
import { Tool } from './entities/tool.entity';
import { ToolAssignmentsController } from './tool-assignments.controller';
import { ToolAssignmentsRepository } from './tool-assignments.repository';
import { ToolAssignmentsService } from './tool-assignments.service';
import { ToolCycleLogsController } from './tool-cycle-logs.controller';
import { ToolCycleLogsRepository } from './tool-cycle-logs.repository';
import { ToolCycleLogsService } from './tool-cycle-logs.service';
import { ToolStatusHistoryController } from './tool-status-history.controller';
import { ToolStatusHistoryRepository } from './tool-status-history.repository';
import { ToolStatusHistoryService } from './tool-status-history.service';
import { ToolUsagesController } from './tool-usages.controller';
import { ToolUsagesRepository } from './tool-usages.repository';
import { ToolUsagesService } from './tool-usages.service';
import { ToolTypesController } from './tool-types.controller';
import { ToolTypesRepository } from './tool-types.repository';
import { ToolTypesService } from './tool-types.service';
import { ToolsController } from './tools.controller';
import { ToolsRepository } from './tools.repository';
import { ToolsService } from './tools.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Tool,
      ToolType,
      ToolStatusHistory,
      ToolAssignment,
      ToolUsage,
      ToolCycleLog,
    ]),
    InventoryModule,
    QrModule,
  ],
  controllers: [
    ToolsController,
    ToolTypesController,
    ToolStatusHistoryController,
    ToolAssignmentsController,
    ToolUsagesController,
    ToolCycleLogsController,
  ],
  providers: [
    ToolsService,
    ToolsRepository,
    ToolTypesService,
    ToolTypesRepository,
    ToolStatusHistoryService,
    ToolStatusHistoryRepository,
    ToolAssignmentsService,
    ToolAssignmentsRepository,
    ToolUsagesService,
    ToolUsagesRepository,
    ToolCycleLogsService,
    ToolCycleLogsRepository,
  ],
  exports: [ToolsService, ToolTypesService],
})
export class ToolingModule {}
