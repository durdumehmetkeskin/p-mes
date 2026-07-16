import { registerAs } from '@nestjs/config';

/** MinIO/S3 object storage configuration for file attachments. */
export const storageConfig = registerAs('storage', () => ({
  endpoint: process.env.MINIO_ENDPOINT ?? 'localhost',
  port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
  useSSL: (process.env.MINIO_USE_SSL ?? 'false') === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY ?? 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY ?? 'minioadmin',
  bucket: process.env.MINIO_BUCKET ?? 'p-mes',
}));

export type StorageConfig = ReturnType<typeof storageConfig>;
