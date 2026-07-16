import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Like, Repository } from 'typeorm';
import { Material } from './entities/material.entity';

@Injectable()
export class MaterialsRepository {
  constructor(
    @InjectRepository(Material)
    private readonly repo: Repository<Material>,
  ) {}

  create(data: Partial<Material>): Material {
    return this.repo.create(data);
  }

  save(material: Material): Promise<Material> {
    return this.repo.save(material);
  }

  findAndCount(options: {
    skip?: number;
    take?: number;
    sort: keyof Material;
    order: 'ASC' | 'DESC';
    q?: string;
  }): Promise<[Material[], number]> {
    // Free-text filter matches either code or name (case-insensitive).
    const where: FindOptionsWhere<Material> | FindOptionsWhere<Material>[] =
      options.q
        ? [{ code: ILike(`%${options.q}%`) }, { name: ILike(`%${options.q}%`) }]
        : {};

    return this.repo.findAndCount({
      where,
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  findById(id: string): Promise<Material | null> {
    return this.repo.findOne({ where: { id } });
  }

  /** All codes starting with `prefix` (incl. soft-deleted, for sequencing). */
  async findCodesByPrefix(prefix: string): Promise<string[]> {
    const rows = await this.repo.find({
      where: { code: Like(`${prefix}%`) },
      withDeleted: true,
      select: { code: true },
    });
    return rows.map((r) => r.code);
  }

  // Entity-based soft remove so persistence subscribers (audit log) fire.
  softRemove(material: Material): Promise<Material> {
    return this.repo.softRemove(material);
  }
}
