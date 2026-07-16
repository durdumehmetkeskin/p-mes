import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module';
import { Order } from '../project/entities/order.entity';
import { Process } from '../project/entities/process.entity';
import { ProcessStage } from '../project/entities/process-stage.entity';
import { Project } from '../project/entities/project.entity';
import { OrderMaterialRequirement } from '../project/entities/order-material-requirement.entity';
import { ProjectMaterialReorder } from '../project/entities/project-material-reorder.entity';
import { User } from '../users/entities/user.entity';
import { QrModule } from '../qr/qr.module';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { Lot } from './entities/lot.entity';
import { MaterialType } from './entities/material-type.entity';
import { MaterialUnit } from './entities/material-unit.entity';
import { Material } from './entities/material.entity';
import { Rack } from './entities/rack.entity';
import { StockItem } from './entities/stock-item.entity';
import { Warehouse } from './entities/warehouse.entity';
import { Zone } from './entities/zone.entity';
import { InventoryBalancesController } from './inventory-balances.controller';
import { InventoryBalancesService } from './inventory-balances.service';
import { InventoryTransactionsController } from './inventory-transactions.controller';
import { InventoryTransactionsRepository } from './inventory-transactions.repository';
import { InventoryTransactionsService } from './inventory-transactions.service';
import { LotExpiryScannerService } from './lot-expiry-scanner.service';
import { LotsController } from './lots.controller';
import { LotsRepository } from './lots.repository';
import { LotsService } from './lots.service';
import { MaterialTypesController } from './material-types.controller';
import { MaterialTypesRepository } from './material-types.repository';
import { MaterialTypesService } from './material-types.service';
import { MaterialUnitsController } from './material-units.controller';
import { MaterialUnitsRepository } from './material-units.repository';
import { MaterialUnitsService } from './material-units.service';
import { MaterialsController } from './materials.controller';
import { MaterialsRepository } from './materials.repository';
import { MaterialsService } from './materials.service';
import { RacksController } from './racks.controller';
import { RacksRepository } from './racks.repository';
import { RacksService } from './racks.service';
import { StockItemsController } from './stock-items.controller';
import { StockItemsRepository } from './stock-items.repository';
import { StockItemsService } from './stock-items.service';
import { WarehousesController } from './warehouses.controller';
import { WarehousesRepository } from './warehouses.repository';
import { WarehousesService } from './warehouses.service';
import { StockAlertService } from './stock-alert.service';
import { ZonesController } from './zones.controller';
import { ZonesRepository } from './zones.repository';
import { ZonesService } from './zones.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Material,
      MaterialType,
      MaterialUnit,
      Warehouse,
      Zone,
      Rack,
      Lot,
      InventoryTransaction,
      StockItem,
      // Referenced by StockItems/Racks/Zones services when validating
      // reservations, rack-order dedication and zone-project assignment.
      Order,
      Process,
      ProcessStage,
      Project,
      OrderMaterialRequirement,
      ProjectMaterialReorder,
      User,
    ]),
    QrModule,
    NotificationsModule,
  ],
  controllers: [
    MaterialsController,
    MaterialTypesController,
    MaterialUnitsController,
    WarehousesController,
    ZonesController,
    RacksController,
    LotsController,
    InventoryBalancesController,
    InventoryTransactionsController,
    StockItemsController,
  ],
  providers: [
    MaterialsService,
    MaterialsRepository,
    MaterialTypesService,
    MaterialTypesRepository,
    MaterialUnitsService,
    MaterialUnitsRepository,
    WarehousesService,
    WarehousesRepository,
    ZonesService,
    ZonesRepository,
    RacksService,
    RacksRepository,
    LotsService,
    LotsRepository,
    LotExpiryScannerService,
    InventoryBalancesService,
    InventoryTransactionsService,
    InventoryTransactionsRepository,
    StockItemsService,
    StockItemsRepository,
    StockAlertService,
  ],
  exports: [
    MaterialsService,
    MaterialTypesService,
    MaterialUnitsService,
    WarehousesService,
    ZonesService,
    RacksService,
    LotsService,
    InventoryBalancesService,
    InventoryTransactionsService,
    StockItemsService,
  ],
})
export class InventoryModule {}
