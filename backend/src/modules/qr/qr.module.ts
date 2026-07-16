import { Module } from '@nestjs/common';
import { QrService } from './qr.service';

/**
 * Provides {@link QrService} to feature modules that expose QR endpoints
 * (tooling, inventory, project). Relies on the globally-registered
 * ConfigModule for the public app URL, so it needs no imports of its own.
 */
@Module({
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}
