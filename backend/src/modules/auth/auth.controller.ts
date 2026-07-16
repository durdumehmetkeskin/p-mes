import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSION_KEYS } from '../roles/permission.catalog';
import { SystemRole } from '../roles/enums/system-role.enum';
import { User } from '../users/entities/user.entity';
import { AuthService, AuthTokens } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

interface ForgotPasswordResponse {
  success: true;
  // Only populated outside production (no email service wired up yet).
  resetToken?: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate and receive access + refresh tokens' })
  login(@Body() dto: LoginDto): Promise<AuthTokens> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate a refresh token for a new token pair' })
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokens> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a refresh token' })
  logout(@Body() dto: RefreshTokenDto): Promise<void> {
    return this.authService.logout(dto.refreshToken);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request a password reset token (always succeeds)',
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponse> {
    const token = await this.authService.forgotPassword(dto.email);

    if (token) {
      // Stand-in for sending an email until a mailer is configured.
      this.logger.log(`Password reset token for ${dto.email}: ${token}`);
    }

    const isProduction =
      this.config.get<string>('app.environment') === 'production';

    // Never reveal whether the email exists; only expose the token in dev.
    return {
      success: true,
      ...(token && !isProduction ? { resetToken: token } : {}),
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set a new password using a reset token' })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    return this.authService.resetPassword(dto.token, dto.password);
  }

  // Protected by the global JwtAuthGuard; returns the authenticated user.
  @Get('me')
  @UseInterceptors(ClassSerializerInterceptor)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  me(@CurrentUser() user: User): User {
    // Attach the user's effective permissions (Admin → all) for UI gating.
    const roles = user.roles ?? [];
    const isAdmin = roles.some((r) => r.name === SystemRole.Admin);
    const permissions = isAdmin
      ? [...PERMISSION_KEYS]
      : [...new Set(roles.flatMap((r) => r.permissions ?? []))];
    (user as User & { permissions: string[] }).permissions = permissions;
    return user;
  }
}
