import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';
import { Gym } from '../../gyms/entities/gym.entity';
import { UserMembership } from './user-membership.entity';

@Entity('membership_types')
@Index('idx_membership_types_gym_id', ['gymId'])
export class MembershipType extends TenantBaseEntity {
  @ApiProperty({ description: 'ID del gimnasio (multi-tenancy)' })
  @Column({ name: 'gym_id', type: 'uuid' })
  gymId: string;

  @ManyToOne(() => Gym, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gym_id' })
  gym: Gym;

  @ApiProperty({ description: 'Nombre del tipo de membresía', example: 'Mensual Premium' })
  @Column({ length: 120 })
  name: string;

  @ApiPropertyOptional({ description: 'Descripción' })
  @Column({ length: 500, nullable: true })
  description: string;

  @ApiProperty({ description: 'Duración en días', example: 30 })
  @Column({ name: 'duration_days', type: 'int' })
  durationDays: number;

  @ApiProperty({ description: 'Precio', example: 49.99 })
  @Column({ type: 'numeric', precision: 10, scale: 2 })
  price: number;

  @ApiProperty({ description: 'Divisa', example: 'usd' })
  @Column({ length: 3, default: 'usd' })
  currency: string;

  @ApiPropertyOptional({ description: 'Características incluidas', example: ['Sauna', 'Piscina', '1 clase grupal/semana'] })
  @Column({ type: 'jsonb', nullable: true })
  features: string[];

  @ApiPropertyOptional({ description: 'Máximo de clases grupales por semana', example: 4 })
  @Column({ name: 'max_classes_per_week', type: 'int', nullable: true })
  maxClassesPerWeek: number;

  @ApiProperty({ description: 'Si está activo', default: true })
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Orden de visualización' })
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @OneToMany(() => UserMembership, um => um.membershipType)
  userMemberships: UserMembership[];
}