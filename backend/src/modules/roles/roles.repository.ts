import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from './entities/role.entity';

@Injectable()
export class RolesRepository {
  constructor(
    @InjectRepository(Role)
    private readonly repo: Repository<Role>,
  ) {}

  create(data: Partial<Role>): Role {
    return this.repo.create(data);
  }

  save(role: Role): Promise<Role> {
    return this.repo.save(role);
  }

  findAndCount(options: {
    skip?: number;
    take?: number;
    sort: keyof Role;
    order: 'ASC' | 'DESC';
  }): Promise<[Role[], number]> {
    return this.repo.findAndCount({
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  findById(id: string): Promise<Role | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByName(name: string): Promise<Role | null> {
    return this.repo.findOne({ where: { name } });
  }

  findByNames(names: string[]): Promise<Role[]> {
    if (names.length === 0) return Promise.resolve([]);
    return this.repo.find({ where: { name: In(names) } });
  }

  // Entity-based remove so persistence subscribers (audit log) fire.
  remove(role: Role): Promise<Role> {
    return this.repo.remove(role);
  }
}
