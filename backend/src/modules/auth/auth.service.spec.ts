import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { RefreshTokenService } from './refresh-token.service';

describe('AuthService', () => {
  let service: AuthService;
  let users: jest.Mocked<Pick<UsersService, 'findByEmail'>>;

  beforeEach(async () => {
    users = { findByEmail: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        {
          provide: JwtService,
          useValue: { sign: jest.fn(() => 'signed.jwt.token') },
        },
        { provide: ConfigService, useValue: { get: jest.fn(() => '15m') } },
        {
          provide: RefreshTokenService,
          useValue: {
            issue: jest.fn(() => Promise.resolve('raw.refresh.token')),
          },
        },
        {
          provide: PasswordResetService,
          useValue: { issue: jest.fn(), reset: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('issues a token for valid credentials', async () => {
    const passwordHash = await bcrypt.hash('supersecret', 4);
    users.findByEmail.mockResolvedValue({
      id: 'uuid',
      email: 'a@b.com',
      passwordHash,
    } as User);

    const result = await service.login({
      email: 'a@b.com',
      password: 'supersecret',
    });

    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.refreshToken).toBe('raw.refresh.token');
    expect(result.tokenType).toBe('Bearer');
  });

  it('rejects an unknown email', async () => {
    users.findByEmail.mockResolvedValue(null);

    await expect(
      service.login({ email: 'x@y.com', password: 'whatever' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a wrong password', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 4);
    users.findByEmail.mockResolvedValue({
      id: 'uuid',
      email: 'a@b.com',
      passwordHash,
    } as User);

    await expect(
      service.login({ email: 'a@b.com', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
