import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationStorage } from './entities/location-storage.entity';
import { Location } from './entities/location.entity';
import { StorageRack } from './entities/storage-rack.entity';

/** The storage payload: the location-owned storage area + its racks. */
export interface LocationStorageView {
  storage: LocationStorage;
  racks: StorageRack[];
}

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location) private readonly repo: Repository<Location>,
    @InjectRepository(LocationStorage)
    private readonly storages: Repository<LocationStorage>,
    @InjectRepository(StorageRack)
    private readonly storageRacks: Repository<StorageRack>,
  ) {}

  async create(dto: CreateLocationDto): Promise<Location> {
    const location = await this.repo.save(this.repo.create(dto));
    // Every location owns exactly one storage area (a Section-like child —
    // completely separate from the inventory Warehouse entity).
    await this.ensureStorageFor(location.id);
    return location;
  }

  async update(id: string, dto: UpdateLocationDto): Promise<Location> {
    const found = await this.findOne(id);
    Object.assign(found, dto);
    return this.repo.save(found);
  }

  /** Leaf-first: a location with racks in its storage area cannot be deleted. */
  async remove(id: string): Promise<void> {
    const found = await this.findOne(id);
    const storage = await this.storages.findOne({
      where: { locationId: id },
      loadEagerRelations: false,
    });
    if (storage) {
      const rackCount = await this.storageRacks.count({
        where: { storageId: storage.id },
      });
      if (rackCount > 0) {
        throw new ConflictException(
          'Bu lokasyon silinemez: depo alanında raflar var. Önce rafları silin.',
        );
      }
      await this.storages.softRemove(storage);
    }
    await this.repo.softRemove(found);
  }

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof Location;
    order: 'ASC' | 'DESC';
    q?: string;
  }): Promise<[Location[], number]> {
    const where: FindOptionsWhere<Location>[] | undefined = options.q
      ? [{ code: ILike(`%${options.q}%`) }, { name: ILike(`%${options.q}%`) }]
      : undefined;
    return this.repo.findAndCount({
      where,
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  async findOne(id: string): Promise<Location> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException(`Location ${id} not found`);
    return found;
  }

  /**
   * The location's storage area + racks. Self-heals (idempotently creates the
   * storage row) so locations that predate the feature keep working.
   */
  async getStorage(locationId: string): Promise<LocationStorageView> {
    const storage = await this.ensureStorageFor(locationId);
    const racks = await this.storageRacks.find({
      where: { storageId: storage.id },
      order: { code: 'ASC' },
    });
    return { storage, racks };
  }

  /** Idempotently create (or return) the location's storage area. */
  async ensureStorageFor(locationId: string): Promise<LocationStorage> {
    const location = await this.findOne(locationId);
    const existing = await this.storages.findOne({
      where: { locationId: location.id },
      loadEagerRelations: false,
    });
    if (existing) return existing;
    const sanitized =
      location.code.replace(/[^A-Za-z0-9_-]/g, '-').replace(/^[_-]+/, '') ||
      'LOKASYON';
    return this.storages.save(
      this.storages.create({
        locationId: location.id,
        code: `DEPO-${sanitized}`.slice(0, 50),
        name: `${location.name} Depo Alanı`,
      }),
    );
  }
}
