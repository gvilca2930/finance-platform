import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from './decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService, type LoginResponse } from './auth.service';
import type { AuthenticatedUser } from './types/auth-user';
import type { SafeUser } from '../users/user.presenter';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a user and profile' })
  @ApiCreatedResponse({ description: 'User registered without authentication secrets' })
  @ApiConflictResponse({ description: 'Email already exists' })
  register(@Body() dto: RegisterDto): Promise<SafeUser> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate and create an AuthSession' })
  @ApiOkResponse({ description: 'Access token, rotating refresh token, and safe user' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate a refresh token and issue a new token pair' })
  @ApiOkResponse({ description: 'New access and refresh tokens' })
  @ApiUnauthorizedResponse({ description: 'Invalid, expired, reused, or revoked refresh token' })
  refresh(@Body() dto: RefreshDto): Promise<Omit<LoginResponse, 'user'>> {
    return this.authService.refresh(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Revoke the current AuthSession' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Session revoked' })
  async logout(@CurrentUser() currentUser: AuthenticatedUser): Promise<void> {
    await this.authService.logout(currentUser);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get the authenticated user and profile' })
  @ApiOkResponse({ description: 'Current user without authentication secrets' })
  me(@CurrentUser() currentUser: AuthenticatedUser): Promise<SafeUser> {
    return this.authService.me(currentUser.userId);
  }
}
