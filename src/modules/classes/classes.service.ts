import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { BookingStatus, ClassStatus, MembershipStatus, UserRole } from '../../common/enums';
import { User } from '../users/entities/user.entity';
import { UserMembership } from '../memberships/entities/user-membership.entity';
import { GymClass } from './entities/gym-class.entity';
import { ClassBooking } from './entities/class-booking.entity';
import {
  BookClassDto,
  CreateClassDto,
  MarkAttendanceDto,
  QueryBookingsDto,
  QueryClassesDto,
  UpdateClassDto,
} from './dto/classes.dto';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(GymClass) private readonly classesRepo: Repository<GymClass>,
    @InjectRepository(ClassBooking) private readonly bookingsRepo: Repository<ClassBooking>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(UserMembership) private readonly membershipsRepo: Repository<UserMembership>,
  ) {}

  private tenantWhere(actor: JwtPayload): Record<string, any> {
    if (actor.isSuperAdmin) return {};
    if (!actor.gymId) throw new ForbiddenException('No perteneces a un gimnasio.');
    return { gymId: actor.gymId };
  }

  // ------------------------------------------------------------------
  // CRUD de clases
  // ------------------------------------------------------------------
  async create(dto: CreateClassDto, actor: JwtPayload): Promise<GymClass> {
    const instructor = await this.usersRepo.findOne({ where: { id: dto.instructorId } });
    if (!instructor) throw new NotFoundException('Instructor no encontrado.');
    if (instructor.role !== UserRole.TRAINER && instructor.role !== UserRole.ADMIN) {
      throw new BadRequestException('El instructor debe tener rol trainer o admin.');
    }
    if (!actor.isSuperAdmin && instructor.gymId !== actor.gymId) {
      throw new ForbiddenException('El instructor pertenece a otro gimnasio.');
    }

    const gymClass = this.classesRepo.create({
      gymId: actor.gymId as string,
      name: dto.name,
      description: dto.description,
      category: dto.category,
      instructorId: dto.instructorId,
      capacity: dto.capacity ?? 20,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      room: dto.room,
      color: dto.color,
      status: ClassStatus.SCHEDULED,
      isActive: true,
    });
    return this.classesRepo.save(gymClass);
  }

  async findAll(query: QueryClassesDto, actor: JwtPayload): Promise<PaginatedResult<any>> {
    const { page, limit, sortBy, sortOrder, category, upcoming, from } = query;

    const qb = this.classesRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.instructor', 'instructor')
      .leftJoinAndSelect('c.bookings', 'booking');

    if (!actor.isSuperAdmin) {
      qb.andWhere('c.gym_id = :gymId', { gymId: actor.gymId });
    }
    if (category) qb.andWhere('c.category = :category', { category });
    if (upcoming !== false) {
      qb.andWhere('c.start_time >= :now', { now: new Date().toISOString() });
    }
    if (from) qb.andWhere('c.start_time >= :from', { from });

    qb.orderBy(`c.${sortBy || 'startTime'}`, sortOrder || 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    const result = items.map((c) => ({
      ...c,
      bookedSpots: c.bookings.filter((b) => b.status === BookingStatus.CONFIRMED).length,
      waitlisted: c.bookings.filter((b) => b.status === BookingStatus.WAITLISTED).length,
      availableSpots: Math.max(0, c.capacity - c.bookings.filter((b) => b.status === BookingStatus.CONFIRMED).length),
    }));

    return paginate(result, total, page, limit);
  }

  async findById(id: string, actor: JwtPayload): Promise<GymClass> {
    const gymClass = await this.classesRepo.findOne({
      where: { id, ...this.tenantWhere(actor) },
      relations: ['instructor', 'bookings', 'bookings.user'],
    });
    if (!gymClass) throw new NotFoundException('Clase no encontrada.');
    return gymClass;
  }

  async getAvailableUpcomingClasses(actor: JwtPayload, days = 14): Promise<GymClass[]> {
    const from = new Date();
    const to = new Date(from);
    to.setDate(to.getDate() + days);

    const classes = await this.classesRepo.find({
      where: { ...this.tenantWhere(actor), startTime: MoreThan(from), isActive: true },
      relations: ['instructor', 'bookings'],
      order: { startTime: 'ASC' },
    });

    return classes.filter((c) => {
      if (c.startTime > to) return false;
      const confirmed = c.bookings.filter((b) => b.status === BookingStatus.CONFIRMED).length;
      return confirmed < c.capacity;
    });
  }

  async update(id: string, dto: UpdateClassDto, actor: JwtPayload): Promise<GymClass> {
    const gymClass = await this.findById(id, actor);
    Object.assign(gymClass, dto);
    if (dto.startTime) gymClass.startTime = new Date(dto.startTime);
    if (dto.endTime) gymClass.endTime = new Date(dto.endTime);
    return this.classesRepo.save(gymClass);
  }

  async remove(id: string, actor: JwtPayload): Promise<void> {
    const gymClass = await this.findById(id, actor);
    await this.classesRepo.softDelete(gymClass.id);
  }

  // ------------------------------------------------------------------
  // Reservas
  // ------------------------------------------------------------------
  private async hasActiveMembership(userId: string, gymId: string): Promise<UserMembership | null> {
    return this.membershipsRepo.findOne({
      where: { userId, gymId, status: MembershipStatus.ACTIVE },
    });
  }

  async book(id: string, dto: BookClassDto, actor: JwtPayload): Promise<ClassBooking> {
    const gymClass = await this.findById(id, actor);

    const membership = await this.hasActiveMembership(actor.sub, gymClass.gymId);
    if (!membership) {
      throw new BadRequestException('Necesitas una membresía activa para reservar clases.');
    }

    const existing = await this.bookingsRepo.findOne({
      where: { classId: gymClass.id, userId: actor.sub },
    });
    if (existing && existing.status !== BookingStatus.CANCELLED) {
      throw new ConflictException('Ya tienes una reserva para esta clase.');
    }

    const bookedCount = await this.bookingsRepo.count({
      where: { classId: gymClass.id, status: BookingStatus.CONFIRMED },
    });

    if (bookedCount >= gymClass.capacity) {
      if (dto.allowWaitlist === false) {
        throw new BadRequestException('La clase está llena.');
      }
      const waitlistCount = await this.bookingsRepo.count({
        where: { classId: gymClass.id, status: BookingStatus.WAITLISTED },
      });
      if (waitlistCount >= 5) {
        throw new BadRequestException('La lista de espera está llena.');
      }
      const booking = this.bookingsRepo.create({
        gymId: gymClass.gymId,
        classId: gymClass.id,
        userId: actor.sub,
        status: BookingStatus.WAITLISTED,
      });
      return this.bookingsRepo.save(booking);
    }

    if (existing) {
      existing.status = BookingStatus.CONFIRMED;
      existing.bookedAt = new Date();
      return this.bookingsRepo.save(existing);
    }

    const booking = this.bookingsRepo.create({
      gymId: gymClass.gymId,
      classId: gymClass.id,
      userId: actor.sub,
      status: BookingStatus.CONFIRMED,
    });
    return this.bookingsRepo.save(booking);
  }

  async cancelBooking(classId: string, actor: JwtPayload): Promise<void> {
    const booking = await this.bookingsRepo.findOne({
      where: { classId, userId: actor.sub },
    });
    if (!booking) throw new NotFoundException('No tienes reserva para esta clase.');
    if (booking.status === BookingStatus.ATTENDED) {
      throw new BadRequestException('No puedes cancelar una clase a la que ya asististe.');
    }

    booking.status = BookingStatus.CANCELLED;
    await this.bookingsRepo.save(booking);

    await this.promoteWaitlist(classId);
  }

  async myBookings(query: QueryBookingsDto, actor: JwtPayload): Promise<PaginatedResult<ClassBooking>> {
    const { page, limit, sortBy, sortOrder, status } = query;
    const where: Record<string, any> = { userId: actor.sub };
    if (status) where.status = status;

    const [items, total] = await this.bookingsRepo.findAndCount({
      where,
      relations: ['gymClass', 'gymClass.instructor'],
      order: { [sortBy || 'createdAt']: sortOrder || 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginate(items, total, page, limit);
  }

  async findAllBookings(
    classId: string,
    query: QueryBookingsDto,
    actor: JwtPayload,
  ): Promise<PaginatedResult<ClassBooking>> {
    const gymClass = await this.findById(classId, actor);
    const { page, limit, sortBy, sortOrder, status } = query;
    const where: Record<string, any> = { classId: gymClass.id };
    if (status) where.status = status;

    const [items, total] = await this.bookingsRepo.findAndCount({
      where,
      relations: ['user'],
      order: { [sortBy || 'createdAt']: sortOrder || 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return paginate(items, total, page, limit);
  }

  async markAttendance(
    classId: string,
    dto: MarkAttendanceDto,
    actor: JwtPayload,
  ): Promise<ClassBooking> {
    const gymClass = await this.findById(classId, actor);
    const booking = await this.bookingsRepo.findOne({
      where: { classId: gymClass.id, userId: dto.userId },
    });
    if (!booking) throw new NotFoundException('El cliente no tiene reserva en esta clase.');

    if (dto.attended === false) {
      booking.status = BookingStatus.NO_SHOW;
      booking.attended = false;
    } else {
      booking.status = BookingStatus.ATTENDED;
      booking.attended = true;
    }
    await this.bookingsRepo.save(booking);

    if (booking.attended) {
      await this.promoteWaitlist(classId);
    }
    return booking;
  }

  private async promoteWaitlist(classId: string): Promise<void> {
    const spots = await this.classesRepo
      .createQueryBuilder('c')
      .select('c.capacity', 'capacity')
      .where('c.id = :id', { id: classId })
      .getRawOne();

    const confirmed = await this.bookingsRepo.count({
      where: { classId, status: BookingStatus.CONFIRMED },
    });
    const capacity = spots?.capacity ?? 0;
    const free = capacity - confirmed;
    if (free <= 0) return;

    const waitlisted = await this.bookingsRepo.find({
      where: { classId, status: BookingStatus.WAITLISTED },
      order: { createdAt: 'ASC' },
      take: free,
    });

    for (const booking of waitlisted) {
      booking.status = BookingStatus.CONFIRMED;
      await this.bookingsRepo.save(booking);
    }
  }
}