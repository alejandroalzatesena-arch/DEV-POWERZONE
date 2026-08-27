import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';

@Entity('refresh_tokens')
@Index('idx_refresh_tokens_user_id', ['userId'])
@Index('idx_refresh_tokens_token_hash', ['tokenHash'])
export class RefreshToken extends BaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, user => user.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ description: 'Hash del refresh token' })
  @Column({ name: 'token_hash', length: 255 })
  tokenHash: string;

  @ApiPropertyOptional({ description: 'Fecha de expiración' })
  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @ApiPropertyOptional({ description: 'Fecha en que fue revocado' })
  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @ApiPropertyOptional({ description: 'User-Agent del dispositivo' })
  @Column({ name: 'user_agent', length: 255, nullable: true })
  userAgent: string;

  @ApiPropertyOptional({ description: 'IP origen' })
  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress: string;
}