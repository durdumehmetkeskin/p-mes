import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '../users/entities/user.entity';
import { MyWorkService } from './my-work.service';

// No @RequirePermissions: every route is SELF-scoped — any authenticated
// user only ever gets their own data (same rationale as /stage-board).
@ApiTags('my-work')
@ApiBearerAuth('access-token')
@Controller('my-work')
export class MyWorkController {
  constructor(private readonly service: MyWorkService) {}

  @Get('checkouts')
  @ApiOperation({
    summary:
      'Materials and tools currently checked out to the caller (received, not yet returned)',
  })
  checkouts(@CurrentUser() user: User): ReturnType<MyWorkService['checkouts']> {
    return this.service.checkouts(user);
  }

  @Get('responsibilities')
  @ApiOperation({
    summary:
      'Processes the caller is responsible for, with full stage progress',
  })
  responsibilities(
    @CurrentUser() user: User,
  ): ReturnType<MyWorkService['responsibilities']> {
    return this.service.responsibilities(user);
  }
}
