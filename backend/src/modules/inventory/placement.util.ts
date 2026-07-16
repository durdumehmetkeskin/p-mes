import { BadRequestException } from '@nestjs/common';
import type { Lot } from './entities/lot.entity';
import type { Rack } from './entities/rack.entity';

/**
 * A project's stock may only be placed into that project's zones/racks. The
 * governing project is the lot's project; project-less stock is unconstrained.
 * `rack` must be loaded with its eager `zone` (so `rack.zone.projectId` is set).
 */
export function assertProjectPlacement(lot: Lot, rack: Rack | null): void {
  if (!lot.projectId) return;
  if (!rack) {
    throw new BadRequestException(
      "Project stock must be placed in one of the project's racks",
    );
  }
  if (rack.zone?.projectId !== lot.projectId) {
    throw new BadRequestException(
      "This project's material can only be placed in its own zones/racks",
    );
  }
}
