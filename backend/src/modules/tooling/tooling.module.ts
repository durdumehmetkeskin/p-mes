import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryModule } from '../inventory/inventory.module';
import { QrModule } from '../qr/qr.module';
import { ToolStatusHistory } from './entities/tool-status-history.entity';
import { ToolType } from './entities/tool-type.entity';
import { Tool } from './entities/tool.entity';
import { ToolStatusHistoryController } from './tool-status-history.controller';
import { ToolStatusHistoryRepository } from './tool-status-history.repository';
import { ToolStatusHistoryService } from './tool-status-history.service';
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
    ]),
    InventoryModule,
    QrModule,
  ],
  controllers: [
    ToolsController,
    ToolTypesController,
    ToolStatusHistoryController,
  ],
  providers: [
    ToolsService,
    ToolsRepository,
    ToolTypesService,
    ToolTypesRepository,
    ToolStatusHistoryService,
    ToolStatusHistoryRepository,
  ],
  exports: [ToolsService, ToolTypesService],
})
export class ToolingModule {}
