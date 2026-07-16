import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { CreateStorageRackDto } from './dto/create-storage-rack.dto';
import { UpdateStorageRackDto } from './dto/update-storage-rack.dto';
import { StorageRack } from './entities/storage-rack.entity';
import { LocationsService } from './locations.service';

function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; driverError?: { code?: string } };
  return err?.code === '23505' || err?.driverError?.code === '23505';
}

@Injectable()
export class StorageRacksService {
  constructor(
    @InjectRepository(StorageRack)
    private readonly repo: Repository<StorageRack>,
    private readonly locations: LocationsService,
  ) {}

  async create(dto: CreateStorageRackDto): Promise<StorageRack> {
    if (!dto.storageId && !dto.locationId) {
      throw new BadRequestException('storageId or locationId is required');
    }
    // A locationId resolves (and self-heals) the location's storage row.
    const storageId =
      dto.storageId ??
      (await this.locations.ensureStorageFor(dto.locationId as string)).id;
    try {
      const saved = await this.repo.save(
        this.repo.create({
          storageId,
          code: dto.code,
          note: dto.note ?? null,
          isActive: dto.isActive ?? true,
        }),
      );
      return this.findOne(saved.id);
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictException('Bu depoda aynı kodlu raf zaten var.');
      }
      throw e;
    }
  }

  async update(id: string, dto: UpdateStorageRackDto): Promise<StorageRack> {
    const found = await this.findOne(id);
    Object.assign(found, dto);
    try {
      await this.repo.save(found);
    } catch (e) {
      if (isUniqueViolation(e)) {
        throw new ConflictException('Bu depoda aynı kodlu raf zaten var.');
      }
      throw e;
    }
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const found = await this.findOne(id);
    await this.repo.softRemove(found);
  }

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof StorageRack;
    order: 'ASC' | 'DESC';
    q?: string;
    locationId?: string;
    storageId?: string;
  }): Promise<[StorageRack[], number]> {
    const where: FindOptionsWhere<StorageRack> = {};
    if (options.storageId) where.storageId = options.storageId;
    else if (options.locationId) {
      where.storage = { locationId: options.locationId };
    }
    if (options.q) where.code = ILike(`%${options.q}%`);
    return this.repo.findAndCount({
      where,
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  async findOne(id: string): Promise<StorageRack> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException(`Storage rack ${id} not found`);
    return found;
  }
}
