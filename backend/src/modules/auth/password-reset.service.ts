import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { PasswordResetTokenRepository } from './password-reset-token.repository';
import { RefreshTokenRepository } from './refresh-token.repository';

/**
 * Issues and consumes single-use password reset tokens. Only the SHA-256 hash
 * is persisted (indexed lookup). Resetting a password also revokes every
 * active refresh token for the user, so existing sessions are invalidated.
 */
@Injectable()
export class PasswordResetService {
  constructor(
    private readonly repository: PasswordResetTokenRepository,
    private readonly usersService: UsersService,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly config: ConfigService,
  ) {}

  /**
   * Create a reset token for the account, if one exists. Returns the raw token
   * (to be emailed) or null when the email is unknown — the caller must not
   * reveal which case occurred (avoids user enumeration).
   */
  async issue(email: string): Promise<string | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return null;
    }

    const raw = randomBytes(32).toString('base64url');
    const ttlMinutes = this.config.get<number>(
      'auth.passwordResetTtlMinutes',
      60,
    );

    const token = this.repository.create({
      userId: user.id,
      tokenHash: this.hash(raw),
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
    });
    await this.repository.save(token);

    return raw;
  }

  /** Consume a reset token and set the new password. */
  async reset(raw: string, newPassword: string): Promise<void> {
    const record = await this.repository.findByHash(this.hash(raw));
    const now = new Date();

    if (
      !record ||
      record.usedAt ||
      record.expiresAt.getTime() <= now.getTime()
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    await this.usersService.setPassword(record.userId, newPassword);

    record.usedAt = now;
    await this.repository.save(record);

    // Invalidate all existing sessions after a password change.
    await this.refreshTokenRepository.revokeAllForUser(record.userId, now);
  }

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
