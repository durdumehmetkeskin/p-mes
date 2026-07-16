import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../users/entities/user.entity';
import { StageBoardService, type StageBoard } from './stage-board.service';

@ApiTags('stage-board')
@ApiBearerAuth('access-token')
@Controller('stage-board')
export class StageBoardController {
  constructor(private readonly service: StageBoardService) {}

  // No @RequirePermissions: any authenticated user sees their own stages; the
  // service scopes non-admins to themselves and only applies filters for admins.
  @Get()
  @ApiOperation({
    summary:
      'Kanban feed of assigned stages (own stages; all + filters for admin)',
  })
  board(
    @CurrentUser() user: User,
    @Query('projectId') projectId?: string,
    @Query('userId') userId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<StageBoard> {
    return this.service.getBoard({ user, projectId, userId, from, to });
  }
}
