import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { RefreshTokenRepository } from './refresh-token.repository';

export interface RotationResult {
  user: User;
  refreshToken: string;
}

/**
 * Issues, rotates and revokes opaque refresh tokens. Tokens are high-entropy
 * random strings; only their SHA-256 hash is persisted, so lookups are a
 * single indexed query (no need for a slow per-row bcrypt scan).
 */
@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly repository: RefreshTokenRepository,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
  ) {}

  /** Create a new refresh token for a user and return the raw value. */
  async issue(user: User): Promise<string> {
    const raw = randomBytes(48).toString('base64url');
    const ttlDays = this.config.get<number>('auth.refreshTtlDays', 7);

    const token = this.repository.create({
      userId: user.id,
      tokenHash: this.hash(raw),
      expiresAt: new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000),
    });
    await this.repository.save(token);

    return raw;
  }

  /**
   * Validate a refresh token and rotate it: the presented token is revoked and
   * a fresh one is issued. Detects reuse of an already-revoked token and, in
   * that case, revokes the user's entire active token family.
   */
  async rotate(raw: string): Promise<RotationResult> {
    const record = await this.repository.findByHash(this.hash(raw));
    if (!record) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const now = new Date();

    if (record.revokedAt) {
      // Reuse of a revoked token — treat the whole family as compromised.
      await this.repository.revokeAllForUser(record.userId, now);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (record.expiresAt.getTime() <= now.getTime()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const user = await this.usersService.findById(record.userId);
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    record.revokedAt = now;
    await this.repository.save(record);

    const refreshToken = await this.issue(user);
    return { user, refreshToken };
  }

  /** Revoke a single refresh token (logout). Silent if already gone. */
  async revoke(raw: string): Promise<void> {
    const record = await this.repository.findByHash(this.hash(raw));
    if (record && !record.revokedAt) {
      record.revokedAt = new Date();
      await this.repository.save(record);
    }
  }

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
