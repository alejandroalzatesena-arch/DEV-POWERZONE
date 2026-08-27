import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: 'Email del cliente', example: 'cliente@example.com' })
  @IsEmail()
  @MaxLength(120)
  email: string;

  @ApiProperty({ description: 'Contraseña (mínimo 8 caracteres)', example: 'SuperSecret123' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @ApiProperty({ description: 'Nombre', example: 'Ana' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ description: 'Apellido', example: 'López' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({ description: 'Teléfono', example: '+52 55 9876 5432' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({ description: 'Gimnasio al que se afilia (multi-tenancy)', example: 'b1b3f3b3-3b3b-3b3b-3b3b-3b3b3b3b3b3b' })
  @IsUUID()
  gymId: string;
}