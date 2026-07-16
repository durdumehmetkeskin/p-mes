import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductTypeDto } from './dto/create-product-type.dto';
import { UpdateProductTypeDto } from './dto/update-product-type.dto';
import { ProductType } from './entities/product-type.entity';
import { ProductTypesRepository } from './product-types.repository';

@Injectable()
export class ProductTypesService {
  constructor(
    private readonly productTypesRepository: ProductTypesRepository,
  ) {}

  async create(dto: CreateProductTypeDto): Promise<ProductType> {
    await this.assertNameAvailable(dto.name);
    const type = this.productTypesRepository.create(dto);
    return this.productTypesRepository.save(type);
  }

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof ProductType;
    order: 'ASC' | 'DESC';
  }): Promise<[ProductType[], number]> {
    return this.productTypesRepository.findAndCount(options);
  }

  async findOne(id: string): Promise<ProductType> {
    const type = await this.productTypesRepository.findById(id);
    if (!type) {
      throw new NotFoundException(`Product type ${id} not found`);
    }
    return type;
  }

  async update(id: string, dto: UpdateProductTypeDto): Promise<ProductType> {
    const type = await this.findOne(id);

    if (dto.name && dto.name !== type.name) {
      await this.assertNameAvailable(dto.name);
      type.name = dto.name;
    }
    if (dto.description !== undefined) type.description = dto.description;
    if (dto.isActive !== undefined) type.isActive = dto.isActive;

    return this.productTypesRepository.save(type);
  }

  async remove(id: string): Promise<void> {
    const type = await this.findOne(id);
    await this.productTypesRepository.softRemove(type);
  }

  private async assertNameAvailable(name: string): Promise<void> {
    const existing = await this.productTypesRepository.findByName(name);
    if (existing) {
      throw new ConflictException(`Product type "${name}" already exists`);
    }
  }
}
