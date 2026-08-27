import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserGender, UserRole } from '../../../common/enums';
import { Gym } from '../../gyms/entities/gym.entity';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { Routine } from '../../routines/entities/routine.entity';
import { UserProfile } from './user-profile.entity';

@Entity('users')
@Index('idx_users_gym_id', ['gymId'])
@Index('idx_users_role', ['role'])
export class User extends BaseEntity {
  @ApiProperty({ description: 'Email del usuario', example: 'carlos@example.com' })
  @Column({ length: 120, unique: true })
  email: string;

  @Column({ select: false })
  password: string;

  @ApiProperty({ description: 'Nombre(s)', example: 'Carlos' })
  @Column({ length: 100 })
  firstName: string;

  @ApiProperty({ description: 'Apellido(s)', example: 'Martínez' })
  @Column({ length: 100 })
  lastName: string;

  @ApiPropertyOptional({ description: 'Teléfono', example: '+52 55 1111 2222' })
  @Column({ length: 50, nullable: true })
  phone: string;

  @ApiPropertyOptional({ description: 'Fecha de nacimiento', type: String })
  @Column({ type: 'date', nullable: true })
  birthDate: string;

  @ApiPropertyOptional({ description: 'Género', enum: UserGender })
  @Column({ length: 20, nullable: true })
  gender: UserGender;

  @ApiProperty({ description: 'Rol del usuario', enum: UserRole })
  @Column({ length: 30, default: UserRole.CLIENT })
  role: UserRole;

  @ApiPropertyOptional({ description: 'URL del avatar' })
  @Column({ length: 500, nullable: true })
  avatarUrl: string;

  @ApiProperty({ description: 'Si el usuario puede operar globalmente (super admin)', default: false })
  @Column({ default: false })
  isSuperAdmin: boolean;

  @ApiProperty({ description: 'Si la cuenta está activa', default: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Último inicio de sesión' })
  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date;

  @ApiPropertyOptional({ description: 'ID del gimnasio al que pertenece (null => global/super admin)' })
  @Column({ name: 'gym_id', type: 'uuid', nullable: true })
  gymId: string | null;

  @ManyToOne(() => Gym, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'gym_id' })
  gym?: Gym;

  @OneToMany(() => RefreshToken, token => token.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => Routine, routine => routine.createdBy)
  routinesCreated: Routine[];

  @OneToOne(() => UserProfile, profile => profile.user)
  profile: UserProfile;

  @ApiPropertyOptional({ description: 'Nombre completo calculado' })
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }
}