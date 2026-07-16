import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Schema for required/optional environment variables.
 * Validated once at startup so the app fails fast on misconfiguration.
 */
class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  PORT = 3000;

  @IsString()
  @IsOptional()
  API_PREFIX = 'api';

  @IsString()
  @IsOptional()
  DB_HOST = 'localhost';

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  DB_PORT = 5432;

  @IsString()
  @IsOptional()
  DB_USERNAME = 'postgres';

  @IsString()
  @IsOptional()
  DB_PASSWORD = 'postgres';

  @IsString()
  @IsOptional()
  DB_NAME = 'p_mes';

  // Must be overridden in non-local environments (see auth.config.ts).
  @IsString()
  @MinLength(32)
  @IsOptional()
  JWT_SECRET = 'dev-only-insecure-secret-change-me-32chars!!';

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN = '15m';

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  REFRESH_TOKEN_TTL_DAYS = 7;

  @IsString()
  @IsOptional()
  CORS_ORIGIN = 'http://localhost:5173';

  // Public base URL of the frontend SPA, embedded as a deep link in QR codes.
  @IsString()
  @IsOptional()
  APP_URL = 'http://localhost:5173';

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  PASSWORD_RESET_TTL_MINUTES = 60;

  @IsString()
  @IsOptional()
  MINIO_ENDPOINT = 'localhost';

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  MINIO_PORT = 9000;

  @IsString()
  @IsOptional()
  MINIO_USE_SSL = 'false';

  @IsString()
  @IsOptional()
  MINIO_ACCESS_KEY = 'minioadmin';

  @IsString()
  @IsOptional()
  MINIO_SECRET_KEY = 'minioadmin';

  @IsString()
  @IsOptional()
  MINIO_BUCKET = 'p-mes';
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.map((e) => e.toString()).join('\n'));
  }

  return validated;
}
