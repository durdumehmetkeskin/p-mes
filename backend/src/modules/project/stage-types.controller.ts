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
import { CreateStageTypeDto } from './dto/create-stage-type.dto';
import { ListQueryDto } from './dto/list-query.dto';
import { UpdateStageTypeDto } from './dto/update-stage-type.dto';
import { StageType } from './entities/stage-type.entity';
import { StageTypesService } from './stage-types.service';
import { resolveListQuery } from '../../common/query/list-query.util';

const SORTABLE: ReadonlyArray<keyof StageType> = ['code', 'name', 'createdAt'];

@ApiTags('stage-types')
@ApiBearerAuth('access-token')
@Controller('stage-types')
export class StageTypesController {
  constructor(private readonly service: StageTypesService) {}

  @RequirePermissions('stage-types:read')
  @Get()
  @ApiOperation({ summary: 'List the stage-type catalog (filter by category)' })
  async findAll(
    @Query() query: ListQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StageType[]> {
    const opts = resolveListQuery<StageType>(query, SORTABLE, 'code', 'ASC');
    const [items, total] = await this.service.findPaginated({
      ...opts,
      categoryId: query.categoryId,
      projectId: query.projectId,
    });
    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('stage-types:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a stage type by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<StageType> {
    return this.service.findOne(id);
  }

  @RequirePermissions('stage-types:create')
  @Post()
  @ApiOperation({ summary: 'Create a stage type (admin only)' })
  create(@Body() dto: CreateStageTypeDto): Promise<StageType> {
    return this.service.create(dto);
  }

  @RequirePermissions('stage-types:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a stage type (admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStageTypeDto,
  ): Promise<StageType> {
    return this.service.update(id, dto);
  }

  @RequirePermissions('stage-types:delete')
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a stage type (admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
