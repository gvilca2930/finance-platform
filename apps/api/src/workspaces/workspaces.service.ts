import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { WorkspaceMember } from '../generated/prisma/client';
import { createDefaultCategories } from './default-categories';
import type {
  AcceptInvitationDto,
  BusinessProfileDto,
  CreateInvitationDto,
  CreateWorkspaceDto,
  UpdateBusinessProfileDto,
  UpdateMemberDto,
  UpdateWorkspaceDto,
} from './dto/workspace.dto';

const hashInvitationToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');
const normalizeEmail = (email: string): string => email.trim().toLowerCase();

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateWorkspaceDto) {
    return this.prisma.$transaction(async (transaction) => {
      const workspace = await transaction.workspace.create({
        data: {
          name: dto.name,
          type: dto.type,
          currencyCode: dto.currencyCode ?? 'PEN',
          countryCode: dto.countryCode ?? 'PE',
          timezone: dto.timezone ?? 'America/Lima',
          ...(dto.description === undefined ? {} : { description: dto.description }),
        },
      });
      await transaction.workspaceMember.create({
        data: { workspaceId: workspace.id, userId, role: 'OWNER' },
      });
      await createDefaultCategories(transaction, workspace.id, workspace.type);
      return workspace;
    });
  }

  list(userId: string) {
    return this.prisma.workspaceMember.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        workspace: { status: 'ACTIVE', deletedAt: null },
      },
      include: { workspace: { include: { businessProfile: true } } },
      orderBy: { workspace: { createdAt: 'desc' } },
    });
  }

  async get(workspaceId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, deletedAt: null, status: 'ACTIVE' },
      include: { businessProfile: true, _count: { select: { members: true } } },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }

  async update(workspaceId: string, dto: UpdateWorkspaceDto) {
    await this.get(workspaceId);
    return this.prisma.workspace.update({ where: { id: workspaceId }, data: dto });
  }

  async remove(workspaceId: string): Promise<void> {
    await this.get(workspaceId);
    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
  }

  async getBusinessProfile(workspaceId: string) {
    await this.ensureBusiness(workspaceId);
    const profile = await this.prisma.businessProfile.findUnique({ where: { workspaceId } });
    if (!profile) throw new NotFoundException('Business profile not found');
    return profile;
  }

  async putBusinessProfile(workspaceId: string, dto: BusinessProfileDto) {
    await this.ensureBusiness(workspaceId);
    return this.prisma.businessProfile.upsert({
      where: { workspaceId },
      create: { ...dto, workspaceId, countryCode: dto.countryCode ?? 'PE' },
      update: dto,
    });
  }

  async patchBusinessProfile(workspaceId: string, dto: UpdateBusinessProfileDto) {
    await this.getBusinessProfile(workspaceId);
    return this.prisma.businessProfile.update({ where: { workspaceId }, data: dto });
  }

  listMembers(workspaceId: string) {
    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, email: true, status: true, profile: true } } },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async getMember(workspaceId: string, memberId: string) {
    const member = await this.prisma.workspaceMember.findFirst({
      where: { id: memberId, workspaceId },
      include: { user: { select: { id: true, email: true, status: true, profile: true } } },
    });
    if (!member) throw new NotFoundException('Workspace member not found');
    return member;
  }

  async updateMember(actor: WorkspaceMember, memberId: string, dto: UpdateMemberDto) {
    const target = await this.getMember(actor.workspaceId, memberId);
    const workspace = await this.get(actor.workspaceId);
    if (workspace.type === 'PERSONAL' && dto.role && dto.role !== 'OWNER') {
      throw new BadRequestException('Personal workspaces only support OWNER');
    }
    if (actor.role === 'ADMIN' && (target.role === 'OWNER' || dto.role === 'OWNER')) {
      throw new ForbiddenException('ADMIN cannot modify OWNER memberships');
    }
    if (target.role === 'OWNER' && dto.role && dto.role !== 'OWNER') {
      await this.ensureAnotherOwner(actor.workspaceId, target.id);
    }
    return this.prisma.workspaceMember.update({ where: { id: target.id }, data: dto });
  }

  async removeMember(actor: WorkspaceMember, memberId: string): Promise<void> {
    const target = await this.getMember(actor.workspaceId, memberId);
    if (actor.role === 'ADMIN' && target.role === 'OWNER') {
      throw new ForbiddenException('ADMIN cannot remove OWNER memberships');
    }
    if (target.role === 'OWNER') await this.ensureAnotherOwner(actor.workspaceId, target.id);
    await this.prisma.workspaceMember.delete({ where: { id: target.id } });
  }

  async createInvitation(actor: WorkspaceMember, dto: CreateInvitationDto) {
    const workspace = await this.ensureBusiness(actor.workspaceId);
    if (dto.role === 'OWNER') throw new BadRequestException('Invitations cannot assign OWNER');
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (user) {
      const member = await this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
      });
      if (member) throw new ConflictException('User is already a workspace member');
    }
    await this.prisma.workspaceInvitation.updateMany({
      where: {
        workspaceId: workspace.id,
        email: dto.email,
        status: 'PENDING',
        expiresAt: { lte: new Date() },
      },
      data: { status: 'EXPIRED' },
    });
    const pending = await this.prisma.workspaceInvitation.findFirst({
      where: {
        workspaceId: workspace.id,
        email: dto.email,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });
    if (pending) throw new ConflictException('A pending invitation already exists');

    const token = randomBytes(32).toString('base64url');
    let invitation;
    try {
      invitation = await this.prisma.workspaceInvitation.create({
        data: {
          workspaceId: workspace.id,
          email: dto.email,
          role: dto.role,
          tokenHash: hashInvitationToken(token),
          expiresAt: new Date(Date.now() + dto.expiresInDays * 86_400_000),
          invitedByUserId: actor.userId,
        },
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A pending invitation already exists');
      }
      throw error;
    }
    const { tokenHash: _tokenHash, ...safeInvitation } = invitation;
    return { ...safeInvitation, token };
  }

  async listInvitations(workspaceId: string) {
    await this.prisma.workspaceInvitation.updateMany({
      where: { workspaceId, status: 'PENDING', expiresAt: { lte: new Date() } },
      data: { status: 'EXPIRED' },
    });
    return this.prisma.workspaceInvitation.findMany({
      where: { workspaceId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        expiresAt: true,
        acceptedAt: true,
        createdAt: true,
        invitedByUserId: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listMyInvitations(userEmail: string) {
    const invitations = await this.prisma.workspaceInvitation.findMany({
      where: {
        email: normalizeEmail(userEmail),
        status: 'PENDING',
        expiresAt: { gt: new Date() },
        workspace: { status: 'ACTIVE', deletedAt: null },
      },
      select: {
        id: true,
        role: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        workspace: { select: { id: true, name: true, type: true } },
        invitedBy: {
          select: {
            user: {
              select: {
                id: true,
                profile: {
                  select: {
                    firstName: true,
                    middleName: true,
                    paternalLastName: true,
                    maternalLastName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invitations.map(({ invitedBy, ...invitation }) => {
      const profile = invitedBy.user.profile;
      const name = profile
        ? [
            profile.firstName,
            profile.middleName,
            profile.paternalLastName,
            profile.maternalLastName,
          ]
            .filter(Boolean)
            .join(' ')
        : undefined;
      return {
        ...invitation,
        ...(name ? { invitedBy: { id: invitedBy.user.id, name } } : {}),
      };
    });
  }

  async cancelInvitation(workspaceId: string, invitationId: string): Promise<void> {
    const invitation = await this.prisma.workspaceInvitation.findFirst({
      where: { id: invitationId, workspaceId },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status !== 'PENDING') {
      throw new ConflictException('Only pending invitations can be cancelled');
    }
    await this.prisma.workspaceInvitation.update({
      where: { id: invitation.id },
      data: { status: 'CANCELLED' },
    });
  }

  async acceptInvitation(userId: string, userEmail: string, dto: AcceptInvitationDto) {
    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { tokenHash: hashInvitationToken(dto.token) },
      include: { workspace: true },
    });
    if (!invitation || invitation.status !== 'PENDING') {
      throw new BadRequestException('Invalid invitation');
    }
    if (invitation.expiresAt <= new Date()) {
      await this.prisma.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Invitation has expired');
    }
    if (normalizeEmail(invitation.email) !== normalizeEmail(userEmail)) {
      throw new ForbiddenException('Invitation belongs to another user');
    }
    if (
      invitation.workspace.type !== 'BUSINESS' ||
      invitation.workspace.status !== 'ACTIVE' ||
      invitation.workspace.deletedAt
    ) {
      throw new BadRequestException('Invalid invitation workspace');
    }
    const existingMember = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId } },
    });
    if (existingMember) throw new ConflictException('User is already a workspace member');

    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.workspaceInvitation.updateMany({
        where: { id: invitation.id, status: 'PENDING' },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });
      if (updated.count !== 1) throw new ConflictException('Invitation was already used');
      return transaction.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId,
          role: invitation.role,
        },
      });
    });
  }

  async acceptMyInvitation(userId: string, userEmail: string, invitationId: string) {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const invitation = await transaction.workspaceInvitation.findUnique({
          where: { id: invitationId },
          include: { workspace: true },
        });
        if (!invitation) throw new NotFoundException('Invitation not found');
        if (normalizeEmail(invitation.email) !== normalizeEmail(userEmail)) {
          throw new ForbiddenException('Invitation belongs to another user');
        }
        if (invitation.status !== 'PENDING') {
          throw new ConflictException('Invitation is no longer pending');
        }
        if (invitation.expiresAt <= new Date()) {
          throw new BadRequestException('Invitation has expired');
        }
        if (
          invitation.workspace.type !== 'BUSINESS' ||
          invitation.workspace.status !== 'ACTIVE' ||
          invitation.workspace.deletedAt
        ) {
          throw new BadRequestException('Invalid invitation workspace');
        }
        const existingMember = await transaction.workspaceMember.findUnique({
          where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId } },
        });
        if (existingMember) throw new ConflictException('User is already a workspace member');

        const updated = await transaction.workspaceInvitation.updateMany({
          where: { id: invitation.id, status: 'PENDING', expiresAt: { gt: new Date() } },
          data: { status: 'ACCEPTED', acceptedAt: new Date() },
        });
        if (updated.count !== 1) throw new ConflictException('Invitation was already used');
        return transaction.workspaceMember.create({
          data: { workspaceId: invitation.workspaceId, userId, role: invitation.role },
        });
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('User is already a workspace member');
      }
      throw error;
    }
  }

  async rejectMyInvitation(userEmail: string, invitationId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const invitation = await transaction.workspaceInvitation.findUnique({
        where: { id: invitationId },
        include: { workspace: { select: { id: true, name: true, type: true } } },
      });
      if (!invitation) throw new NotFoundException('Invitation not found');
      if (normalizeEmail(invitation.email) !== normalizeEmail(userEmail)) {
        throw new ForbiddenException('Invitation belongs to another user');
      }
      if (invitation.status !== 'PENDING') {
        throw new ConflictException('Invitation is no longer pending');
      }
      if (invitation.expiresAt <= new Date()) {
        throw new BadRequestException('Invitation has expired');
      }
      const updated = await transaction.workspaceInvitation.updateMany({
        where: { id: invitation.id, status: 'PENDING', expiresAt: { gt: new Date() } },
        data: { status: 'REJECTED' },
      });
      if (updated.count !== 1) throw new ConflictException('Invitation is no longer pending');
      return {
        id: invitation.id,
        workspace: invitation.workspace,
        role: invitation.role,
        status: 'REJECTED' as const,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      };
    });
  }

  private async ensureBusiness(workspaceId: string) {
    const workspace = await this.get(workspaceId);
    if (workspace.type !== 'BUSINESS') {
      throw new BadRequestException(
        'Business profile and invitations require a BUSINESS workspace',
      );
    }
    return workspace;
  }

  private async ensureAnotherOwner(workspaceId: string, excludedMemberId: string): Promise<void> {
    const owners = await this.prisma.workspaceMember.count({
      where: { workspaceId, role: 'OWNER', status: 'ACTIVE', id: { not: excludedMemberId } },
    });
    if (owners === 0) throw new ConflictException('Workspace must keep at least one active OWNER');
  }
}
