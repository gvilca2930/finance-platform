import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MONEY_MESSAGE, MONEY_PATTERN } from '../../common/money';
import { FinancialAccountType } from '../../generated/prisma/enums';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateAccountDto {
  @ApiProperty() @Transform(trim) @IsString() @MinLength(1) @MaxLength(150) name!: string;
  @ApiProperty({ enum: FinancialAccountType })
  @IsEnum(FinancialAccountType)
  type!: FinancialAccountType;
  @ApiPropertyOptional({ description: 'Defaults to workspace currency' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @Matches(/^[A-Z]{3}$/)
  currencyCode?: string;
  @ApiPropertyOptional({ example: '1000.00', default: '0.00' })
  @IsOptional()
  @Matches(/^(?:0|\d{1,12})(?:\.\d{1,2})?$/, { message: MONEY_MESSAGE })
  initialBalance?: string;
  @ApiPropertyOptional()
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
  @ApiPropertyOptional({ default: true }) @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateAccountDto extends PartialType(
  OmitType(CreateAccountDto, ['currencyCode'] as const),
) {}

export class PositiveMoneyDto {
  @Matches(MONEY_PATTERN, { message: MONEY_MESSAGE }) amount!: string;
}
