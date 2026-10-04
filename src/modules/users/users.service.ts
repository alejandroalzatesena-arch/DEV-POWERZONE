import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums';
import { Gym } from './../gyms/entities/gym.entity';
import { CreateUserDto, QueryUsersDto, UpdateProfileDto, UpdateUserDto } from './dto/users.dto';
import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(UserProfile) private readonly profilesRepo: Repository<UserProfile>,
    @InjectRepository(Gym) private readonly gymsRepo: Repository<Gym>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Devuelve el filtro de tenancy para el actor. Los super admins ven todo.
   */
  private tenantWhere(actor: JwtPayload): Record<string, any> {
    if (actor.isSuperAdmin) {
      return {};
    }
    if (!actor.gymId) {
      throw new ForbiddenException('El actor no pertenece a un gimnasio.');
    }
    return { gymId: actor.gymId };
  }

  private assertCanManage(user: User, actor: JwtPayload): void {
    if (actor.isSuperAdmin) {
      return;
    }
    if (user.gymId !== actor.gymId) {
      throw new ForbiddenException('No puedes gestionar usuarios de otro gimnasio.');
    }
    if (user.role === UserRole.ADMIN && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Solo un administrador puede gestionar a otros administradores.',
      );
    }
  }

  private assertCanAssignRole(role: UserRole, actor: JwtPayload): void {
    if (role === UserRole.ADMIN && !actor.isSuperAdmin && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('No tienes permisos para asignar el rol admin.');
    }
    if (actor.isSuperAdmin) return;
    if (role === UserRole.ADMIN && !actor.isSuperAdmin) return;
  }

  async create(dto: CreateUserDto, actor: JwtPayload): Promise<User> {
    const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese email.');
    }

    this.assertCanAssignRole(dto.role, actor);

    let gymId = actor.isSuperAdmin ? dto.gymId : actor.gymId;
    if (!gymId) {
      throw new BadRequestException('Se requiere un gimnasio para crear el usuario.');
    }
    const gym = await this.gymsRepo.findOne({ where: { id: gymId } });
    if (!gym) {
      throw new BadRequestException('El gimnasio indicado no existe.');
    }

    const rounds = this.configService.get<number>('app.bcryptRounds') ?? 10;
    const password = dto.password || `Temporal-${Math.random().toString(36).slice(2, 8)}`;
    const passwordHash = await bcrypt.hash(password, rounds);

    const user = await this.usersRepo.save(
      this.usersRepo.create({
        email: dto.email.toLowerCase(),
        password: passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        phone: dto.phone,
        gender: dto.gender,
        birthDate: dto.birthDate,
        gymId,
        isActive: dto.isActive ?? true,
      }),
    );

    if (dto.heightCm || dto.weightKg || dto.goal || dto.activityLevel) {
      await this.profilesRepo.save(
        this.profilesRepo.create({
          userId: user.id,
          heightCm: dto.heightCm,
          weightKg: dto.weightKg,
          goal: dto.goal,
          activityLevel: dto.activityLevel,
        }),
      );
    }

    return this.findById(user.id, actor);
  }

  async findAll(query: QueryUsersDto, actor: JwtPayload): Promise<PaginatedResult<User>> {
    const { page, limit, sortBy, sortOrder, role, search, isActive } = query;

    const qb = this.usersRepo.createQueryBuilder('u').leftJoinAndSelect('u.gym', 'gym');

    if (!actor.isSuperAdmin) {
      qb.andWhere('u.gym_id = :gymId', { gymId: actor.gymId });
    }
    if (role) {
      qb.andWhere('u.role = :role', { role });
    }
    if (isActive !== undefined) {
      qb.andWhere('u.is_active = :isActive', { isActive });
    }
    if (search) {
      qb.andWhere(
        '(u.first_name ILIKE :search OR u.last_name ILIKE :search OR u.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.skip((page - 1) * limit).take(limit);
    qb.orderBy(`u.${sortBy || 'createdAt'}`, sortOrder || 'DESC');

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findById(id: string, actor: JwtPayload, withProfile = false): Promise<User> {
    const user = await this.usersRepo.findOne({
      where: { id },
      relations: ['gym', ...(withProfile ? ['profile'] : [])],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        gender: true,
        birthDate: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        isSuperAdmin: true,
        gymId: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        gym: { id: true, name: true },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    this.assertCanManage(user, actor);
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email: email.toLowerCase() } });
  }

  async update(id: string, dto: UpdateUserDto, actor: JwtPayload): Promise<User> {
    const user = await this.findById(id, actor);
    if (dto.role && dto.role !== user.role) {
      this.assertCanAssignRole(dto.role, actor);
    }
    Object.assign(user, dto);
    await this.usersRepo.save(user);
    return this.findById(id, actor);
  }

  async remove(id: string, actor: JwtPayload): Promise<void> {
    const user = await this.findById(id, actor);
    await this.usersRepo.softDelete(user.id);
  }

  // ------------------------------------------------------------------
  // Perfil corporal
  // ------------------------------------------------------------------
  async getProfile(userId: string, _actor: JwtPayload): Promise<UserProfile> {
    const profile = await this.profilesRepo.findOne({ where: { userId } });
    if (!profile) {
      return this.profilesRepo.save(this.profilesRepo.create({ userId }));
    }
    return profile;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    actor: JwtPayload,
  ): Promise<UserProfile> {
    const user = await this.findById(userId, actor);
    let profile = await this.profilesRepo.findOne({ where: { userId: user.id } });
    if (!profile) {
      profile = this.profilesRepo.create({ userId: user.id });
    }
    Object.assign(profile, dto);
    return this.profilesRepo.save(profile);
  }
}
