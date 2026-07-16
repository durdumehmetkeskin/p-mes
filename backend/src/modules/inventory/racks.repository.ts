import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { Rack } from './entities/rack.entity';

@Injectable()
export class RacksRepository {
  constructor(
    @InjectRepository(Rack)
    private readonly repo: Repository<Rack>,
  ) {}

  create(data: Partial<Rack>): Rack {
    return this.repo.create(data);
  }

  save(rack: Rack): Promise<Rack> {
    return this.repo.save(rack);
  }

  findAndCount(options: {
    skip?: number;
    take?: number;
    sort: keyof Rack;
    order: 'ASC' | 'DESC';
    q?: string;
    zoneId?: string;
    orderId?: string;
  }): Promise<[Rack[], number]> {
    const base: FindOptionsWhere<Rack> = {};
    if (options.zoneId) base.zoneId = options.zoneId;
    if (options.orderId) base.orderId = options.orderId;

    const where: FindOptionsWhere<Rack> | FindOptionsWhere<Rack>[] = options.q
      ? [
          { ...base, code: ILike(`%${options.q}%`) },
          { ...base, name: ILike(`%${options.q}%`) },
        ]
      : base;

    return this.repo.findAndCount({
      where,
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  findById(id: string): Promise<Rack | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByZoneAndCode(zoneId: string, code: string): Promise<Rack | null> {
    return this.repo.findOne({ where: { zoneId, code } });
  }

  softRemove(rack: Rack): Promise<Rack> {
    return this.repo.softRemove(rack);
  }
}
