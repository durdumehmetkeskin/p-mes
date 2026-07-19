import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryModule } from '../inventory/inventory.module';
import { StockItem } from '../inventory/entities/stock-item.entity';
import { Material } from '../inventory/entities/material.entity';
import { LocationModule } from '../location/location.module';
import { Order } from '../project/entities/order.entity';
import { ProcessStage } from '../project/entities/process-stage.entity';
import { Process } from '../project/entities/process.entity';
import { Project } from '../project/entities/project.entity';
import { ProjectMaterialReorder } from '../project/entities/project-material-reorder.entity';
import { ProjectModule } from '../project/project.module';
import { StorageModule } from '../storage/storage.module';
import { ToolStatusHistory } from '../tooling/entities/tool-status-history.entity';
import { Tool } from '../tooling/entities/tool.entity';
import { User } from '../users/entities/user.entity';
import { InventoryToolingDataSource } from './data-sources/inventory-tooling.data-source';
import { LocationReportDataSource } from './data-sources/location-report.data-source';
import { LocationStatusDataSource } from './data-sources/location-status.data-source';
import { OrderReportDataSource } from './data-sources/order-report.data-source';
import { PersonnelReportDataSource } from './data-sources/personnel-report.data-source';
import { ProjectProductionDataSource } from './data-sources/project-production.data-source';
import { ProjectReportDataSource } from './data-sources/project-report.data-source';
import { REPORT_DATA_SOURCES } from './data-sources/report-data-source.interface';
import { WorkOrderDataSource } from './data-sources/work-order.data-source';
import { WorkloadDataSource } from './data-sources/workload.data-source';
import { GeneratedReport } from './entities/generated-report.entity';
import { ReportDefinition } from './entities/report-definition.entity';
import { JsReportService } from './jsreport.service';
import { ReportDefinitionsController } from './report-definitions.controller';
import { ReportDefinitionsRepository } from './report-definitions.repository';
import { ReportDefinitionsService } from './report-definitions.service';
import { ReportRenderService } from './report-render.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [
    // Own entities + the domain entities the data sources query directly.
    TypeOrmModule.forFeature([
      ReportDefinition,
      GeneratedReport,
      Project,
      Order,
      Process,
      ProcessStage,
      Tool,
      // Detailed report sources: raw materials, tool custody, inventory, users.
      Material,
      ProjectMaterialReorder,
      StockItem,
      ToolStatusHistory,
      User,
    ]),
    ProjectModule, // WorkloadService (workload data source)
    InventoryModule, // InventoryBalancesService (inventory-tooling data source)
    LocationModule, // Locations/Sections/Reservations/Data services (location sources)
    StorageModule, // MinioService (persist generated artifacts)
  ],
  controllers: [ReportDefinitionsController, ReportsController],
  providers: [
    JsReportService,
    ReportRenderService,
    ReportDefinitionsService,
    ReportDefinitionsRepository,
    ProjectProductionDataSource,
    WorkOrderDataSource,
    WorkloadDataSource,
    InventoryToolingDataSource,
    LocationStatusDataSource,
    ProjectReportDataSource,
    OrderReportDataSource,
    LocationReportDataSource,
    PersonnelReportDataSource,
    {
      provide: REPORT_DATA_SOURCES,
      useFactory: (
        projectProduction: ProjectProductionDataSource,
        workOrder: WorkOrderDataSource,
        workload: WorkloadDataSource,
        inventoryTooling: InventoryToolingDataSource,
        locationStatus: LocationStatusDataSource,
        projectReport: ProjectReportDataSource,
        orderReport: OrderReportDataSource,
        locationReport: LocationReportDataSource,
        personnelReport: PersonnelReportDataSource,
      ) => [
        projectProduction,
        workOrder,
        workload,
        inventoryTooling,
        locationStatus,
        projectReport,
        orderReport,
        locationReport,
        personnelReport,
      ],
      inject: [
        ProjectProductionDataSource,
        WorkOrderDataSource,
        WorkloadDataSource,
        InventoryToolingDataSource,
        LocationStatusDataSource,
        ProjectReportDataSource,
        OrderReportDataSource,
        LocationReportDataSource,
        PersonnelReportDataSource,
      ],
    },
  ],
  exports: [ReportDefinitionsRepository],
})
export class ReportingModule {}
