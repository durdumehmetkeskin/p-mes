import { registerAs } from '@nestjs/config';

/**
 * Namespaced application configuration.
 * Access via `configService.get('app.port')` or by injecting `appConfig.KEY`.
 */
export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  environment: process.env.NODE_ENV ?? 'development',
  apiPrefix: process.env.API_PREFIX ?? 'api',
  // Public base URL of the frontend SPA, used to build deep links embedded in
  // generated QR codes (e.g. `${appUrl}/tools/:id`). Defaults to the dev server.
  appUrl: process.env.APP_URL ?? 'http://localhost:5173',
  // Comma-separated list of allowed browser origins (frontend dev server).
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
}));

export type AppConfig = ReturnType<typeof appConfig>;
