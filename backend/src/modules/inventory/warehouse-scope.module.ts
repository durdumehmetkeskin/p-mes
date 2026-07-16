import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Warehouse } from './entities/warehouse.entity';
import { WarehouseScopeService } from './warehouse-scope.service';

/**
 * Standalone, dependency-free module exposing {@link WarehouseScopeService} so it
 * can be shared by AuthModule (JwtStrategy precomputes the user's responsible
 * warehouses) and the inventory/tooling modules without import cycles.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Warehouse])],
  providers: [WarehouseScopeService],
  exports: [WarehouseScopeService],
})
export class WarehouseScopeModule {}
