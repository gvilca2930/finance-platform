import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class DateRangeQueryDto {
  @ApiPropertyOptional({ format: 'date', example: '2026-09-01' })
  @IsOptional()
  @IsDateString({ strict: true })
  from?: string;

  @ApiPropertyOptional({ format: 'date', example: '2026-09-30' })
  @IsOptional()
  @IsDateString({ strict: true })
  to?: string;
}
