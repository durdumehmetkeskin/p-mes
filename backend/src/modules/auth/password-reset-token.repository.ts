import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordResetToken } from './entities/password-reset-token.entity';

@Injectable()
export class PasswordResetTokenRepository {
  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly repo: Repository<PasswordResetToken>,
  ) {}

  create(data: Partial<PasswordResetToken>): PasswordResetToken {
    return this.repo.create(data);
  }

  save(token: PasswordResetToken): Promise<PasswordResetToken> {
    return this.repo.save(token);
  }

  findByHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return this.repo.findOne({ where: { tokenHash } });
  }
}
