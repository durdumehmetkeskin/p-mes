import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  NotificationsService,
  NotificationType,
  type NotifyInput,
} from '../notifications/notifications.service';
import { Project } from '../project/entities/project.entity';
import { OrderMaterialRequirement } from '../project/entities/order-material-requirement.entity';
import { ProjectMaterialReorder } from '../project/entities/project-material-reorder.entity';
import { StockItem } from './entities/stock-item.entity';
import { StockItemStatus } from './enums/stock-item-status.enum';

/** Statuses that count as "held for the order" toward a requirement. */
const COVERED_STATUSES = [
  StockItemStatus.Reserving,
  StockItemStatus.Reserved,
  StockItemStatus.Delivering,
  StockItemStatus.Delivered,
];

/**
 * Fires low-stock notifications on two independent axes:
 *  - ORDER requirement shortage: an order's uncovered required quantity
 *    exceeds the project's freely-available stock; and
 *  - PROJECT reorder: the project's freely-available stock of a material drops
 *    to/below a per-project reorder (critical-stock) level.
 * Both are checked on every stock change to the material, notify the owning
 * project's members + admins, and are deduped by "one unread alert per row".
 */
@Injectable()
export class StockAlertService {
  constructor(
    @InjectRepository(OrderMaterialRequirement)
    private readonly requirements: Repository<OrderMaterialRequirement>,
    @InjectRepository(ProjectMaterialReorder)
    private readonly reorders: Repository<ProjectMaterialReorder>,
    @InjectRepository(StockItem)
    private readonly stockItems: Repository<StockItem>,
    @InjectRepository(Project)
    private readonly projects: Repository<Project>,
    private readonly notifications: NotificationsService,
  ) {}

  async check(materialId?: string | null): Promise<void> {
    if (!materialId) return;
    await this.checkOrderRequirements(materialId);
    await this.checkProjectReorders(materialId);
  }

  private async checkOrderRequirements(materialId: string): Promise<void> {
    // Every order that requires this material (with its required quantity).
    const reqs = await this.requirements.find({
      where: { materialId },
      relations: { order: true },
    });
    for (const req of reqs) {
      if (req.requiredQuantity <= 0) continue;
      // Soft-deleted parent order comes back as null from the join filter.
      if (!req.order) continue;

      const covered = await this.coveredForOrder(materialId, req.orderId);
      const remaining = req.requiredQuantity - covered;
      if (remaining <= 0) continue; // requirement fully reserved

      const stock = await this.projectStock(materialId, req.order.projectId);
      if (stock >= remaining) continue; // enough free stock to cover the rest

      // One unread alert per requirement until someone reads it.
      if (await this.notifications.existsUnreadFor('low_stock', req.id)) {
        continue;
      }
      await this.notifyProject(req, stock, remaining);
    }
  }

  private async checkProjectReorders(materialId: string): Promise<void> {
    // Every project that set a reorder level for this material.
    const rows = await this.reorders.find({ where: { materialId } });
    for (const pmr of rows) {
      if (pmr.reorderLevel <= 0) continue;

      const stock = await this.projectStock(materialId, pmr.projectId);
      if (stock > pmr.reorderLevel) continue; // above the critical level

      // One unread alert per reorder row until someone reads it.
      if (await this.notifications.existsUnreadFor('low_stock', pmr.id)) {
        continue;
      }
      await this.notifyReorder(pmr, stock);
    }
  }

  /** SUM of stock already held for the order (reserving → delivered). */
  private async coveredForOrder(
    materialId: string,
    orderId: string,
  ): Promise<number> {
    const raw = await this.stockItems
      .createQueryBuilder('si')
      .innerJoin('si.lot', 'l')
      .select('COALESCE(SUM(si.quantity), 0)', 'sum')
      .where('l.material_id = :materialId', { materialId })
      .andWhere('si.order_id = :orderId', { orderId })
      .andWhere('si.status IN (:...covered)', { covered: COVERED_STATUSES })
      .getRawOne<{ sum: string }>();
    return Number(raw?.sum ?? 0);
  }

  /** SUM of this project's freely-available stock of the material. */
  private async projectStock(
    materialId: string,
    projectId: string,
  ): Promise<number> {
    const raw = await this.stockItems
      .createQueryBuilder('si')
      .innerJoin('si.lot', 'l')
      .leftJoin('si.order', 'o')
      .select('COALESCE(SUM(si.quantity), 0)', 'sum')
      .where('l.material_id = :materialId', { materialId })
      .andWhere('si.status = :available', {
        available: StockItemStatus.Available,
      })
      .andWhere('(l.project_id = :projectId OR o.project_id = :projectId)', {
        projectId,
      })
      .getRawOne<{ sum: string }>();
    return Number(raw?.sum ?? 0);
  }

  /** Notify the owning project's members + admins about an order shortage. */
  private async notifyProject(
    req: OrderMaterialRequirement,
    stock: number,
    remaining: number,
  ): Promise<void> {
    const projectId = req.order.projectId;
    const project = await this.projects.findOne({
      where: { id: projectId },
    });
    const material = req.material; // eager on the requirement
    await this.notifyProjectMembers(projectId, {
      type: NotificationType.LowStock,
      title: 'Yetersiz stok',
      message: `${project?.code ?? 'Proje'} / ${req.order.orderNumber} — ${material?.code ?? ''} ${material?.name ?? ''}: gerekli ${req.requiredQuantity}, karşılanmamış ${remaining}, kullanılabilir stok ${stock}`,
      link: `/projects/${projectId}/orders/${req.orderId}`,
      entityType: 'order-material-requirement',
      entityId: req.id,
    });
  }

  /** Notify the project's members + admins that stock hit the reorder level. */
  private async notifyReorder(
    pmr: ProjectMaterialReorder,
    stock: number,
  ): Promise<void> {
    const project = await this.projects.findOne({
      where: { id: pmr.projectId },
    });
    const material = pmr.material; // eager on the reorder row
    await this.notifyProjectMembers(pmr.projectId, {
      type: NotificationType.LowStock,
      title: 'Kritik stok',
      message: `${project?.code ?? 'Proje'} — ${material?.code ?? ''} ${material?.name ?? ''}: proje stoğu ${stock} ≤ kritik seviye ${pmr.reorderLevel}`,
      link: `/projects/${pmr.projectId}/materials/${pmr.materialId}`,
      entityType: 'project-material-reorder',
      entityId: pmr.id,
    });
  }

  /** Fan a notification out to a project's members ∪ admins (deduped as a Set). */
  private async notifyProjectMembers(
    projectId: string,
    input: NotifyInput,
  ): Promise<void> {
    const members = await this.projects
      .createQueryBuilder('p')
      .innerJoin('p.members', 'm')
      .select('m.id', 'id')
      .where('p.id = :id', { id: projectId })
      .getRawMany<{ id: string }>();
    const adminIds = await this.notifications.adminUserIds();
    // Union so a member who is also an admin gets a single alert.
    const recipients = new Set<string>([
      ...members.map((m) => m.id),
      ...adminIds,
    ]);
    // Independent per-recipient writes — dispatch them concurrently.
    await Promise.all(
      [...recipients].map((userId) =>
        this.notifications.notifyUser(userId, input),
      ),
    );
  }
}
