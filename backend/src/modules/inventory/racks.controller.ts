import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { CreateRackDto } from './dto/create-rack.dto';
import { ListRacksQueryDto } from './dto/list-racks-query.dto';
import { UpdateRackDto } from './dto/update-rack.dto';
import { Rack } from './entities/rack.entity';
import { RacksService } from './racks.service';

const SORTABLE_FIELDS: ReadonlyArray<keyof Rack> = [
  'id',
  'code',
  'name',
  'isActive',
  'createdAt',
  'updatedAt',
];

@ApiTags('racks')
@ApiBearerAuth('access-token')
@Controller('racks')
export class RacksController {
  constructor(private readonly racksService: RacksService) {}

  @RequirePermissions('racks:read')
  @Get()
  @ApiOperation({ summary: 'List racks (paginated, filter by zone)' })
  async findAll(
    @Query() query: ListRacksQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Rack[]> {
    const skip = query._start ?? 0;
    const take =
      query._end !== undefined ? Math.max(query._end - skip, 0) : undefined;
    const sort = SORTABLE_FIELDS.includes(query._sort as keyof Rack)
      ? (query._sort as keyof Rack)
      : 'createdAt';
    const order = query._order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [items, total] = await this.racksService.findPaginated({
      skip,
      take,
      sort,
      order,
      q: query.q,
      zoneId: query.zoneId,
      orderId: query.orderId,
    });

    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('racks:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a rack by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Rack> {
    return this.racksService.findOne(id);
  }

  @RequirePermissions('racks:create')
  @Post()
  @ApiOperation({ summary: 'Create a rack (admin only)' })
  create(@Body() dto: CreateRackDto): Promise<Rack> {
    return this.racksService.create(dto);
  }

  @RequirePermissions('racks:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a rack (admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRackDto,
  ): Promise<Rack> {
    return this.racksService.update(id, dto);
  }

  @RequirePermissions('racks:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a rack (admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.racksService.remove(id);
  }
}
