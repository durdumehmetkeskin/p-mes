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
import { CreateContactDto } from './dto/create-contact.dto';
import { ListQueryDto } from './dto/list-query.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { Contact } from './entities/contact.entity';
import { ContactsService } from './contacts.service';
import { resolveListQuery } from '../../common/query/list-query.util';

const SORTABLE: ReadonlyArray<keyof Contact> = [
  'firstName',
  'lastName',
  'isActive',
  'createdAt',
  'updatedAt',
];

@ApiTags('contacts')
@ApiBearerAuth('access-token')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly service: ContactsService) {}

  @RequirePermissions('contacts:read')
  @Get()
  @ApiOperation({ summary: 'List contacts (paginated, filter by customer)' })
  async findAll(
    @Query() query: ListQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Contact[]> {
    const opts = resolveListQuery<Contact>(query, SORTABLE, 'createdAt');
    const [items, total] = await this.service.findPaginated({
      ...opts,
      customerId: query.customerId,
    });
    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('contacts:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a contact by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Contact> {
    return this.service.findOne(id);
  }

  @RequirePermissions('contacts:create')
  @Post()
  @ApiOperation({ summary: 'Create a contact' })
  create(@Body() dto: CreateContactDto): Promise<Contact> {
    return this.service.create(dto);
  }

  @RequirePermissions('contacts:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a contact' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
  ): Promise<Contact> {
    return this.service.update(id, dto);
  }

  @RequirePermissions('contacts:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a contact' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
