import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { PermissionsController } from './permissions.controller';
import { RolesController } from './roles.controller';
import { RolesRepository } from './roles.repository';
import { RolesService } from './roles.service';

@Module({
  imports: [TypeOrmModule.forFeature([Role])],
  controllers: [RolesController, PermissionsController],
  providers: [RolesService, RolesRepository],
  exports: [RolesService], // UsersService resolves roles by name via this
})
export class RolesModule {}
