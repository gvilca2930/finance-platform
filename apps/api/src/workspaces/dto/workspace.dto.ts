import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  InvitationStatus,
  WorkspaceMemberStatus,
  WorkspaceRole,
  WorkspaceType,
} from '../../generated/prisma/enums';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;
const upper = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CreateWorkspaceDto {
  @ApiProperty({ example: 'Mi negocio' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name!: string;
  @ApiProperty({ enum: WorkspaceType }) @IsEnum(WorkspaceType) type!: WorkspaceType;
  @ApiPropertyOptional({ default: 'PEN' })
  @Transform(upper)
  @IsOptional()
  @Matches(/^[A-Z]{3}$/)
  currencyCode?: string;
  @ApiPropertyOptional({ default: 'PE' })
  @Transform(upper)
  @IsOptional()
  @Matches(/^[A-Z]{2}$/)
  countryCode?: string;
  @ApiPropertyOptional({ default: 'America/Lima' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateWorkspaceDto extends PartialType(
  OmitType(CreateWorkspaceDto, ['type'] as const),
) {}

export class BusinessProfileDto {
  @ApiProperty() @Transform(trim) @IsString() @MinLength(1) @MaxLength(200) legalName!: string;
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tradeName?: string;
  @ApiPropertyOptional({ description: 'RUC for Peruvian businesses' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;
  @ApiPropertyOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  email?: string;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;
  @ApiPropertyOptional({ default: 'PE' })
  @Transform(upper)
  @IsOptional()
  @Matches(/^[A-Z]{2}$/)
  countryCode?: string;
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string;
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;
}

export class UpdateBusinessProfileDto extends PartialType(BusinessProfileDto) {}

export class UpdateMemberDto {
  @ApiPropertyOptional({ enum: WorkspaceRole })
  @IsOptional()
  @IsEnum(WorkspaceRole)
  role?: WorkspaceRole;
  @ApiPropertyOptional({ enum: WorkspaceMemberStatus })
  @IsOptional()
  @IsEnum(WorkspaceMemberStatus)
  status?: WorkspaceMemberStatus;
}

export class CreateInvitationDto {
  @ApiProperty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(320)
  email!: string;
  @ApiProperty({ enum: [WorkspaceRole.ADMIN, WorkspaceRole.STAFF, WorkspaceRole.VIEWER] })
  @IsEnum(WorkspaceRole)
  role!: WorkspaceRole;
  @ApiPropertyOptional({ default: 7, minimum: 1, maximum: 30 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays = 7;
}

export class AcceptInvitationDto {
  @ApiProperty({ writeOnly: true }) @IsString() @MinLength(20) token!: string;
}

export class InvitationWorkspaceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: WorkspaceType }) type!: WorkspaceType;
}

export class InvitationSenderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
}

export class MyInvitationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ type: InvitationWorkspaceResponseDto })
  workspace!: InvitationWorkspaceResponseDto;
  @ApiProperty({ enum: WorkspaceRole }) role!: WorkspaceRole;
  @ApiProperty({ enum: InvitationStatus }) status!: InvitationStatus;
  @ApiProperty({ format: 'date-time' }) expiresAt!: Date;
  @ApiProperty({ format: 'date-time' }) createdAt!: Date;
  @ApiPropertyOptional({ type: InvitationSenderResponseDto })
  invitedBy?: InvitationSenderResponseDto;
}

export class AccountAccessDto {
  @ApiProperty({ type: [String] }) @IsArray() @IsUUID('4', { each: true }) userIds!: string[];
}
