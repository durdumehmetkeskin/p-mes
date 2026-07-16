import {
  Body,
  ClassSerializerInterceptor,
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
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

// Columns the list endpoint is allowed to sort by (guards against injection).
const SORTABLE_FIELDS: ReadonlyArray<keyof User> = [
  'id',
  'email',
  'name',
  'createdAt',
  'updatedAt',
];

@ApiTags('users')
@Controller('users')
@UseInterceptors(ClassSerializerInterceptor) // applies @Exclude on the entity
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public() // self-registration is open; other user routes require a JWT
  @Post()
  @ApiOperation({ summary: 'Register a new user (public)' })
  create(@Body() dto: CreateUserDto): Promise<User> {
    return this.usersService.create(dto);
  }

  @RequirePermissions('users:read') // listing all users is restricted
  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List users (paginated, admin only)' })
  async findAll(
    @Query() query: ListUsersQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<User[]> {
    const skip = query._start ?? 0;
    const take =
      query._end !== undefined ? Math.max(query._end - skip, 0) : undefined;
    const sort = SORTABLE_FIELDS.includes(query._sort as keyof User)
      ? (query._sort as keyof User)
      : 'createdAt';
    const order = query._order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [items, total] = await this.usersService.findPaginated({
      skip,
      take,
      sort,
      order,
    });

    // Refine's simple-rest provider reads the total from this header.
    res.setHeader('x-total-count', total);
    return items;
  }

  @RequirePermissions('users:read')
  @Get(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get a user by id (admin only)' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<User> {
    return this.usersService.findOne(id);
  }

  @RequirePermissions('users:update')
  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a user incl. role assignment (admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(id, dto);
  }

  @RequirePermissions('users:delete') // deleting users is restricted
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a user (admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.usersService.remove(id);
  }
}
