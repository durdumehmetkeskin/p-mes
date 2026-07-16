import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Customer } from './entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly repo: Repository<Customer>,
  ) {}

  create(dto: CreateCustomerDto): Promise<Customer> {
    return this.repo.save(this.repo.create(dto));
  }

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof Customer;
    order: 'ASC' | 'DESC';
    q?: string;
  }): Promise<[Customer[], number]> {
    const where: FindOptionsWhere<Customer>[] | undefined = options.q
      ? [{ code: ILike(`%${options.q}%`) }, { name: ILike(`%${options.q}%`) }]
      : undefined;
    return this.repo.findAndCount({
      where,
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  async findOne(id: string): Promise<Customer> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException(`Customer ${id} not found`);
    return found;
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    const found = await this.findOne(id);
    this.repo.merge(found, dto);
    return this.repo.save(found);
  }

  async remove(id: string): Promise<void> {
    const found = await this.findOne(id);
    await this.repo.softRemove(found);
  }
}
