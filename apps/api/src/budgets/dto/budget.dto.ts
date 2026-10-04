import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { MONEY_MESSAGE, MONEY_PATTERN } from '../../common/money';

export class CreateBudgetDto {
  @ApiProperty() @IsUUID() categoryId!: string;
  @ApiProperty({ example: '600.00' })
  @Matches(MONEY_PATTERN, { message: MONEY_MESSAGE })
  amount!: string;
  @ApiProperty({ minimum: 1, maximum: 12 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;
  @ApiProperty() @Type(() => Number) @IsInt() @Min(2000) @Max(9999) year!: number;
  @ApiPropertyOptional({ example: '80.00' })
  @IsOptional()
  @Matches(/^(?:100(?:\.0{1,2})?|\d{1,2}(?:\.\d{1,2})?)$/)
  alertPercentage?: string;
}
export class UpdateBudgetDto extends PartialType(CreateBudgetDto) {}
export class BudgetQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @Type(() => Number) @IsOptional() @IsInt() @Min(1) @Max(12) month?: number;
  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(9999)
  year?: number;
}
