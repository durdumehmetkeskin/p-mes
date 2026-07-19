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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import type { User } from '../users/entities/user.entity';
import { CreateSectionReservationDto } from './dto/create-section-reservation.dto';
import { ListQueryDto } from './dto/list-query.dto';
import { UpdateSectionReservationDto } from './dto/update-section-reservation.dto';
import { SectionReservation } from './entities/section-reservation.entity';
import { resolveListQuery } from '../../common/query/list-query.util';
import { SectionReservationsService } from './section-reservations.service';

const SORTABLE: ReadonlyArray<keyof SectionReservation> = [
  'startDate',
  'endDate',
  'createdAt',
];

@ApiTags('section-reservations')
@ApiBearerAuth('access-token')
@Controller('section-reservations')
export class SectionReservationsController {
  constructor(private readonly service: SectionReservationsService) {}

  @RequirePermissions('section-reservations:read')
  @Get()
  @ApiOperation({
    summary: 'List reservations (filter by section/order/location)',
  })
  async findAll(
    @Query() query: ListQueryDto,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: User,
  ): Promise<SectionReservation[]> {
    const opts = resolveListQuery<SectionReservation>(
      query,
      SORTABLE,
      'startDate',
    );
    const [items, total] = await this.service.findPaginated({
      ...opts,
      sectionId: query.sectionId,
      orderId: query.orderId,
      locationId: query.locationId,
      stageId: query.stageId,
      user,
    });
    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('section-reservations:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a reservation by id' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<SectionReservation> {
    return this.service.findOne(id, user);
  }

  // No @RequirePermissions on the mutations below: the service authorizes
  // admin ∨ section-reservations:* key holders ∨ (stage-linked rows) the
  // owning PROCESS RESPONSIBLE, who plans their process without a global key.
  @Post()
  @ApiOperation({
    summary: 'Reserve a section for an order (responsible/key/admin)',
  })
  create(
    @Body() dto: CreateSectionReservationDto,
    @CurrentUser() user: User,
  ): Promise<SectionReservation> {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a reservation' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSectionReservationDto,
    @CurrentUser() user: User,
  ): Promise<SectionReservation> {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a reservation' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.service.remove(id, user);
  }
}
