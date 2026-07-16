import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lot } from './entities/lot.entity';
import { computeLotExpiryStatus } from './lot-expiry.util';

/**
 * Keeps each lot's derived expiry-health `status` fresh. Writes recompute it
 * immediately; time marching forward does not — so this scans daily and rewrites
 * only the rows whose bucket changed. Also exposes a scoped recompute used when a
 * material's thresholds change.
 */
@Injectable()
export class LotExpiryScannerService {
  private readonly logger = new Logger(LotExpiryScannerService.name);

  constructor(
    @InjectRepository(Lot)
    private readonly lots: Repository<Lot>,
  ) {}

  @Cron('0 6 * * *')
  async scheduledScan(): Promise<void> {
    const changed = await this.recompute();
    this.logger.log(`Lot expiry scan updated ${changed} lot(s)`);
  }

  /** Recompute all lots (or a single material's lots). Returns rows changed. */
  async recompute(materialId?: string): Promise<number> {
    const lots = await this.lots.find({
      where: materialId ? { materialId } : {},
      relations: { material: true },
      loadEagerRelations: false,
      select: {
        id: true,
        expiryDate: true,
        status: true,
        material: { id: true, dangerWeeks: true, warningWeeks: true },
      },
    });

    let changed = 0;
    for (const lot of lots) {
      const next = computeLotExpiryStatus(
        lot.expiryDate ?? null,
        lot.material?.dangerWeeks ?? null,
        lot.material?.warningWeeks ?? null,
      );
      if (next !== lot.status) {
        await this.lots.update(lot.id, { status: next });
        changed += 1;
      }
    }
    return changed;
  }

  recomputeForMaterial(materialId: string): Promise<number> {
    return this.recompute(materialId);
  }
}
