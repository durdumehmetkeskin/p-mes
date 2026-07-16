import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { RefreshTokenRepository } from './refresh-token.repository';
import { RefreshTokenService } from './refresh-token.service';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let repo: jest.Mocked<
    Pick<
      RefreshTokenRepository,
      'create' | 'save' | 'findByHash' | 'revokeAllForUser'
    >
  >;
  let users: jest.Mocked<Pick<UsersService, 'findById'>>;

  beforeEach(async () => {
    repo = {
      create: jest.fn((data) => data as RefreshToken),
      save: jest.fn((t) => Promise.resolve(t)),
      findByHash: jest.fn(),
      revokeAllForUser: jest.fn(),
    };
    users = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: RefreshTokenRepository, useValue: repo },
        { provide: UsersService, useValue: users },
        { provide: ConfigService, useValue: { get: jest.fn(() => 7) } },
      ],
    }).compile();

    service = module.get(RefreshTokenService);
  });

  it('issues a token and persists its hash, not the raw value', async () => {
    const raw = await service.issue({ id: 'u1' } as User);

    expect(raw).toEqual(expect.any(String));
    const saved = repo.save.mock.calls[0][0];
    expect(saved.tokenHash).not.toBe(raw);
    expect(saved.userId).toBe('u1');
    expect(saved.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('rotates a valid token: revokes the old and issues a new one', async () => {
    repo.findByHash.mockResolvedValue({
      id: 't1',
      userId: 'u1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    } as RefreshToken);
    users.findById.mockResolvedValue({ id: 'u1' } as User);

    const result = await service.rotate('some-raw-token');

    expect(result.user.id).toBe('u1');
    expect(result.refreshToken).toEqual(expect.any(String));
    // old token saved with revokedAt set, then a new token saved
    expect(repo.save).toHaveBeenCalledTimes(2);
    expect(repo.save.mock.calls[0][0].revokedAt).toBeInstanceOf(Date);
  });

  it('rejects an unknown token', async () => {
    repo.findByHash.mockResolvedValue(null);
    await expect(service.rotate('x')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an expired token', async () => {
    repo.findByHash.mockResolvedValue({
      id: 't1',
      userId: 'u1',
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    } as RefreshToken);

    await expect(service.rotate('x')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('detects reuse of a revoked token and revokes the whole family', async () => {
    repo.findByHash.mockResolvedValue({
      id: 't1',
      userId: 'u1',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    } as RefreshToken);

    await expect(service.rotate('x')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(repo.revokeAllForUser).toHaveBeenCalledWith('u1', expect.any(Date));
  });
});
