import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductType } from './entities/product-type.entity';

@Injectable()
export class ProductTypesRepository {
  constructor(
    @InjectRepository(ProductType)
    private readonly repo: Repository<ProductType>,
  ) {}

  create(data: Partial<ProductType>): ProductType {
    return this.repo.create(data);
  }

  save(type: ProductType): Promise<ProductType> {
    return this.repo.save(type);
  }

  findAndCount(options: {
    skip?: number;
    take?: number;
    sort: keyof ProductType;
    order: 'ASC' | 'DESC';
  }): Promise<[ProductType[], number]> {
    return this.repo.findAndCount({
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  findById(id: string): Promise<ProductType | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByName(name: string): Promise<ProductType | null> {
    return this.repo.findOne({ where: { name } });
  }

  // Entity-based soft remove so persistence subscribers (audit log) fire.
  softRemove(type: ProductType): Promise<ProductType> {
    return this.repo.softRemove(type);
  }
}
