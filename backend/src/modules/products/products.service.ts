import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Readable } from 'stream';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CustodyService } from '../custody/custody.service';
import { CustodyCloseAction } from '../custody/enums/custody-close-action.enum';
import { CustodyItemType } from '../custody/enums/custody-item-type.enum';
import { MaterialUnitsService } from '../inventory/material-units.service';
import { SectionReservation } from '../location/entities/section-reservation.entity';
import {
  LocationDataService,
  type ReadingSummary,
} from '../location/location-data.service';
import { StorageRacksService } from '../location/storage-racks.service';
import {
  NotificationsService,
  NotificationType,
} from '../notifications/notifications.service';
import { Order } from '../project/entities/order.entity';
import { ProcessStage } from '../project/entities/process-stage.entity';
import { ProcessStageLink } from '../project/entities/process-stage-link.entity';
import { ProcessStageStatus } from '../project/enums/process-stage-status.enum';
import { ProjectsService } from '../project/projects.service';
import { QrService } from '../qr/qr.service';
import { QrResult } from '../qr/qr.types';
import { MinioService } from '../storage/minio.service';
import { User } from '../users/entities/user.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { ProductHandoverStatus } from './enums/product-handover-status.enum';
import { ProductsRepository } from './products.repository';
import { ProductTypesService } from './product-types.service';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly productTypesService: ProductTypesService,
    private readonly materialUnitsService: MaterialUnitsService,
    private readonly storageRacksService: StorageRacksService,
    private readonly locationData: LocationDataService,
    private readonly projects: ProjectsService,
    private readonly notifications: NotificationsService,
    private readonly qrService: QrService,
    private readonly minio: MinioService,
    private readonly custody: CustodyService,
    @InjectRepository(ProcessStage)
    private readonly stages: Repository<ProcessStage>,
    @InjectRepository(Order)
    private readonly orders: Repository<Order>,
  ) {}

  /** Next `PRD-YYYY-NNNN` (4-digit yearly sequence; deleted codes not reused). */
  private async generateProductCode(): Promise<string> {
    const prefix = `PRD-${new Date().getFullYear()}-`;
    const codes = await this.productsRepository.findCodesByPrefix(prefix);
    const max = codes.reduce(
      (m, c) => Math.max(m, Number.parseInt(c.slice(prefix.length), 10) || 0),
      0,
    );
    return `${prefix}${String(max + 1).padStart(4, '0')}`;
  }

  private isUniqueViolation(e: unknown): boolean {
    const err = e as { code?: string; driverError?: { code?: string } };
    return err?.code === '23505' || err?.driverError?.code === '23505';
  }

  /**
   * Apply the origin links onto the entity. A stage always wins: its process
   * and order are derived server-side (never trusted from the client), so the
   * three links can't disagree. An order alone leaves process/stage null.
   * Non-admins must be a member of the origin's project (404 else — the
   * existing don't-leak-existence convention).
   */
  private async applyOrigin(
    product: Product,
    dto: { orderId?: string | null; stageId?: string | null },
    user?: User,
  ): Promise<void> {
    if (dto.stageId) {
      // Request the full chain explicitly — the eager flags on
      // process.orderItem/orderItem.order do NOT cascade through an explicit
      // `relations` option, and an unloaded order would silently persist as
      // order_id NULL.
      const stage = await this.stages.findOne({
        where: { id: dto.stageId },
        relations: { process: { orderItem: { order: true } }, workers: true },
      });
      if (!stage?.process?.orderItem?.order) {
        throw new NotFoundException(`Stage ${dto.stageId} not found`);
      }
      const order = stage.process.orderItem.order;
      if (
        user &&
        !ProjectsService.isAdmin(user) &&
        !(await this.projects.isMember(order.projectId, user.id))
      ) {
        throw new NotFoundException(`Stage ${dto.stageId} not found`);
      }
      // Recording a stage's output is stage work: only that stage's workers,
      // the process responsible or an admin — other members are view-only.
      if (
        user &&
        !ProjectsService.isAdmin(user) &&
        stage.process.responsibleUserId !== user.id &&
        !(stage.workers ?? []).some((w) => w.id === user.id)
      ) {
        throw new ForbiddenException(
          'Bu aşamaya çıktı kaydını yalnızca aşama çalışanı, proses sorumlusu veya admin ekleyebilir.',
        );
      }
      product.stage = stage;
      product.process = stage.process;
      product.order = order;
      // Snapshot the true origin — flow-through re-stamps `stage` later.
      product.originStageName = stage.name;
      product.originStageId = stage.id;
      return;
    }

    if (dto.stageId === null) {
      product.stage = null;
      product.process = null;
      product.originStageName = null;
      product.originStageId = null;
    }

    if (dto.orderId) {
      const order = await this.orders.findOne({ where: { id: dto.orderId } });
      if (!order) {
        throw new NotFoundException(`Order ${dto.orderId} not found`);
      }
      if (
        user &&
        !ProjectsService.isAdmin(user) &&
        !(await this.projects.isMember(order.projectId, user.id))
      ) {
        throw new NotFoundException(`Order ${dto.orderId} not found`);
      }
      product.order = order;
      // An explicit order replaces any previous stage-derived origin.
      product.stage = null;
      product.process = null;
      product.originStageName = null;
      product.originStageId = null;
    } else if (dto.orderId === null) {
      product.order = null;
      product.stage = null;
      product.process = null;
      product.originStageName = null;
      product.originStageId = null;
    }
  }

  /** Resolve the optional lookup relations, validating each id (404 on bad). */
  private async applyLookups(
    product: Product,
    dto: UpdateProductDto,
  ): Promise<void> {
    if (dto.productTypeId !== undefined) {
      product.productType = dto.productTypeId
        ? await this.productTypesService.findOne(dto.productTypeId)
        : null;
    }
    if (dto.materialUnitId !== undefined) {
      product.materialUnit = dto.materialUnitId
        ? await this.materialUnitsService.findOne(dto.materialUnitId)
        : null;
    }
    if (dto.storageRackId !== undefined) {
      if (dto.storageRackId) {
        product.storageRack = await this.storageRacksService.findOne(
          dto.storageRackId,
        );
        product.storageRackId = product.storageRack.id;
      } else {
        product.storageRack = null;
        product.storageRackId = null;
      }
    }
  }

  async create(dto: CreateProductDto, user?: User): Promise<Product> {
    // code is server-generated (never client-set); relation ids are applied
    // via their relation objects below (when both are present, the object wins).
    const {
      code: _code,
      productTypeId: _pt,
      materialUnitId: _mu,
      storageRackId: _sr,
      orderId: _o,
      stageId: _s,
      producedAt,
      ...rest
    } = dto;
    const product = this.productsRepository.create(rest);
    product.producedAt = producedAt ? new Date(producedAt) : new Date();
    product.producedByUserId = user?.id ?? null;

    await this.applyLookups(product, dto);
    await this.applyOrigin(product, dto, user);

    // Auto-generate the code, retrying on the rare concurrent sequence
    // collision (the next attempt re-reads the max and increments).
    for (let attempt = 0; ; attempt++) {
      product.code = await this.generateProductCode();
      try {
        const saved = await this.productsRepository.save(product);
        // The product's ONE persistent QR is minted right at creation
        // (best effort — a storage hiccup must not fail the record; the QR
        // endpoint lazily backfills it on first request).
        await this.ensureQrObject(saved).catch((err) =>
          this.logger.warn(`Could not persist QR for ${saved.id}: ${err}`),
        );
        return this.findOne(saved.id, user);
      } catch (e) {
        if (attempt < 5 && this.isUniqueViolation(e)) continue;
        throw e;
      }
    }
  }

  async findPaginated(
    options: {
      skip?: number;
      take?: number;
      sort: keyof Product;
      order: 'ASC' | 'DESC';
      q?: string;
      orderId?: string;
      processId?: string;
      stageId?: string;
      productTypeId?: string;
      storageId?: string;
      storageRackId?: string;
      consumedByStageId?: string;
      consumedByProcessId?: string;
      unconsumed?: string;
    },
    user?: User,
  ): Promise<[Product[], number]> {
    // Non-admins see products of their member projects + origin-less products.
    const memberProjectIds =
      user && !ProjectsService.isAdmin(user)
        ? await this.projects.memberProjectIds(user.id)
        : undefined;
    return this.productsRepository.findAndCount({
      ...options,
      memberProjectIds,
    });
  }

  async findOne(id: string, user?: User): Promise<Product> {
    const product = await this.productsRepository.findById(id);
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    if (user && !ProjectsService.isAdmin(user) && product.orderId) {
      // Origin order soft-deleted → project unknown → hide from non-admins,
      // mirroring the list scoping.
      const projectId = product.order?.projectId;
      if (!projectId || !(await this.projects.isMember(projectId, user.id))) {
        throw new NotFoundException(`Product ${id} not found`);
      }
    }
    return product;
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    user?: User,
  ): Promise<Product> {
    const product = await this.findOne(id, user); // inherits scoping

    // code is server-generated and immutable; relations handled below.
    const {
      code: _code,
      productTypeId: _pt,
      materialUnitId: _mu,
      storageRackId: _sr,
      orderId: _o,
      stageId: _s,
      producedAt,
      ...rest
    } = dto;
    Object.assign(product, rest);
    if (producedAt !== undefined) {
      product.producedAt = producedAt ? new Date(producedAt) : null;
    }

    await this.applyLookups(product, dto);
    await this.applyOrigin(product, dto, user);

    await this.productsRepository.save(product);
    return this.findOne(id, user); // reload eager relations
  }

  async remove(id: string, user?: User): Promise<void> {
    const product = await this.findOne(id, user); // inherits scoping
    await this.productsRepository.softRemove(product);
  }

  /**
   * Mark the product as an INPUT of a stage (e.g. an intermediate product fed
   * into the next stage). A product can be consumed by at most one stage, and
   * never by the stage that produced it.
   */
  async consume(id: string, stageId: string, user?: User): Promise<Product> {
    const product = await this.findOne(id, user); // inherits scoping
    if (product.consumedByStageId) {
      throw new ConflictException(
        'This product is already used as an input of another stage.',
      );
    }
    if (product.stageId === stageId) {
      throw new BadRequestException(
        'A product cannot be an input of the stage that produced it.',
      );
    }
    const stage = await this.stages.findOne({
      where: { id: stageId },
      relations: { process: { orderItem: { order: true } } },
    });
    if (!stage?.process?.orderItem?.order) {
      throw new NotFoundException(`Stage ${stageId} not found`);
    }
    if (
      user &&
      !ProjectsService.isAdmin(user) &&
      !(await this.projects.isMember(
        stage.process.orderItem.order.projectId,
        user.id,
      ))
    ) {
      throw new NotFoundException(`Stage ${stageId} not found`);
    }
    // A stage's inputs are planned by the process responsible (or an admin) —
    // stage workers only record outputs.
    this.assertStageInputEditor(stage.process, user);
    product.consumedByStage = stage;
    await this.productsRepository.save(product);

    // Tell the consuming stage's workers where to pick the input up.
    const rack = product.storageRack;
    const location = rack
      ? [rack.storage?.location?.name, rack.code].filter(Boolean).join(' / ')
      : '';
    for (const worker of stage.workers ?? []) {
      await this.notifications.notifyUser(
        worker.id,
        {
          type: NotificationType.ProductInputReady,
          title: 'Girdi ürünü hazır',
          message: `${product.code} ${product.name}: "${stage.name}" girdisi — ${location ? `${location} konumundan ` : ''}QR okutarak teslim alın`,
          link: `/products/${product.id}`,
          entityType: 'product',
          entityId: product.id,
        },
        user?.id,
      );
    }

    return this.findOne(id, user);
  }

  /**
   * A worker of the CONSUMING stage picks up an input product (QR scan):
   * records input custody — separate from the storage drop-off fields, which
   * the product may already carry. Admin or a worker of `consumedByStage` only.
   */
  async receiveInput(id: string, user: User): Promise<Product> {
    const product = await this.findOne(id, user); // membership scoping
    if (product.inputReceivedAt) {
      throw new BadRequestException('Bu ürün zaten teslim alınmış.');
    }
    let stage: ProcessStage | null;
    if (product.consumedByStageId) {
      stage = await this.stages.findOne({
        where: { id: product.consumedByStageId },
      });
      if (
        !ProjectsService.isAdmin(user) &&
        !(stage?.workers ?? []).some((w) => w.id === user.id)
      ) {
        throw new ForbiddenException(
          'Girdi ürününü yalnızca o aşamanın çalışanı teslim alabilir.',
        );
      }
    } else {
      // io-inherited input: the producing stage's OUT port feeds successor
      // stages' IN ports. Picking the product up FORMALIZES the link — pick
      // the first not-completed io-successor the user works on (admin: any)
      // and consume the product onto it.
      if (!product.stageId) {
        throw new BadRequestException('Bu ürün bir aşamanın girdisi değil.');
      }
      const ioLinks = await this.stages.manager
        .getRepository(ProcessStageLink)
        .find({ where: { fromStageId: product.stageId, kind: 'io' } });
      if (ioLinks.length === 0) {
        throw new BadRequestException('Bu ürün bir aşamanın girdisi değil.');
      }
      const successors = await this.stages.find({
        where: { id: In(ioLinks.map((l) => l.toStageId)) },
      });
      const target = successors
        .filter((s) => s.status !== ProcessStageStatus.Completed)
        .filter(
          (s) =>
            ProjectsService.isAdmin(user) ||
            (s.workers ?? []).some((w) => w.id === user.id),
        )
        .sort((a, b) => a.sequence - b.sequence)[0];
      if (!target) {
        throw new ForbiddenException(
          'Girdi ürününü yalnızca o aşamanın çalışanı teslim alabilir.',
        );
      }
      product.consumedByStage = target;
      product.consumedByStageId = target.id;
      stage = target;
    }
    product.inputReceivedByUserId = user.id;
    product.inputReceivedByUser = { id: user.id } as User;
    product.inputReceivedAt = new Date();
    await this.productsRepository.save(product);

    // Custody ledger: picking the input up opens the worker's zimmet record.
    // warehouseCode carries WHERE the pickup happened (the product's shelf).
    await this.custody.open({
      itemType: CustodyItemType.Product,
      sourceId: product.id,
      userId: user.id,
      stageId: product.consumedByStageId,
      itemCode: product.code,
      itemName: product.name,
      quantity: product.quantity,
      unit: product.materialUnit?.name,
      stageName: stage?.name,
      warehouseCode: ProductsService.shelfLocation(product),
      receivedAt: product.inputReceivedAt,
    });
    return this.findOne(id, user);
  }

  /** "location / storage rack" display string for where the product sits. */
  private static shelfLocation(product: Product): string | null {
    const sr = product.storageRack;
    if (!sr) return null;
    return (
      [sr.storage?.location?.name ?? sr.storage?.code, sr.code]
        .filter(Boolean)
        .join(' / ') || null
    );
  }

  /**
   * The product's processing journey: produced → stored → (received at a
   * stage → processed/released)… — one ordered event list combining the
   * product's own fields with its custody-ledger rows (which survive
   * flow-through re-stamps and stage deletion). Membership-scoped via findOne.
   */
  async getJourney(
    id: string,
    user?: User,
  ): Promise<
    Array<{
      type: 'produced' | 'stored' | 'received' | 'processed' | 'released';
      at: Date;
      stageName: string | null;
      user: string | null;
      location: string | null;
      /** "Location · Section" the stage ran in (from its section reservation). */
      section?: string | null;
      /** Temp/humidity over the operation's window (section's location sensors). */
      environment?: ({ from: Date; to: Date } & ReadingSummary) | null;
    }>
  > {
    const product = await this.findOne(id, user);
    const events: Array<{
      type: 'produced' | 'stored' | 'received' | 'processed' | 'released';
      at: Date;
      stageName: string | null;
      user: string | null;
      location: string | null;
      section?: string | null;
      environment?: ({ from: Date; to: Date } & ReadingSummary) | null;
    }> = [];

    const rows = await this.custody.listForSource(
      CustodyItemType.Product,
      product.id,
    );

    // Where each stage RAN + the temp/humidity while it did: the stage's
    // section reservation gives the location/section; the location's sensor
    // readings are summarised over the operation window. The ORIGIN
    // (producing) stage is included — its window = the stage's actual run.
    const originStageId = product.originStageId ?? product.stageId ?? null;
    const stageIds = [
      ...new Set(
        [
          ...rows.map((r) => r.stageId),
          originStageId,
        ].filter((s): s is string => !!s),
      ),
    ];
    const reservations = stageIds.length
      ? await this.stages.manager.getRepository(SectionReservation).find({
          where: { stageId: In(stageIds) },
          relations: { section: { location: true } },
          loadEagerRelations: false,
        })
      : [];

    // The environment window per stage = the STAGE's actual run
    // (startedAt → completedAt), not the custody span.
    const stageRows = stageIds.length
      ? await this.stages.find({
          where: { id: In(stageIds) },
          loadEagerRelations: false,
        })
      : [];
    const stageById = new Map(stageRows.map((s) => [s.id, s]));

    const contextFor = async (
      stageId: string | null,
      from: Date,
      to: Date,
    ): Promise<{
      section: string | null;
      environment: ({ from: Date; to: Date } & ReadingSummary) | null;
    }> => {
      if (!stageId) return { section: null, environment: null };
      const mine = reservations.filter((sr) => sr.stageId === stageId);
      // Prefer a reservation overlapping the operation window, else any of
      // the stage's reservations (times are floating wall-clock; heuristic).
      const overlap = mine.find((sr) => {
        const rs = sr.startAt
          ? new Date(sr.startAt).getTime()
          : sr.startDate
            ? Date.parse(`${sr.startDate}T00:00:00.000Z`)
            : Number.NEGATIVE_INFINITY;
        const re = sr.endAt
          ? new Date(sr.endAt).getTime()
          : sr.endDate
            ? Date.parse(`${sr.endDate}T00:00:00.000Z`) + 86_400_000
            : Number.POSITIVE_INFINITY;
        return rs < new Date(to).getTime() && re > new Date(from).getTime();
      });
      const section = (overlap ?? mine[0])?.section ?? null;
      if (!section) return { section: null, environment: null };
      const label =
        [
          section.location?.name ?? section.location?.code,
          section.name ?? section.code,
        ]
          .filter(Boolean)
          .join(' · ') || null;
      let environment: ({ from: Date; to: Date } & ReadingSummary) | null =
        null;
      if (section.locationId) {
        const series = await this.locationData.getSeries(section.locationId, {
          from: new Date(from).toISOString(),
          to: new Date(to).toISOString(),
          maxPoints: 24,
        });
        environment = { from, to, ...series.summary };
      }
      return { section: label, environment };
    };

    // Produced event — enriched with the ORIGIN stage's section + the
    // temp/humidity over that stage's actual run window.
    const producedAt = product.producedAt ?? product.createdAt;
    const originStage = originStageId
      ? (stageById.get(originStageId) ?? null)
      : null;
    const producedCtx = await contextFor(
      originStageId,
      originStage?.startedAt ?? producedAt,
      originStage?.completedAt ?? producedAt,
    );
    events.push({
      type: 'produced',
      at: producedAt,
      stageName: product.originStageName ?? product.stage?.name ?? null,
      user: product.producedByUser?.name ?? null,
      location: null,
      section: producedCtx.section,
      environment: producedCtx.environment,
    });

    if (product.receivedAt) {
      events.push({
        type: 'stored',
        at: product.receivedAt,
        stageName: null,
        user: product.receivedByUser?.name ?? null,
        location: ProductsService.shelfLocation(product),
      });
    }

    for (const r of rows) {
      // Pickup rows stay plain — section + environment belong to the
      // PROCESSING itself (the 'processed' event) per the requirement.
      events.push({
        type: 'received',
        at: r.receivedAt,
        stageName: r.stageName,
        user: r.user?.name ?? null,
        location: r.warehouseCode,
      });
      if (r.closedAt) {
        const processed = r.closeAction === CustodyCloseAction.Consumed;
        // Window = the stage's ACTUAL start → completion dates (custody span
        // is only the fallback when the stage row is gone).
        const stg = r.stageId ? stageById.get(r.stageId) : undefined;
        const ctx = processed
          ? await contextFor(
              r.stageId,
              stg?.startedAt ?? r.receivedAt,
              stg?.completedAt ?? r.closedAt,
            )
          : { section: null, environment: null };
        events.push({
          type: processed ? 'processed' : 'released',
          at: r.closedAt,
          stageName: r.stageName,
          user: r.user?.name ?? null,
          location: null,
          section: ctx.section,
          environment: ctx.environment,
        });
      }
    }

    events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    return events;
  }

  // --- one-sided handover (store) + QR ---

  /**
   * ONE-SIDED drop-off: any project-scoped user shelves the product on a
   * location-storage rack — there is no warehouse responsible in the loop.
   * `produced` (or a legacy `delivering` row) → `received` in a single step;
   * the actor is recorded as both deliverer and receiver.
   */
  async store(id: string, storageRackId: string, user: User): Promise<Product> {
    const product = await this.findOne(id, user); // project scoping = the gate
    if (product.handoverStatus === ProductHandoverStatus.Received) {
      throw new BadRequestException('Bu ürün zaten depoya bırakılmış.');
    }
    const rack = await this.storageRacksService.findOne(storageRackId);
    product.storageRack = rack;
    product.storageRackId = rack.id;
    const now = new Date();
    product.handoverStatus = ProductHandoverStatus.Received;
    product.deliveredByUserId = user.id;
    product.deliveredByUser = { id: user.id } as User;
    product.deliveredAt = now;
    product.receivedByUserId = user.id;
    product.receivedByUser = { id: user.id } as User;
    product.receivedAt = now;
    await this.productsRepository.save(product);

    // Close the loop for whoever recorded the production.
    await this.notifications.notifyUser(
      product.producedByUserId,
      {
        type: NotificationType.ProductReceived,
        title: 'Ürün depoya bırakıldı',
        message: `${product.code} ${product.name}: "${rack.storage?.location?.name ?? ''} / ${rack.code}" rafına bırakıldı`,
        link: `/products/${product.id}`,
        entityType: 'product',
        entityId: product.id,
      },
      user.id,
    );
    return this.findOne(id, user);
  }

  /**
   * Mint the product's ONE persistent QR PNG into MinIO (id/code/deep link —
   * all immutable) and record its key. Idempotent: no-op when already minted.
   */
  private async ensureQrObject(product: Product): Promise<string> {
    if (product.qrObjectKey) return product.qrObjectKey;
    const payload = this.qrService.buildPayload(
      'product',
      product.id,
      product.code,
      `/products/${product.id}`,
    );
    const buffer = await this.qrService.toPng(payload);
    const key = `product-qr/${product.id}.png`;
    await this.minio.put(key, buffer, 'image/png');
    await this.productsRepository.updateQrObjectKey(product.id, key);
    product.qrObjectKey = key;
    return key;
  }

  /**
   * Serve the product's persistent QR (PNG). Generated ONCE — at creation,
   * or lazily here for pre-existing products — then always the SAME stored
   * image is returned. Membership scoping via {@link findOne}.
   */
  async generateQr(id: string, user?: User): Promise<QrResult> {
    const product = await this.findOne(id, user);
    const key = await this.ensureQrObject(product);
    let buffer: Buffer;
    try {
      buffer = await streamToBuffer(await this.minio.getStream(key));
    } catch {
      // Stored object lost (bucket cleanup etc.) — re-mint the same payload
      // once and serve it.
      product.qrObjectKey = null;
      const freshKey = await this.ensureQrObject(product);
      buffer = await streamToBuffer(await this.minio.getStream(freshKey));
    }
    return {
      fileName: this.qrService.fileName('product', product.code),
      buffer,
    };
  }

  /** Release the product from its consuming stage (undo `consume`). */
  async release(id: string, user?: User): Promise<Product> {
    const product = await this.findOne(id, user); // inherits scoping
    // Same rule as consume: only the process responsible or an admin may
    // change a stage's planned inputs.
    if (product.consumedByStageId) {
      const stage = await this.stages.findOne({
        where: { id: product.consumedByStageId },
        relations: { process: true },
      });
      if (stage?.process) this.assertStageInputEditor(stage.process, user);
    }
    product.consumedByStage = null;
    product.consumedByStageId = null;
    // The input-custody record belongs to the released link.
    product.inputReceivedByUser = null;
    product.inputReceivedByUserId = null;
    product.inputReceivedAt = null;
    await this.productsRepository.save(product);
    // Custody ledger: undoing the input link releases the holder's record.
    await this.custody.close(CustodyItemType.Product, product.id, {
      action: CustodyCloseAction.Released,
    });
    return this.findOne(id, user);
  }

  /** Stage inputs are planned by the owning process's responsible (or admin). */
  private assertStageInputEditor(
    process: { responsibleUserId?: string | null },
    user?: User,
  ): void {
    if (ProjectsService.isAdmin(user)) return;
    if (!user || process.responsibleUserId !== user.id) {
      throw new ForbiddenException(
        'Aşama girdilerini yalnızca proses sorumlusu veya admin belirleyebilir.',
      );
    }
  }
}

/** Drain a MinIO object stream into a Buffer (QR PNGs are a few KB). */
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
