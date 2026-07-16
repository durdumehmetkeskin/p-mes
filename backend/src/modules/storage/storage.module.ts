import { Module } from '@nestjs/common';
import { MinioService } from './minio.service';

/** Shares the MinIO client wrapper across feature modules. */
@Module({
  providers: [MinioService],
  exports: [MinioService],
})
export class StorageModule {}
