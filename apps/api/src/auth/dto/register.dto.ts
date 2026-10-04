import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PASSWORD_MIN_LENGTH, PASSWORD_PATTERN, PASSWORD_POLICY_MESSAGE } from '../password-policy';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class RegisterDto {
  @ApiProperty({ example: 'usuario@example.com' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ format: 'password', minLength: PASSWORD_MIN_LENGTH, writeOnly: true })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(255)
  @Matches(PASSWORD_PATTERN, { message: PASSWORD_POLICY_MESSAGE })
  password!: string;

  @ApiProperty({ maxLength: 100 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ maxLength: 100 })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  paternalLastName!: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  middleName?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  maternalLastName?: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  secondaryPhone?: string;

  @ApiPropertyOptional({ type: String, format: 'date', example: '1990-01-31' })
  @Type(() => Date)
  @IsOptional()
  @IsDate()
  birthDate?: Date;

  @ApiPropertyOptional({ maxLength: 30 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(30)
  documentType?: string;

  @ApiPropertyOptional({ maxLength: 50 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  documentNumber?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  province?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional({ default: 'PE' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @Matches(/^[A-Z]{2}$/)
  countryCode?: string;

  @ApiPropertyOptional({ default: 'PEN' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @Matches(/^[A-Z]{3}$/)
  preferredCurrency?: string;

  @ApiPropertyOptional({ default: 'America/Lima', maxLength: 64 })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ default: 'es', enum: ['es', 'en'] })
  @Transform(trim)
  @IsOptional()
  @IsIn(['es', 'en'])
  language?: string;
}
