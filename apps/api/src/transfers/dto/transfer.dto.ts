import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { MONEY_MESSAGE, MONEY_PATTERN } from '../../common/money';

export class CreateTransferDto {
  @ApiProperty() @IsUUID() sourceAccountId!: string;
  @ApiProperty() @IsUUID() destinationAccountId!: string;
  @ApiProperty({ example: '100.00' })
  @Matches(MONEY_PATTERN, { message: MONEY_MESSAGE })
  amount!: string;
  @ApiProperty({ format: 'date' }) @IsDateString({ strict: true }) transactionDate!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(250) description?: string;
}
export class UpdateTransferDto extends PartialType(CreateTransferDto) {}
export class TransferQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  from?: string;
  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString({ strict: true })
  to?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() accountId?: string;
}
