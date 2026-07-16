import { registerAs } from '@nestjs/config';

/**
 * Namespaced PostgreSQL configuration.
 * Access via `configService.get('database.host')` or inject `databaseConfig.KEY`.
 */
export const databaseConfig = registerAs('database', () => ({
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'p_mes',
}));

export type DatabaseConfig = ReturnType<typeof databaseConfig>;
