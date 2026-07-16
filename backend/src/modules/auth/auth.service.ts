import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { PasswordResetService } from './password-reset.service';
import { RefreshTokenService } from './refresh-token.service';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  /** Verifies credentials against the stored bcrypt hash. */
  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      // Same message for both cases to avoid user enumeration.
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.validateUser(dto.email, dto.password);
    const refreshToken = await this.refreshTokenService.issue(user);
    return this.buildTokens(user, refreshToken);
  }

  /** Exchange a valid refresh token for a new access + refresh token pair. */
  async refresh(rawRefreshToken: string): Promise<AuthTokens> {
    const { user, refreshToken } =
      await this.refreshTokenService.rotate(rawRefreshToken);
    return this.buildTokens(user, refreshToken);
  }

  async logout(rawRefreshToken: string): Promise<void> {
    await this.refreshTokenService.revoke(rawRefreshToken);
  }

  /** Returns the raw reset token (to be emailed), or null if email unknown. */
  forgotPassword(email: string): Promise<string | null> {
    return this.passwordResetService.issue(email);
  }

  resetPassword(token: string, password: string): Promise<void> {
    return this.passwordResetService.reset(token, password);
  }

  private buildTokens(user: User, refreshToken: string): AuthTokens {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.config.get<string>('auth.jwtExpiresIn', '15m'),
    };
  }
}
