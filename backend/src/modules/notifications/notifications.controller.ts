import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SystemRole } from '../roles/enums/system-role.enum';
import type { User } from '../users/entities/user.entity';
import { DeadlineScannerService } from './deadline-scanner.service';
import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { Notification } from './entities/notification.entity';
import { NotificationsService } from './notifications.service';

const SORTABLE: ReadonlyArray<keyof Notification> = ['createdAt', 'read'];

/**
 * Personal notifications — every route is scoped to the current user (no
 * @RequirePermissions; you only ever see/act on your own rows).
 */
@ApiTags('notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly service: NotificationsService,
    private readonly deadlines: DeadlineScannerService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List my notifications (paginated; filter by read)',
  })
  async findAll(
    @Query() query: ListNotificationsQueryDto,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: User,
  ): Promise<Notification[]> {
    const skip = query._start ?? 0;
    const take =
      query._end !== undefined ? Math.max(query._end - skip, 0) : undefined;
    const sort = SORTABLE.includes(query._sort as keyof Notification)
      ? (query._sort as keyof Notification)
      : 'createdAt';
    const order = query._order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const read = query.read === undefined ? undefined : query.read === 'true';

    const [items, total] = await this.service.findPaginated({
      recipientUserId: user.id,
      read,
      skip,
      take,
      sort,
      order,
    });
    res.setHeader('x-total-count', total);
    return items;
  }

  @Post('read-all')
  @HttpCode(204)
  @ApiOperation({ summary: 'Mark all my notifications as read' })
  readAll(@CurrentUser() user: User): Promise<void> {
    return this.service.markAllRead(user.id);
  }

  @Post('scan-deadlines')
  @ApiOperation({ summary: 'Run the deadline scan now (admin only)' })
  async scanDeadlines(@CurrentUser() user: User): Promise<{ batches: number }> {
    const isAdmin = (user.roles ?? []).some(
      (r) => r?.name === (SystemRole.Admin as string),
    );
    if (!isAdmin) throw new ForbiddenException('Admins only');
    return { batches: await this.deadlines.scan() };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Mark a notification read' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() _dto: UpdateNotificationDto,
    @CurrentUser() user: User,
  ): Promise<Notification> {
    return this.service.markRead(id, user.id);
  }
}
