import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { Role } from './entities/role.entity';
import { SystemRole } from './enums/system-role.enum';
import { PERMISSION_KEYS } from './permission.catalog';
import { RolesRepository } from './roles.repository';

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  async create(dto: CreateRoleDto): Promise<Role> {
    await this.assertNameAvailable(dto.name);
    const role = this.rolesRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      isSystem: false,
    });
    return this.rolesRepository.save(role);
  }

  async findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof Role;
    order: 'ASC' | 'DESC';
  }): Promise<[Role[], number]> {
    const [items, total] = await this.rolesRepository.findAndCount(options);
    return [items.map((r) => this.applyEffective(r)), total];
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.rolesRepository.findById(id);
    if (!role) {
      throw new NotFoundException(`Role ${id} not found`);
    }
    return this.applyEffective(role);
  }

  /** Replace a role's permission set (Admin is immutable / always full). */
  async updatePermissions(id: string, permissions: string[]): Promise<Role> {
    const role = await this.findOne(id);
    if (role.name === SystemRole.Admin) {
      throw new ForbiddenException('Admin permissions cannot be changed');
    }
    const invalid = permissions.filter((p) => !PERMISSION_KEYS.includes(p));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Unknown permissions: ${invalid.join(', ')}`,
      );
    }
    role.permissions = [...new Set(permissions)];
    const saved = await this.rolesRepository.save(role);
    return this.applyEffective(saved);
  }

  /** The Admin role implicitly holds every permission in the catalogue. */
  private applyEffective(role: Role): Role {
    role.permissions =
      role.name === SystemRole.Admin
        ? [...PERMISSION_KEYS]
        : (role.permissions ?? []);
    return role;
  }

  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);

    if (dto.name && dto.name !== role.name) {
      if (role.isSystem) {
        throw new ForbiddenException('System roles cannot be renamed');
      }
      await this.assertNameAvailable(dto.name);
      role.name = dto.name;
    }

    if (dto.description !== undefined) {
      role.description = dto.description;
    }

    return this.rolesRepository.save(role);
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);
    if (role.isSystem) {
      throw new ForbiddenException('System roles cannot be deleted');
    }
    await this.rolesRepository.remove(role);
  }

  /** Resolve role entities by name (used when assigning roles to users). */
  findByNames(names: string[]): Promise<Role[]> {
    return this.rolesRepository.findByNames(names);
  }

  private async assertNameAvailable(name: string): Promise<void> {
    const existing = await this.rolesRepository.findByName(name);
    if (existing) {
      throw new ConflictException(`Role "${name}" already exists`);
    }
  }
}
