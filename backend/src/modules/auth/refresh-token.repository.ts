import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repo: Repository<RefreshToken>,
  ) {}

  create(data: Partial<RefreshToken>): RefreshToken {
    return this.repo.create(data);
  }

  save(token: RefreshToken): Promise<RefreshToken> {
    return this.repo.save(token);
  }

  findByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.repo.findOne({ where: { tokenHash } });
  }

  /** Revoke every still-active token for a user (logout-all / reuse response). */
  async revokeAllForUser(userId: string, when: Date): Promise<void> {
    await this.repo.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: when },
    );
  }
}
