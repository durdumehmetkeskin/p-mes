import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

/**
 * Wires TypeORM to PostgreSQL using validated, namespaced configuration.
 * `synchronize` is enabled only in development; all other environments rely
 * on migrations (`npm run migration:run`).
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        autoLoadEntities: true,
        synchronize: config.get<string>('app.environment') === 'development',
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: config.get<string>('app.environment') !== 'development',
      }),
    }),
  ],
})
export class DatabaseModule {}
