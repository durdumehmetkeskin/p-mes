import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { User } from '../users/entities/user.entity';
import { SetProjectMaterialReorderDto } from './dto/set-project-material-reorder.dto';
import { ProjectMaterialReorder } from './entities/project-material-reorder.entity';
import { ProjectMaterialReordersService } from './project-material-reorders.service';
import { ProjectsService } from './projects.service';

/**
 * Per-project material reorder levels. Scoped to a project the caller may
 * access (ProjectsService.findOneForUser → 404 for non-members).
 */
@ApiTags('project-material-reorders')
@ApiBearerAuth('access-token')
@Controller('project-material-reorders')
export class ProjectMaterialReordersController {
  constructor(
    private readonly service: ProjectMaterialReordersService,
    private readonly projects: ProjectsService,
  ) {}

  @RequirePermissions('projects:update')
  @Post()
  @ApiOperation({
    summary: "Set (or clear, when 0) a material's reorder level for a project",
  })
  async set(
    @Body() dto: SetProjectMaterialReorderDto,
    @CurrentUser() user: User,
  ): Promise<ProjectMaterialReorder | null> {
    await this.projects.findOneForUser(dto.projectId, user); // 404 non-members
    return this.service.set(dto);
  }
}
