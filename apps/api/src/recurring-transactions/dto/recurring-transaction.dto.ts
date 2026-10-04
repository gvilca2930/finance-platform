import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { MONEY_MESSAGE, MONEY_PATTERN } from '../../common/money';
import { RecurrenceFrequency, TransactionType } from '../../generated/prisma/enums';

export class CreateRecurringTransactionDto {
  @ApiProperty() @IsUUID() accountId!: string;
  @ApiProperty() @IsUUID() categoryId!: string;
  @ApiProperty({ enum: TransactionType }) @IsEnum(TransactionType) type!: TransactionType;
  @ApiProperty() @Matches(MONEY_PATTERN, { message: MONEY_MESSAGE }) amount!: string;
  @ApiProperty({ enum: RecurrenceFrequency })
  @IsEnum(RecurrenceFrequency)
  frequency!: RecurrenceFrequency;
  @ApiProperty({ format: 'date' }) @IsDateString({ strict: true }) startDate!: string;
  @ApiProperty({ format: 'date' }) @IsDateString({ strict: true }) nextExecutionDate!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(250) description!: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() active?: boolean;
}
export class UpdateRecurringTransactionDto extends PartialType(CreateRecurringTransactionDto) {}
export class RecurringQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ type: Boolean })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as unknown;
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
