import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { Section } from './entities/section.entity';

@Injectable()
export class SectionsService {
  constructor(
    @InjectRepository(Section) private readonly repo: Repository<Section>,
  ) {}

  create(dto: CreateSectionDto): Promise<Section> {
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdateSectionDto): Promise<Section> {
    const found = await this.findOne(id);
    Object.assign(found, dto);
    return this.repo.save(found);
  }

  async remove(id: string): Promise<void> {
    const found = await this.findOne(id);
    await this.repo.softRemove(found);
  }

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof Section;
    order: 'ASC' | 'DESC';
    locationId?: string;
  }): Promise<[Section[], number]> {
    const where: FindOptionsWhere<Section> = {};
    if (options.locationId) where.locationId = options.locationId;
    return this.repo.findAndCount({
      where,
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  async findOne(id: string): Promise<Section> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException(`Section ${id} not found`);
    return found;
  }
}
