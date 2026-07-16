import { registerAs } from '@nestjs/config';
import type { StringValue } from 'ms';

/**
 * Namespaced JWT auth configuration.
 * JWT_SECRET MUST be overridden with a strong value in every non-local
 * environment — the fallback below is for local development only.
 */
export const authConfig = registerAs('auth', () => ({
  jwtSecret:
    process.env.JWT_SECRET ?? 'dev-only-insecure-secret-change-me-32chars!!',
  // StringValue (e.g. '15m', '7d') is the type @nestjs/jwt expects.
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN ?? '15m') as StringValue,
  refreshTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS ?? '7', 10),
  passwordResetTtlMinutes: parseInt(
    process.env.PASSWORD_RESET_TTL_MINUTES ?? '60',
    10,
  ),
}));

export type AuthConfig = ReturnType<typeof authConfig>;
