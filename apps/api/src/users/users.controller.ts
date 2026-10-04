import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/auth-user';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { SafeUser } from './user.presenter';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated user and profile' })
  @ApiOkResponse({ description: 'Current user without authentication secrets' })
  getMe(@CurrentUser() currentUser: AuthenticatedUser): Promise<SafeUser> {
    return this.usersService.getCurrentUser(currentUser.userId);
  }

  @Patch('me/profile')
  @ApiOperation({ summary: 'Update editable fields in the current user profile' })
  @ApiOkResponse({ description: 'Updated user and profile' })
  updateProfile(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<SafeUser> {
    return this.usersService.updateProfile(currentUser.userId, dto);
  }
}
