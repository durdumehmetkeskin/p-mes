import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

/**
 * Encapsulates all data-access for users. Keeps query logic out of the
 * service so business code stays focused and the persistence layer is
 * mockable in tests.
 */
@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  create(data: Partial<User>): User {
    return this.repo.create(data);
  }

  save(user: User): Promise<User> {
    return this.repo.save(user);
  }

  findAll(): Promise<User[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  /** Paginated + sorted lookup returning the page and the total row count. */
  findAndCount(options: {
    skip?: number;
    take?: number;
    sort: keyof User;
    order: 'ASC' | 'DESC';
  }): Promise<[User[], number]> {
    return this.repo.findAndCount({
      skip: options.skip,
      take: options.take,
      order: { [options.sort]: options.order },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
  }

  // Entity-based soft remove (not the query-builder softDelete) so persistence
  // subscribers — e.g. the audit log — fire for the deletion.
  softRemove(user: User): Promise<User> {
    return this.repo.softRemove(user);
  }
}
