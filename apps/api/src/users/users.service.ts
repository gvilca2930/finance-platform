import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { presentUser, type SafeUser } from './user.presenter';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentUser(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return presentUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<SafeUser> {
    const existingProfile = await this.prisma.userProfile.findUnique({ where: { userId } });

    if (!existingProfile) {
      throw new NotFoundException('User profile not found');
    }

    await this.prisma.userProfile.update({
      where: { userId },
      data: dto,
    });

    return this.getCurrentUser(userId);
  }
}
