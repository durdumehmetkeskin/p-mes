import {
  Body,
  Controller,
  Delete,
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
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CreateStageTypeCategoryDto } from './dto/create-stage-type-category.dto';
import { ListQueryDto } from './dto/list-query.dto';
import { UpdateStageTypeCategoryDto } from './dto/update-stage-type-category.dto';
import { StageTypeCategory } from './entities/stage-type-category.entity';
import { StageTypeCategoriesService } from './stage-type-categories.service';
import { resolveListQuery } from '../../common/query/list-query.util';

const SORTABLE: ReadonlyArray<keyof StageTypeCategory> = [
  'code',
  'name',
  'sortOrder',
  'createdAt',
];

@ApiTags('stage-type-categories')
@ApiBearerAuth('access-token')
@Controller('stage-type-categories')
export class StageTypeCategoriesController {
  constructor(private readonly service: StageTypeCategoriesService) {}

  @RequirePermissions('stage-type-categories:read')
  @Get()
  @ApiOperation({ summary: 'List stage-type categories' })
  async findAll(
    @Query() query: ListQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StageTypeCategory[]> {
    const opts = resolveListQuery<StageTypeCategory>(
      query,
      SORTABLE,
      'sortOrder',
      'ASC',
    );
    const [items, total] = await this.service.findPaginated({
      ...opts,
      projectId: query.projectId,
    });
    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('stage-type-categories:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a stage-type category by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<StageTypeCategory> {
    return this.service.findOne(id);
  }

  @RequirePermissions('stage-type-categories:create')
  @Post()
  @ApiOperation({ summary: 'Create a stage-type category (admin only)' })
  create(@Body() dto: CreateStageTypeCategoryDto): Promise<StageTypeCategory> {
    return this.service.create(dto);
  }

  @RequirePermissions('stage-type-categories:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a stage-type category (admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStageTypeCategoryDto,
  ): Promise<StageTypeCategory> {
    return this.service.update(id, dto);
  }

  @RequirePermissions('stage-type-categories:delete')
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a stage-type category (admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
