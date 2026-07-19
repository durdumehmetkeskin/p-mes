import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { Order } from '../project/entities/order.entity';
import { Process } from '../project/entities/process.entity';
import { ProcessStage } from '../project/entities/process-stage.entity';
import { ProjectsService } from '../project/projects.service';
import type { User } from '../users/entities/user.entity';
import { CreateSectionReservationDto } from './dto/create-section-reservation.dto';
import { UpdateSectionReservationDto } from './dto/update-section-reservation.dto';
import { SectionReservation } from './entities/section-reservation.entity';
import { Section } from './entities/section.entity';

@Injectable()
export class SectionReservationsService {
  constructor(
    @InjectRepository(SectionReservation)
    private readonly repo: Repository<SectionReservation>,
    @InjectRepository(ProcessStage)
    private readonly stages: Repository<ProcessStage>,
    private readonly projects: ProjectsService,
  ) {}

  /**
   * Hour-granular wall-clock range from dates + optional HH:mm times (times
   * omitted → full days). Stored on the UTC face ("floating time") — compare
   * as epochs, display via iso.slice, never toLocaleString.
   */
  private static composeRange(
    startDate: string,
    endDate: string,
    startTime?: string,
    endTime?: string,
  ): { startAt: Date; endAt: Date } {
    const startAt = new Date(`${startDate}T${startTime ?? '00:00'}:00.000Z`);
    const endAt = endTime
      ? new Date(`${endDate}T${endTime}:00.000Z`)
      : new Date(`${endDate}T23:59:59.999Z`);
    if (
      !Number.isFinite(startAt.getTime()) ||
      !Number.isFinite(endAt.getTime()) ||
      startAt.getTime() >= endAt.getTime()
    ) {
      throw new ConflictException('Start must be before end (date and time).');
    }
    return { startAt, endAt };
  }

  /** Does any of the user's roles carry the given permission key? */
  private static hasKey(user: User | undefined, key: string): boolean {
    return Boolean(
      user?.roles?.some((r) => (r.permissions ?? []).includes(key)),
    );
  }

  /**
   * Section reservations may be managed by an admin, a holder of the matching
   * section-reservations:* key (legacy/custom roles), or — for STAGE-linked
   * rows — the owning PROCESS'S RESPONSIBLE, who plans their own process
   * without needing a global key.
   */
  private async assertReservationEditor(
    user: User | undefined,
    key: string,
    stageId?: string | null,
  ): Promise<void> {
    if (!user || ProjectsService.isAdmin(user)) return;
    if (SectionReservationsService.hasKey(user, key)) return;
    if (stageId) {
      const stage = await this.stages.findOne({
        where: { id: stageId },
        loadEagerRelations: false,
      });
      const process = stage
        ? await this.stages.manager.getRepository(Process).findOne({
            where: { id: stage.processId },
            loadEagerRelations: false,
          })
        : null;
      if (process?.responsibleUserId === user.id) return;
    }
    throw new ForbiddenException(
      'Bölüm rezervasyonunu yalnızca proses sorumlusu, yetkili rol veya admin yönetebilir.',
    );
  }

  async create(
    dto: CreateSectionReservationDto,
    user?: User,
  ): Promise<SectionReservation> {
    await this.assertOrderAccess(dto.orderId, user);
    await this.assertReservationEditor(
      user,
      'section-reservations:create',
      dto.stageId,
    );
    const { startAt, endAt } = SectionReservationsService.composeRange(
      dto.startDate,
      dto.endDate,
      dto.startTime,
      dto.endTime,
    );
    await this.assertNoOverlap(dto.sectionId, startAt, endAt);
    // Keep the planned stage's estimated dates in sync with the reservation.
    // Done here (not via PATCH /process-stages from the client) so reserving
    // does not require the stage-edit permission. Validates stage↔order too,
    // so persisting stageId afterwards is safe.
    if (dto.stageId) {
      await this.syncStageEstimates(
        dto.stageId,
        dto.orderId,
        dto.startDate,
        dto.endDate,
      );
    }
    const entity = this.repo.create(dto);
    entity.startAt = startAt;
    entity.endAt = endAt;
    const saved = await this.repo.save(entity);
    // Reload so the eager section/order relations are on the response.
    return this.findOne(saved.id);
  }

  /**
   * Stage rule (mirrors tool reservations): when the stage already has a date
   * window (actuals falling back to estimates), the reservation must lie
   * WITHIN it and the stage dates are left untouched. When the window is
   * incomplete, the legacy behavior applies — the reservation range seeds the
   * stage's estimated dates. Also validates stage↔order.
   */
  private async syncStageEstimates(
    stageId: string,
    orderId: string,
    startDate: string,
    endDate: string,
  ): Promise<void> {
    const stage = await this.stages.findOne({
      where: { id: stageId },
      relations: { process: true },
    });
    if (!stage || stage.process?.orderItem?.orderId !== orderId) {
      throw new BadRequestException(
        'Stage does not belong to the reserved order',
      );
    }
    const day = (d: Date | null) =>
      d ? new Date(d).toISOString().slice(0, 10) : null;
    const windowStart = day(stage.startedAt) ?? stage.estimatedStartDate;
    const windowEnd = day(stage.completedAt) ?? stage.estimatedCompletedDate;
    if (windowStart && windowEnd) {
      if (startDate < windowStart || endDate > windowEnd) {
        throw new BadRequestException(
          `Rezervasyon aşamanın tarih aralığında olmalı (${windowStart} → ${windowEnd}).`,
        );
      }
      return; // dates stay as they are
    }
    await this.stages.update(stageId, {
      estimatedStartDate: startDate,
      estimatedCompletedDate: endDate,
    });
  }

  async update(
    id: string,
    dto: UpdateSectionReservationDto,
    user?: User,
  ): Promise<SectionReservation> {
    const found = await this.findOne(id, user);
    await this.assertReservationEditor(
      user,
      'section-reservations:update',
      dto.stageId ?? found.stageId,
    );
    if (dto.orderId) await this.assertOrderAccess(dto.orderId, user);
    const sectionId = dto.sectionId ?? found.sectionId;
    const startDate = dto.startDate ?? found.startDate;
    const endDate = dto.endDate ?? found.endDate;
    // Times: given ones win, else keep the stored hours, else full day.
    const wall = (d: Date | null) =>
      d ? new Date(d).toISOString().slice(11, 16) : undefined;
    const { startAt, endAt } = SectionReservationsService.composeRange(
      startDate,
      endDate,
      dto.startTime ?? wall(found.startAt),
      dto.endTime ?? wall(found.endAt),
    );
    await this.assertNoOverlap(sectionId, startAt, endAt, id);
    // Keep the planned stage's estimated dates in sync (same as create).
    const stageId = dto.stageId ?? found.stageId;
    const orderId = dto.orderId ?? found.orderId;
    if (stageId) {
      await this.syncStageEstimates(stageId, orderId, startDate, endDate);
    }
    Object.assign(found, dto);
    found.startAt = startAt;
    found.endAt = endAt;
    // Set via the relation objects too (eager-relation gotcha: when both are
    // present on an entity, the relation object wins over the FK column).
    if (dto.sectionId) found.section = { id: dto.sectionId } as Section;
    if (dto.orderId) found.order = { id: dto.orderId } as Order;
    if (dto.stageId !== undefined) {
      found.stage = dto.stageId ? ({ id: dto.stageId } as ProcessStage) : null;
    }
    await this.repo.save(found);
    return this.findOne(id);
  }

  async remove(id: string, user?: User): Promise<void> {
    const found = await this.findOne(id, user);
    await this.assertReservationEditor(
      user,
      'section-reservations:delete',
      found.stageId,
    );
    await this.repo.softRemove(found);
  }

  async findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof SectionReservation;
    order: 'ASC' | 'DESC';
    sectionId?: string;
    orderId?: string;
    locationId?: string;
    stageId?: string;
    user?: User;
  }): Promise<[SectionReservation[], number]> {
    const where: FindOptionsWhere<SectionReservation> = {};
    if (options.sectionId) where.sectionId = options.sectionId;
    if (options.orderId) where.orderId = options.orderId;
    if (options.locationId) where.section = { locationId: options.locationId };
    if (options.stageId) where.stageId = options.stageId;
    // Non-admins only see reservations of orders in their member projects.
    if (options.user && !ProjectsService.isAdmin(options.user)) {
      const ids = await this.projects.memberProjectIds(options.user.id);
      where.order = { projectId: In(ids) };
    }
    return this.repo.findAndCount({
      where,
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  async findOne(id: string, user?: User): Promise<SectionReservation> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) {
      throw new NotFoundException(`Section reservation ${id} not found`);
    }
    if (
      user &&
      !ProjectsService.isAdmin(user) &&
      !(await this.projects.isMember(found.order.projectId, user.id))
    ) {
      throw new NotFoundException(`Section reservation ${id} not found`);
    }
    return found;
  }

  private async assertOrderAccess(orderId: string, user?: User): Promise<void> {
    if (!user || ProjectsService.isAdmin(user)) return;
    if (!(await this.projects.memberOfOrderProject(orderId, user.id))) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }
  }

  /**
   * A section can hold only one order at any moment — but overlap is
   * HOUR-granular with strict comparison, so touching ranges (09–12 vs
   * 12–17 on the same day) are both allowed. Legacy rows without start_at/
   * end_at count as full days.
   */
  private async assertNoOverlap(
    sectionId: string,
    startAt: Date,
    endAt: Date,
    excludeId?: string,
  ): Promise<void> {
    const qb = this.repo
      .createQueryBuilder('r')
      .select('r.id', 'id')
      .addSelect(
        `COALESCE(r.start_at, r.start_date::timestamp AT TIME ZONE 'UTC')`,
        'cs',
      )
      .addSelect(
        `COALESCE(r.end_at, (r.end_date::timestamp + INTERVAL '1 day') AT TIME ZONE 'UTC')`,
        'ce',
      )
      .where('r.section_id = :sectionId', { sectionId })
      .andWhere(
        `COALESCE(r.start_at, r.start_date::timestamp AT TIME ZONE 'UTC') < :endAt`,
        { endAt },
      )
      .andWhere(
        `COALESCE(r.end_at, (r.end_date::timestamp + INTERVAL '1 day') AT TIME ZONE 'UTC') > :startAt`,
        { startAt },
      );
    if (excludeId) qb.andWhere('r.id != :excludeId', { excludeId });
    const clash = await qb.getRawOne<{ id: string; cs: Date; ce: Date }>();
    if (clash) {
      const fmt = (d: Date) =>
        new Date(d).toISOString().slice(0, 16).replace('T', ' ');
      throw new ConflictException(
        `This section is already reserved for an overlapping range (${fmt(clash.cs)} → ${fmt(clash.ce)}).`,
      );
    }
  }
}
