import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('gyms')
export class Gym extends BaseEntity {
  @ApiProperty({ description: 'Nombre del gimnasio', example: 'Power Zone Downtown' })
  @Index({ unique: true })
  @Column({ length: 120, unique: true })
  name: string;

  @ApiProperty({
    description: 'Identificador único (slug) del gimnasio',
    example: 'power-zone-downtown',
  })
  @Column({ length: 120 })
  slug: string;

  @ApiPropertyOptional({ description: 'Descripción corta del gimnasio' })
  @Column({ length: 500, nullable: true })
  description: string;

  @ApiPropertyOptional({ description: 'Dirección física', example: 'Av. Reforma 123' })
  @Column({ length: 255, nullable: true })
  address: string;

  @ApiPropertyOptional({ description: 'Ciudad', example: 'Ciudad de México' })
  @Column({ length: 120, nullable: true })
  city: string;

  @ApiPropertyOptional({ description: 'Teléfono de contacto', example: '+52 55 1234 5678' })
  @Column({ length: 50, nullable: true })
  phone: string;

  @ApiPropertyOptional({ description: 'Email de contacto', example: 'contacto@gym.com' })
  @Column({ length: 120, nullable: true })
  email: string;

  @ApiPropertyOptional({ description: 'URL del logo' })
  @Column({ length: 500, nullable: true })
  logoUrl: string;

  @ApiProperty({ description: 'Aforo máximo de personas', example: 150 })
  @Column({ type: 'int', default: 100 })
  maxCapacity: number;

  @ApiProperty({ description: 'Divisa por defecto (ISO 4217)', example: 'usd' })
  @Column({ length: 3, default: 'usd' })
  currency: string;

  @ApiProperty({ description: 'Indica si el gimnasio está activo', default: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiPropertyOptional({
    description: 'Servicios disponibles',
    example: ['pesas', 'cardio', 'funcional', 'piscina'],
    type: [String],
  })
  @Column({ type: 'jsonb', nullable: true })
  services: string[];
}
