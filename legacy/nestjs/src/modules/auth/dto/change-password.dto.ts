import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ description: 'Contraseña actual', example: 'Admin1234' })
  @IsString()
  @MaxLength(72)
  currentPassword: string;

  @ApiProperty({ description: 'Nueva contraseña (mínimo 8 caracteres)', example: 'NuevaClave987' })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;
}
