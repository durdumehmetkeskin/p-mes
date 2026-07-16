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
import { CreateCustomerDto } from './dto/create-customer.dto';
import { ListQueryDto } from './dto/list-query.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';
import { CustomersService } from './customers.service';
import { resolveListQuery } from '../../common/query/list-query.util';

const SORTABLE: ReadonlyArray<keyof Customer> = [
  'code',
  'name',
  'isActive',
  'createdAt',
  'updatedAt',
];

@ApiTags('customers')
@ApiBearerAuth('access-token')
@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @RequirePermissions('customers:read')
  @Get()
  @ApiOperation({ summary: 'List customers (paginated)' })
  async findAll(
    @Query() query: ListQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Customer[]> {
    const opts = resolveListQuery<Customer>(query, SORTABLE, 'code', 'ASC');
    const [items, total] = await this.service.findPaginated({
      ...opts,
      q: query.q,
    });
    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('customers:read')
  @Get(':id')
  @ApiOperation({ summary: 'Get a customer by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Customer> {
    return this.service.findOne(id);
  }

  @RequirePermissions('customers:create')
  @Post()
  @ApiOperation({ summary: 'Create a customer' })
  create(@Body() dto: CreateCustomerDto): Promise<Customer> {
    return this.service.create(dto);
  }

  @RequirePermissions('customers:update')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a customer' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ): Promise<Customer> {
    return this.service.update(id, dto);
  }

  @RequirePermissions('customers:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a customer' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
