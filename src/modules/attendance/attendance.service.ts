import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { AttendanceMethod, AttendanceType, MembershipStatus } from '../../common/enums';
import { Gym } from '../gyms/entities/gym.entity';
import { User } from '../users/entities/user.entity';
import { UserMembership } from '../memberships/entities/user-membership.entity';
import { GymClass } from '../classes/entities/gym-class.entity';
import { AttendanceRecord } from './entities/attendance.entity';
import {
  CheckInDto,
  CheckOutDto,
  QueryAttendanceDto,
  RecordClassAttendanceDto,
} from './dto/attendance.dto';
import { OccupancyPayload, AttendanceGateway } from './attendance.gateway';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepo: Repository<AttendanceRecord>,
    @InjectRepository(UserMembership) private readonly membershipsRepo: Repository<UserMembership>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Gym) private readonly gymsRepo: Repository<Gym>,
    @InjectRepository(GymClass) private readonly classesRepo: Repository<GymClass>,
    private readonly gateway: AttendanceGateway,
    private readonly redis: RedisService,
  ) {}

  private tenantWhere(actor: JwtPayload): Record<string, any> {
    if (actor.isSuperAdmin) return {};
    if (!actor.gymId) throw new ForbiddenException('No perteneces a un gimnasio.');
    return { gymId: actor.gymId };
  }

  // ------------------------------------------------------------------
  // Check-in / Check-out
  // ------------------------------------------------------------------
  async checkIn(userId: string, dto: CheckInDto, actor: JwtPayload): Promise<AttendanceRecord> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    if (!actor.isSuperAdmin && user.gymId !== actor.gymId) {
      throw new ForbiddenException('El usuario pertenece a otro gimnasio.');
    }
    if (!user.gymId) {
      throw new BadRequestException('El usuario no pertenece a ningún gimnasio.');
    }

    const gym = await this.gymsRepo.findOne({ where: { id: user.gymId } });
    if (!gym) throw new NotFoundException('Gimnasio no encontrado.');

    const membership = await this.membershipsRepo.findOne({
      where: { userId: user.id, gymId: gym.id, status: MembershipStatus.ACTIVE },
    });
    if (!membership) {
      throw new BadRequestException('El cliente no tiene una membresía activa.');
    }

    if (await this.isCurrentlyInside(user.id)) {
      throw new BadRequestException('El cliente ya está dentro del gimnasio.');
    }

    const record = this.attendanceRepo.create({
      gymId: gym.id,
      userId: user.id,
      type: AttendanceType.CHECK_IN,
      method: dto.method || AttendanceMethod.MEMBER_CARD,
      timestamp: new Date(),
    });
    const saved = await this.attendanceRepo.save(record);

    await this.emitOccupancy(gym.id);
    return saved;
  }

  private async isCurrentlyInside(userId: string): Promise<boolean> {
    const result = await this.attendanceRepo
      .createQueryBuilder('a')
      .where('a.user_id = :userId', { userId })
      .andWhere("a.type = 'check_in'")
      .andWhere(
        `NOT EXISTS (
        SELECT 1 FROM attendance_records o
        WHERE o.user_id = a.user_id AND o.type = 'check_out' AND o.timestamp > a.timestamp
      )`,
      )
      .getOne();
    return !!result;
  }

  async checkOut(userId: string, dto: CheckOutDto, actor: JwtPayload): Promise<AttendanceRecord> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    if (!actor.isSuperAdmin && user.gymId !== actor.gymId) {
      throw new ForbiddenException('El usuario pertenece a otro gimnasio.');
    }

    const record = this.attendanceRepo.create({
      gymId: user.gymId as string,
      userId: user.id,
      type: AttendanceType.CHECK_OUT,
      method: dto.method || AttendanceMethod.MEMBER_CARD,
      timestamp: new Date(),
    });
    const saved = await this.attendanceRepo.save(record);
    await this.emitOccupancy(user.gymId as string);
    return saved;
  }

  async recordClassAttendance(
    dto: RecordClassAttendanceDto,
    actor: JwtPayload,
  ): Promise<AttendanceRecord> {
    const gymClass = await this.classesRepo.findOne({
      where: { id: dto.classId, ...this.tenantWhere(actor) },
    });
    if (!gymClass) throw new NotFoundException('Clase no encontrada.');

    const record = this.attendanceRepo.create({
      gymId: gymClass.gymId,
      userId: actor.sub,
      classId: gymClass.id,
      type: AttendanceType.CLASS,
      method: dto.method || AttendanceMethod.MANUAL,
      timestamp: new Date(),
    });
    return this.attendanceRepo.save(record);
  }

  // ------------------------------------------------------------------
  // Historial
  // ------------------------------------------------------------------
  async findAll(
    query: QueryAttendanceDto,
    actor: JwtPayload,
  ): Promise<PaginatedResult<AttendanceRecord>> {
    const { page, limit, sortBy, sortOrder, type, userId, from, to } = query;

    const qb = this.attendanceRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.user', 'user')
      .leftJoinAndSelect('a.gymClass', 'gymClass');

    if (!actor.isSuperAdmin) {
      qb.andWhere('a.gym_id = :gymId', { gymId: actor.gymId });
    }
    if (type) qb.andWhere('a.type = :type', { type });
    if (userId) qb.andWhere('a.user_id = :userId', { userId });
    if (from && to) {
      qb.andWhere('a.timestamp BETWEEN :from AND :to', { from: new Date(from), to: new Date(to) });
    } else if (from) {
      qb.andWhere('a.timestamp >= :from', { from: new Date(from) });
    } else if (to) {
      qb.andWhere('a.timestamp <= :to', { to: new Date(to) });
    }

    const sortable: Record<string, string> = {
      id: 'a.id',
      timestamp: 'a.timestamp',
      type: 'a.type',
      method: 'a.method',
      userId: 'a.user_id',
    };
    const orderColumn = (sortBy && sortable[sortBy]) || 'a.timestamp';
    qb.orderBy(orderColumn, sortOrder || 'DESC').addOrderBy('a.id', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async myHistory(
    query: QueryAttendanceDto,
    actor: JwtPayload,
  ): Promise<PaginatedResult<AttendanceRecord>> {
    return this.findAll({ ...query, userId: actor.sub }, actor);
  }

  // ------------------------------------------------------------------
  // Control de aforo
  // ------------------------------------------------------------------
  async currentOccupancy(gymId: string): Promise<number> {
    const cacheKey = `occupancy:${gymId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached !== null) {
      return parseInt(cached, 10);
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const counts = await this.attendanceRepo
      .createQueryBuilder('a')
      .select('a.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('a.gym_id = :gymId', { gymId })
      .andWhere('a.timestamp >= :today', { today: todayStart })
      .groupBy('a.type')
      .getRawMany<{ type: string; count: string }>();

    let inside = 0;
    for (const row of counts) {
      if (row.type === AttendanceType.CHECK_IN) inside += parseInt(row.count, 10);
      if (row.type === AttendanceType.CHECK_OUT) inside -= parseInt(row.count, 10);
    }
    inside = Math.max(0, inside);

    await this.redis.set(cacheKey, String(inside), 30);
    return inside;
  }

  async capacityStatus(
    gymId: string,
  ): Promise<{ current: number; maxCapacity: number; isFull: boolean }> {
    const gym = await this.gymsRepo.findOne({ where: { id: gymId } });
    if (!gym) throw new NotFoundException('Gimnasio no encontrado.');

    const current = await this.currentOccupancy(gymId);
    return {
      current,
      maxCapacity: gym.maxCapacity,
      isFull: current >= gym.maxCapacity,
    };
  }

  private async emitOccupancy(gymId: string): Promise<void> {
    try {
      const status = await this.capacityStatus(gymId);
      const payload: OccupancyPayload = {
        gymId,
        current: status.current,
        maxCapacity: status.maxCapacity,
        isFull: status.isFull,
        updatedAt: new Date().toISOString(),
      };
      this.gateway.emitOccupancy(payload);
    } catch (error) {
      this.logger.warn(`No se pudo emitir ocupación: ${(error as Error).message}`);
    }
  }
}
