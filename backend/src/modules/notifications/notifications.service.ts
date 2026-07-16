import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { SystemRole } from '../roles/enums/system-role.enum';
import { User } from '../users/entities/user.entity';
import { Notification } from './entities/notification.entity';

export const NotificationType = {
  Assignment: 'assignment',
  LowStock: 'low_stock',
  DeadlineApproaching: 'deadline_approaching',
  DeadlinePassed: 'deadline_passed',
  StockReserving: 'stock_reserving',
  StockReserved: 'stock_reserved',
  StockReturning: 'stock_returning',
  StockReturnRequested: 'stock_return_requested',
  ToolDelivering: 'tool_delivering',
  ToolReturning: 'tool_returning',
  ProductDelivering: 'product_delivering',
  ProductReceived: 'product_received',
} as const;

export interface NotifyInput {
  type: string;
  title: string;
  message: string;
  link?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  /** Notify one user (no-op if they are the actor performing the change). */
  async notifyUser(
    recipientUserId: string | null | undefined,
    input: NotifyInput,
    actorId?: string,
  ): Promise<void> {
    if (!recipientUserId || recipientUserId === actorId) return;
    await this.repo.save(this.repo.create({ ...input, recipientUserId }));
  }

  /** Notify every admin user (one row each). */
  async notifyAdmins(input: NotifyInput): Promise<void> {
    const ids = await this.adminUserIds();
    if (ids.length === 0) return;
    const rows = ids.map((id) =>
      this.repo.create({ ...input, recipientUserId: id }),
    );
    await this.repo.save(rows);
  }

  /** IDs of all admin users. */
  async adminUserIds(): Promise<string[]> {
    const admins = await this.users
      .createQueryBuilder('u')
      .innerJoin('u.roles', 'r', 'r.name = :role', { role: SystemRole.Admin })
      .select('u.id', 'id')
      .getRawMany<{ id: string }>();
    return admins.map((a) => a.id);
  }

  /** Whether a notification for this (type, entity) already exists (dedup). */
  async existsFor(type: string, entityId: string): Promise<boolean> {
    return (await this.repo.count({ where: { type, entityId } })) > 0;
  }

  /** Whether an UNREAD notification for this (type, entity) exists (dedup). */
  async existsUnreadFor(type: string, entityId: string): Promise<boolean> {
    return (
      (await this.repo.count({ where: { type, entityId, read: false } })) > 0
    );
  }

  findPaginated(options: {
    recipientUserId: string;
    read?: boolean;
    skip?: number;
    take?: number;
    sort: keyof Notification;
    order: 'ASC' | 'DESC';
  }): Promise<[Notification[], number]> {
    const where: FindOptionsWhere<Notification> = {
      recipientUserId: options.recipientUserId,
    };
    if (options.read !== undefined) where.read = options.read;
    return this.repo.findAndCount({
      where,
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found || found.recipientUserId !== userId) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    found.read = true;
    return this.repo.save(found);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.repo.update(
      { recipientUserId: userId, read: false },
      { read: true },
    );
  }
}
