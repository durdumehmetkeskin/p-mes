import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RolesService } from '../roles/roles.service';
import { SystemRole } from '../roles/enums/system-role.enum';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  private static readonly SALT_ROUNDS = 12;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly rolesService: RolesService,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const user = this.usersRepository.create({
      email: dto.email,
      name: dto.name,
      passwordHash: await this.hashPassword(dto.password),
    });
    // Every new account gets the default 'user' role.
    user.roles = await this.rolesService.findByNames([SystemRole.User]);

    return this.usersRepository.save(user);
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.findAll();
  }

  /** Returns a page of users and the total count (for list pagination). */
  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof User;
    order: 'ASC' | 'DESC';
  }): Promise<[User[], number]> {
    return this.usersRepository.findAndCount(options);
  }

  /** Nullable lookup used by auth (no exception on miss). */
  findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  /** Nullable lookup used by auth credential validation. */
  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (dto.email && dto.email !== user.email) {
      const existing = await this.usersRepository.findByEmail(dto.email);
      if (existing) {
        throw new ConflictException('Email already registered');
      }
      user.email = dto.email;
    }

    if (dto.name !== undefined) {
      user.name = dto.name;
    }

    if (dto.password) {
      user.passwordHash = await this.hashPassword(dto.password);
    }

    if (dto.roles) {
      const roles = await this.rolesService.findByNames(dto.roles);
      if (roles.length !== dto.roles.length) {
        throw new BadRequestException('One or more roles do not exist');
      }
      user.roles = roles;
    }

    return this.usersRepository.save(user);
  }

  /** Set a new password (used by the password-reset flow). */
  async setPassword(id: string, password: string): Promise<User> {
    const user = await this.findOne(id);
    user.passwordHash = await this.hashPassword(password);
    return this.usersRepository.save(user);
  }

  /** Replace a user's roles by name (used by seeding and role management). */
  async setRoles(id: string, roleNames: string[]): Promise<User> {
    const user = await this.findOne(id);
    user.roles = await this.rolesService.findByNames(roleNames);
    return this.usersRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id); // throws NotFoundException if missing
    await this.usersRepository.softRemove(user);
  }

  private hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, UsersService.SALT_ROUNDS);
  }
}
