import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkspaceRoles } from '../workspaces/decorators/workspace-roles.decorator';
import { WorkspaceAccessGuard } from '../workspaces/guards/workspace-access.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceAccessGuard)
@Controller('workspaces/:workspaceId/categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}
  @Post() @WorkspaceRoles('OWNER', 'ADMIN') create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.service.create(workspaceId, dto);
  }
  @Get() @WorkspaceRoles('OWNER', 'ADMIN', 'STAFF', 'VIEWER') list(
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.service.list(workspaceId);
  }
  @Get(':categoryId') @WorkspaceRoles('OWNER', 'ADMIN', 'STAFF', 'VIEWER') get(
    @Param('workspaceId') workspaceId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.service.get(workspaceId, categoryId);
  }
  @Patch(':categoryId') @WorkspaceRoles('OWNER', 'ADMIN') update(
    @Param('workspaceId') workspaceId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.service.update(workspaceId, categoryId, dto);
  }
  @Delete(':categoryId') @HttpCode(HttpStatus.NO_CONTENT) @WorkspaceRoles('OWNER', 'ADMIN') remove(
    @Param('workspaceId') workspaceId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.service.remove(workspaceId, categoryId);
  }
}
