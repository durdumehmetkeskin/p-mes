import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryModule } from '../inventory/inventory.module';
import { LocationModule } from '../location/location.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { QrModule } from '../qr/qr.module';
import { StorageModule } from '../storage/storage.module';
import { Order } from '../project/entities/order.entity';
import { ProcessStage } from '../project/entities/process-stage.entity';
import { ProjectModule } from '../project/project.module';
import { Product } from './entities/product.entity';
import { ProductType } from './entities/product-type.entity';
import { ProductsController } from './products.controller';
import { ProductsRepository } from './products.repository';
import { ProductsService } from './products.service';
import { ProductTypesController } from './product-types.controller';
import { ProductTypesRepository } from './product-types.repository';
import { ProductTypesService } from './product-types.service';

/**
 * Production outputs (intermediate products, finished products, molds, ...).
 * Deliberately separate from ProjectModule (already large) and from inventory
 * (products are NOT stock). Imports ProjectModule for membership scoping and
 * InventoryModule for the unit/warehouse/rack lookups — never the reverse.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductType, ProcessStage, Order]),
    ProjectModule,
    InventoryModule,
    // Storage racks (a location's storage area) — where products are shelved.
    LocationModule,
    NotificationsModule,
    QrModule,
    StorageModule,
  ],
  controllers: [ProductsController, ProductTypesController],
  providers: [
    ProductsService,
    ProductsRepository,
    ProductTypesService,
    ProductTypesRepository,
  ],
  exports: [ProductsService, ProductTypesService],
})
export class ProductsModule {}
