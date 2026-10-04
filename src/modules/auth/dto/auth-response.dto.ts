import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../common/enums';

export class AuthUserDto {
  @ApiProperty({ description: 'ID del usuario', example: '3f2c4a1e-...' })
  id: string;

  @ApiProperty({ description: 'Email', example: 'cliente@example.com' })
  email: string;

  @ApiProperty({ description: 'Nombre' })
  firstName: string;

  @ApiProperty({ description: 'Apellido' })
  lastName: string;

  @ApiProperty({ description: 'Rol', enum: UserRole })
  role: UserRole;

  @ApiPropertyOptional({ description: 'ID del gimnasio' })
  gymId: string | null;

  @ApiProperty({ description: '¿Es super admin?', default: false })
  isSuperAdmin: boolean;
}

export class TokenPairDto {
  @ApiProperty({
    description: 'Token de acceso JWT (expira en 15 minutos)',
    example: 'eyJhbGciOiJIUzI1NiIs...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Token de refresco (válido por 7 días)',
    example: 'eyJhbGciOiJIUzI1NiIs...',
  })
  refreshToken: string;

  @ApiProperty({ description: 'Tiempo de expiración del access token en segundos', example: 900 })
  expiresIn: number;
}

export class LoginResponseDto {
  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;

  @ApiProperty({ type: TokenPairDto })
  tokens: TokenPairDto;
}
