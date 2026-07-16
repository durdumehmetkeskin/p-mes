import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { Contact } from './entities/contact.entity';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly repo: Repository<Contact>,
  ) {}

  async create(dto: CreateContactDto): Promise<Contact> {
    const saved = await this.repo.save(this.repo.create(dto));
    return this.findOne(saved.id);
  }

  findPaginated(options: {
    skip?: number;
    take?: number;
    sort: keyof Contact;
    order: 'ASC' | 'DESC';
    customerId?: string;
  }): Promise<[Contact[], number]> {
    const where: FindOptionsWhere<Contact> = {};
    if (options.customerId) {
      where.customerId = options.customerId;
    }
    return this.repo.findAndCount({
      where,
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  async findOne(id: string): Promise<Contact> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) throw new NotFoundException(`Contact ${id} not found`);
    return found;
  }

  async update(id: string, dto: UpdateContactDto): Promise<Contact> {
    const found = await this.findOne(id);
    this.repo.merge(found, dto);
    await this.repo.save(found);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const found = await this.findOne(id);
    await this.repo.softRemove(found);
  }
}
