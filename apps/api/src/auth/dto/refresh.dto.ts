import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: 'Refresh token previously issued by the API', writeOnly: true })
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
