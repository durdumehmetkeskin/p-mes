import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ClsModule } from 'nestjs-cls';
import { appConfig } from './config/app.config';
import { authConfig } from './config/auth.config';
import { databaseConfig } from './config/database.config';
import { storageConfig } from './config/storage.config';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { AuditContextInterceptor } from './modules/audit/audit-context.interceptor';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './modules/auth/guards/permissions.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { HealthModule } from './modules/health/health.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { CustomersModule } from './modules/customers/customers.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { LocationModule } from './modules/location/location.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ProductsModule } from './modules/products/products.module';
import { ProjectModule } from './modules/project/project.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { RolesModule } from './modules/roles/roles.module';
import { ToolingModule } from './modules/tooling/tooling.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, authConfig, storageConfig],
      validate: validateEnv,
      envFilePath: [
        `.env.${process.env.NODE_ENV ?? 'development'}.local`,
        '.env',
      ],
    }),
    // Per-request context so the audit subscriber can read the current actor.
    ClsModule.forRoot({ global: true, middleware: { mount: true } }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    HealthModule,
    RolesModule,
    UsersModule,
    AuthModule,
    InventoryModule,
    ToolingModule,
    CustomersModule,
    ProjectModule,
    ProductsModule,
    LocationModule,
    NotificationsModule,
    AttachmentsModule,
    ReportingModule,
    AuditModule,
  ],
  providers: [
    // Order matters: authenticate first (populates request.user), then
    // authorize. Every route is protected by default; opt out with @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    // Runs after the guards; stashes request.user into CLS for auditing.
    { provide: APP_INTERCEPTOR, useClass: AuditContextInterceptor },
  ],
})
export class AppModule {}
