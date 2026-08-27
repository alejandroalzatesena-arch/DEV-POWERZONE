import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ActivityLevel, FitnessGoal, UserGender, UserRole } from '../../../common/enums';

export class CreateUserDto {
  @ApiProperty({ description: 'Email del usuario', example: 'entrenador@powerzone.com' })
  @IsEmail()
  @MaxLength(120)
  email: string;

  @ApiPropertyOptional({ description: 'Contraseña inicial (mínimo 8). Si no se envía se genera una temporal.', example: 'Entrenador123' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;

  @ApiProperty({ description: 'Nombre', example: 'Luis' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ description: 'Apellido', example: 'Ramírez' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ description: 'Rol', enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({ description: 'Teléfono' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Género', enum: UserGender })
  @IsOptional()
  @IsEnum(UserGender)
  gender?: UserGender;

  @ApiPropertyOptional({ description: 'Fecha de nacimiento (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  birthDate?: string;

  @ApiPropertyOptional({ description: 'Gimnasio (solo super admin; por defecto usa el del actor)' })
  @IsOptional()
  @IsUUID()
  gymId?: string;

  @ApiPropertyOptional({ description: 'Estado activo', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // --- Perfil corporal opcional ---
  @ApiPropertyOptional({ description: 'Altura (cm)', example: 175 })
  @IsOptional()
  @IsNumber()
  @Max(250)
  heightCm?: number;

  @ApiPropertyOptional({ description: 'Peso (kg)', example: 80 })
  @IsOptional()
  @IsNumber()
  @Max(300)
  weightKg?: number;

  @ApiPropertyOptional({ description: 'Objetivo', enum: FitnessGoal })
  @IsOptional()
  @IsEnum(FitnessGoal)
  goal?: FitnessGoal;

  @ApiPropertyOptional({ description: 'Nivel de actividad', enum: ActivityLevel })
  @IsOptional()
  @IsEnum(ActivityLevel)
  activityLevel?: ActivityLevel;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Nombre' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Apellido' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Teléfono' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ description: 'Género', enum: UserGender })
  @IsOptional()
  @IsEnum(UserGender)
  gender?: UserGender;

  @ApiPropertyOptional({ description: 'Fecha de nacimiento (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  birthDate?: string;

  @ApiPropertyOptional({ description: 'Rol (solo admin)' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Avatar URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Estado activo' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'Altura (cm)', example: 178 })
  @IsOptional()
  @IsNumber()
  @Max(250)
  heightCm?: number;

  @ApiPropertyOptional({ description: 'Peso (kg)', example: 82.5 })
  @IsOptional()
  @IsNumber()
  @Max(300)
  weightKg?: number;

  @ApiPropertyOptional({ description: 'Porcentaje de grasa corporal', example: 18 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(70)
  bodyFatPct?: number;

  @ApiPropertyOptional({ description: 'Objetivo', enum: FitnessGoal })
  @IsOptional()
  @IsEnum(FitnessGoal)
  goal?: FitnessGoal;

  @ApiPropertyOptional({ description: 'Nivel de actividad', enum: ActivityLevel })
  @IsOptional()
  @IsEnum(ActivityLevel)
  activityLevel?: ActivityLevel;

  @ApiPropertyOptional({ description: 'Condiciones médicas' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medicalConditions?: string[];

  @ApiPropertyOptional({ description: 'Contacto de emergencia' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  emergencyContactName?: string;

  @ApiPropertyOptional({ description: 'Teléfono de emergencia' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  emergencyContactPhone?: string;
}

export class QueryUsersDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por rol', enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Búsqueda por nombre o email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrar por estado activo' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}