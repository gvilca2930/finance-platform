import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, dto: CreateCategoryDto) {
    if (dto.parentId) await this.validateParent(workspaceId, dto.parentId, dto.type);
    return this.prisma.category.create({ data: { ...dto, workspaceId } });
  }

  list(workspaceId: string) {
    return this.prisma.category.findMany({
      where: { workspaceId, deletedAt: null },
      include: { children: { where: { deletedAt: null } } },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  async get(workspaceId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, workspaceId, deletedAt: null },
      include: { parent: true, children: { where: { deletedAt: null } } },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(workspaceId: string, categoryId: string, dto: UpdateCategoryDto) {
    const category = await this.get(workspaceId, categoryId);
    const type = dto.type ?? category.type;
    if (dto.parentId) {
      if (dto.parentId === categoryId)
        throw new BadRequestException('Category cannot be its own parent');
      await this.validateParent(workspaceId, dto.parentId, type);
      await this.ensureNoCycle(workspaceId, categoryId, dto.parentId);
    }
    if (dto.type && dto.type !== category.type) {
      const historicalUsage = await this.prisma.$transaction([
        this.prisma.transaction.count({ where: { workspaceId, categoryId } }),
        this.prisma.budget.count({ where: { workspaceId, categoryId } }),
        this.prisma.recurringTransaction.count({ where: { workspaceId, categoryId } }),
      ]);
      if (historicalUsage.some((count) => count > 0)) {
        throw new ConflictException('Category type cannot change after financial use');
      }
      const incompatibleChildren = await this.prisma.category.count({
        where: { workspaceId, parentId: categoryId, deletedAt: null, type: { not: dto.type } },
      });
      if (incompatibleChildren)
        throw new BadRequestException('Child categories must have the same type');
    }
    return this.prisma.category.update({ where: { id: categoryId }, data: dto });
  }

  async remove(workspaceId: string, categoryId: string): Promise<void> {
    await this.get(workspaceId, categoryId);
    const activeChildren = await this.prisma.category.count({
      where: { workspaceId, parentId: categoryId, deletedAt: null },
    });
    if (activeChildren) throw new ConflictException('Delete or move child categories first');
    await this.prisma.category.update({
      where: { id: categoryId },
      data: { deletedAt: new Date(), active: false },
    });
  }

  private async validateParent(workspaceId: string, parentId: string, type: string): Promise<void> {
    const parent = await this.prisma.category.findFirst({
      where: { id: parentId, workspaceId, deletedAt: null },
    });
    if (!parent) throw new BadRequestException('Parent category must belong to the workspace');
    if (parent.type !== type)
      throw new BadRequestException('Parent and child category types must match');
  }

  private async ensureNoCycle(workspaceId: string, categoryId: string, proposedParentId: string) {
    let currentId: string | null = proposedParentId;
    const visited = new Set<string>();
    while (currentId) {
      if (currentId === categoryId || visited.has(currentId)) {
        throw new BadRequestException('Category hierarchy cannot contain cycles');
      }
      visited.add(currentId);
      const current: { parentId: string | null } | null = await this.prisma.category.findFirst({
        where: { id: currentId, workspaceId, deletedAt: null },
        select: { parentId: true },
      });
      currentId = current?.parentId ?? null;
    }
  }
}
