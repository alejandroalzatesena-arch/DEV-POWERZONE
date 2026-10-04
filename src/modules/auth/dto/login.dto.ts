import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Email del usuario', example: 'admin@powerzone.com' })
  @IsEmail()
  @MaxLength(120)
  email: string;

  @ApiProperty({ description: 'Contraseña', example: 'Admin1234' })
  @IsString()
  @MaxLength(72)
  password: string;
}
