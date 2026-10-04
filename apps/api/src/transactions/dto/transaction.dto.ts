import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { DateRangeQueryDto } from '../../common/dto/date-range-query.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { MONEY_MESSAGE, MONEY_PATTERN } from '../../common/money';
import { TransactionType } from '../../generated/prisma/enums';

export class CreateTransactionDto {
  @ApiProperty() @IsUUID() accountId!: string;
  @ApiProperty() @IsUUID() categoryId!: string;
  @ApiProperty({ enum: TransactionType }) @IsEnum(TransactionType) type!: TransactionType;
  @ApiProperty({ example: '59.90' })
  @Matches(MONEY_PATTERN, { message: MONEY_MESSAGE })
  amount!: string;
  @ApiProperty({ format: 'date' }) @IsDateString({ strict: true }) transactionDate!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(250) description!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}

export class TransactionQueryDto extends PaginationQueryDto implements DateRangeQueryDto {
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  from?: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  to?: string;
  @ApiPropertyOptional({ enum: TransactionType })
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;
  @ApiPropertyOptional() @IsOptional() @IsUUID() accountId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() createdByUserId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) search?: string;
}
