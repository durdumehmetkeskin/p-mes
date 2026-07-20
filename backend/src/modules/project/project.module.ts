import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersModule } from '../customers/customers.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { QrModule } from '../qr/qr.module';
import { OrderItemsController } from './order-items.controller';
import { OrderItemsService } from './order-items.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { ProcessesController } from './processes.controller';
import { ProcessesService } from './processes.service';
import { ProcessStagesController } from './process-stages.controller';
import { ProcessStagesService } from './process-stages.service';
import { OrderMaterialRequirementsController } from './order-material-requirements.controller';
import { OrderMaterialRequirementsService } from './order-material-requirements.service';
import { ProjectMaterialReordersController } from './project-material-reorders.controller';
import { ProjectMaterialReordersService } from './project-material-reorders.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { MyWorkController } from './my-work.controller';
import { MyWorkService } from './my-work.service';
import { StageBoardController } from './stage-board.controller';
import { StageBoardService } from './stage-board.service';
import { WorkflowTemplatesController } from './workflow-templates.controller';
import { WorkflowTemplatesService } from './workflow-templates.service';
import { WorkloadController } from './workload.controller';
import { WorkloadService } from './workload.service';

import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { ProcessStage } from './entities/process-stage.entity';
import { ProcessStageLink } from './entities/process-stage-link.entity';
import { Process } from './entities/process.entity';
import { ProcessCompletionReport } from './entities/process-completion-report.entity';
import { StageCompletionReport } from './entities/stage-completion-report.entity';
import { Project } from './entities/project.entity';
import { OrderMaterialRequirement } from './entities/order-material-requirement.entity';
import { ProjectMaterialReorder } from './entities/project-material-reorder.entity';
import { WorkflowTemplateStage } from './entities/workflow-template-stage.entity';
import { WorkflowTemplateStageLink } from './entities/workflow-template-stage-link.entity';
import { WorkflowTemplate } from './entities/workflow-template.entity';
import { User } from '../users/entities/user.entity';
import { InventoryTransaction } from '../inventory/entities/inventory-transaction.entity';
import { Product } from '../products/entities/product.entity';
import { Lot } from '../inventory/entities/lot.entity';
import { Material } from '../inventory/entities/material.entity';
import { StockItem } from '../inventory/entities/stock-item.entity';
import { Zone } from '../inventory/entities/zone.entity';
import { Tool } from '../tooling/entities/tool.entity';
import { ToolStatusHistory } from '../tooling/entities/tool-status-history.entity';
import { ToolingModule } from '../tooling/tooling.module';
import { InventoryModule } from '../inventory/inventory.module';
import { StageToolReservation } from './entities/stage-tool-reservation.entity';
import { ToolReservationsController } from './tool-reservations.controller';
import { ToolReservationsService } from './tool-reservations.service';
import { ProjectAllocationsService } from './project-allocations.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      Order,
      OrderItem,
      WorkflowTemplate,
      WorkflowTemplateStage,
      WorkflowTemplateStageLink,
      Process,
      ProcessStage,
      ProcessStageLink,
      StageCompletionReport,
      ProcessCompletionReport,
      OrderMaterialRequirement,
      ProjectMaterialReorder,
      User,
      // Read-only, for the project's allocated materials/tools view.
      Material,
      Lot,
      StockItem,
      Zone,
      Tool,
      ToolStatusHistory,
      StageToolReservation,
      InventoryTransaction,
      // Read-only, for the "my checkouts" input-product custody view.
      Product,
    ]),
    QrModule,
    CustomersModule,
    NotificationsModule,
    ToolingModule,
    InventoryModule,
  ],
  controllers: [
    ProjectsController,
    OrdersController,
    OrderItemsController,
    WorkflowTemplatesController,
    ProcessesController,
    ProcessStagesController,
    ToolReservationsController,
    WorkloadController,
    StageBoardController,
    MyWorkController,
    OrderMaterialRequirementsController,
    ProjectMaterialReordersController,
  ],
  providers: [
    ProjectsService,
    OrdersService,
    OrderItemsService,
    WorkflowTemplatesService,
    ProcessesService,
    ProcessStagesService,
    ToolReservationsService,
    WorkloadService,
    StageBoardService,
    MyWorkService,
    ProjectAllocationsService,
    OrderMaterialRequirementsService,
    ProjectMaterialReordersService,
  ],
  // ProjectsService is reused by location's section-reservations for
  // project-membership scoping; WorkloadService is reused by the reporting
  // module's workload data source.
  exports: [ProjectsService, WorkloadService],
})
export class ProjectModule {}
