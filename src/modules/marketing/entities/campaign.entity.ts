import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { TenantBaseEntity } from '../../../common/entities/base.entity';
import { CampaignStatus, CampaignType } from '../../../common/enums';
import { Gym } from '../../gyms/entities/gym.entity';
import { User } from '../../users/entities/user.entity';

@Entity('campaigns')
@Index('idx_campaigns_gym_id', ['gymId'])
@Index('idx_campaigns_status', ['status'])
export class Campaign extends TenantBaseEntity {
  @ApiProperty({ description: 'ID del gimnasio (multi-tenancy)' })
  @Column({ name: 'gym_id', type: 'uuid' })
  gymId: string;

  @ManyToOne(() => Gym, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gym_id' })
  gym: Gym;

  @Column({ name: 'created_by_id', type: 'uuid' })
  createdById: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @ApiProperty({ description: 'Nombre de la campaña', example: 'Renta de enero 20% OFF' })
  @Column({ length: 150 })
  name: string;

  @ApiPropertyOptional({ description: 'Asunto (email/notificación)' })
  @Column({ length: 200, nullable: true })
  subject: string;

  @ApiPropertyOptional({ description: 'Mensaje o contenido' })
  @Column({ length: 5000, nullable: true })
  content: string;

  @ApiProperty({ description: 'Canal de la campaña', enum: CampaignType })
  @Column({ length: 20 })
  type: CampaignType;

  @ApiProperty({
    description: 'Segmento de audiencia (filtros)',
    example: { roles: ['client'], activeMembership: true },
  })
  @Column({ type: 'jsonb', nullable: true })
  audience: Record<string, any>;

  @ApiProperty({ description: 'Estado', enum: CampaignStatus, default: 'draft' })
  @Column({ length: 20, default: CampaignStatus.DRAFT })
  status: CampaignStatus;

  @ApiPropertyOptional({ description: 'Programada para enviarse en esta fecha' })
  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  @ApiPropertyOptional({ description: 'Fecha real de envío' })
  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @ApiPropertyOptional({
    description: 'Estadísticas del envío',
    example: { sent: 120, delivered: 115, failed: 5, opened: 40 },
  })
  @Column({ type: 'jsonb', nullable: true })
  stats: Record<string, any>;
}
