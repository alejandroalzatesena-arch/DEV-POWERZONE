import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { ExerciseCategory, RoutineObjective, RoutineStatus, UserRole } from '../../common/enums';
import { User } from '../users/entities/user.entity';
import { Exercise } from '../exercises/entities/exercise.entity';
import { AiProxyService } from '../ai-proxy/ai-proxy.service';
import { Routine } from './entities/routine.entity';
import { RoutineExercise } from './entities/routine-exercise.entity';
import {
  AssignRoutineDto,
  CreateRoutineDto,
  GenerateRoutineDto,
  QueryRoutinesDto,
  UpdateRoutineDto,
} from './dto/routines.dto';

@Injectable()
export class RoutinesService {
  constructor(
    @InjectRepository(Routine) private readonly routinesRepo: Repository<Routine>,
    @InjectRepository(RoutineExercise)
    private readonly routineExercisesRepo: Repository<RoutineExercise>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
    @InjectRepository(Exercise) private readonly exercisesRepo: Repository<Exercise>,
    @Optional() private readonly aiProxy: AiProxyService | null,
  ) {}

  private tenantWhere(actor: JwtPayload): Record<string, any> {
    if (actor.isSuperAdmin) return {};
    if (!actor.gymId) throw new ForbiddenException('No perteneces a un gimnasio.');
    return { gymId: actor.gymId };
  }

  async create(dto: CreateRoutineDto, actor: JwtPayload): Promise<Routine> {
    if (!actor.gymId && !actor.isSuperAdmin) {
      throw new ForbiddenException('Se requiere un gimnasio.');
    }

    let assigneeId: string | null = dto.assigneeId ?? null;
    if (assigneeId) {
      const assignee = await this.usersRepo.findOne({ where: { id: assigneeId } });
      if (!assignee) throw new NotFoundException('Cliente no encontrado.');
      if (!actor.isSuperAdmin && assignee.gymId !== actor.gymId) {
        throw new ForbiddenException('El cliente pertenece a otro gimnasio.');
      }
      if (assignee.role !== UserRole.CLIENT) {
        throw new BadRequestException('Las rutinas se asignan solo a clientes.');
      }
    }

    const routine = this.routinesRepo.create({
      gymId: actor.gymId as string,
      title: dto.title,
      description: dto.description,
      objective: dto.objective ?? RoutineObjective.GENERAL,
      difficulty: dto.difficulty,
      daysPerWeek: dto.daysPerWeek,
      durationWeeks: dto.durationWeeks,
      isTemplate: dto.isTemplate ?? false,
      status: RoutineStatus.ACTIVE,
      assigneeId,
      createdById: actor.sub,
    });
    const saved = await this.routinesRepo.save(routine);

    if (dto.exercises?.length) {
      await this.saveExercises(saved, dto.exercises);
    }

    return this.findById(saved.id, actor);
  }

  async findAll(query: QueryRoutinesDto, actor: JwtPayload): Promise<PaginatedResult<Routine>> {
    const { page = 1, limit = 20, sortBy, sortOrder, objective, status, isTemplate, mine } = query;

    const qb = this.routinesRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.exercises', 're')
      .leftJoinAndSelect('re.exercise', 'e')
      .leftJoinAndSelect('r.createdBy', 'creator')
      .leftJoinAndSelect('r.assignee', 'assignee');

    if (!actor.isSuperAdmin) {
      qb.andWhere('r.gym_id = :gymId', { gymId: actor.gymId });
    }
    if (objective) qb.andWhere('r.objective = :objective', { objective });
    if (status) qb.andWhere('r.status = :status', { status });
    if (isTemplate === true) qb.andWhere('r.is_template = true');
    if (mine === true) {
      qb.andWhere('(r.assignee_id = :me OR r.created_by_id = :me)', { me: actor.sub });
    }

    qb.orderBy(`r.${sortBy || 'createdAt'}`, sortOrder || 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findById(id: string, actor: JwtPayload): Promise<Routine> {
    const routine = await this.routinesRepo.findOne({
      where: { id, ...this.tenantWhere(actor) },
      relations: ['exercises', 'exercises.exercise', 'createdBy', 'assignee'],
    });
    if (!routine) throw new NotFoundException('Rutina no encontrada.');
    return routine;
  }

  async update(id: string, dto: UpdateRoutineDto, actor: JwtPayload): Promise<Routine> {
    const routine = await this.findById(id, actor);
    const { exercises, ...rest } = dto;
    Object.assign(routine, rest);
    const saved = await this.routinesRepo.save(routine);

    if (exercises) {
      await this.routineExercisesRepo.softDelete({ routineId: id });
      await this.routineExercisesRepo.delete({ routineId: id });
      await this.saveExercises(saved, exercises);
    }

    return this.findById(id, actor);
  }

  async remove(id: string, actor: JwtPayload): Promise<void> {
    const routine = await this.findById(id, actor);
    await this.routinesRepo.softDelete(routine.id);
  }

  // ------------------------------------------------------------------
  // Asignación
  // ------------------------------------------------------------------
  async assign(id: string, dto: AssignRoutineDto, actor: JwtPayload): Promise<Routine> {
    const routine = await this.findById(id, actor);
    if (routine.isTemplate && routine.status === RoutineStatus.DRAFT) {
      throw new BadRequestException('Una plantilla en borrador no se asigna. Actívala primero.');
    }
    const client = await this.usersRepo.findOne({ where: { id: dto.userId } });
    if (!client) throw new NotFoundException('Cliente no encontrado.');
    if (!actor.isSuperAdmin && client.gymId !== actor.gymId) {
      throw new ForbiddenException('El cliente pertenece a otro gimnasio.');
    }
    routine.assigneeId = client.id;
    routine.status = RoutineStatus.ACTIVE;
    routine.isTemplate = false;
    return this.routinesRepo.save(routine);
  }

  // ------------------------------------------------------------------
  // Generación automática (local) y vía IA
  // ------------------------------------------------------------------
  async generate(dto: GenerateRoutineDto, actor: JwtPayload): Promise<Routine> {
    const client = await this.usersRepo.findOne({ where: { id: dto.userId } });
    if (!client) throw new NotFoundException('Cliente no encontrado.');
    if (!actor.isSuperAdmin && client.gymId !== actor.gymId) {
      throw new ForbiddenException('El cliente pertenece a otro gimnasio.');
    }

    if (dto.useAI && this.aiProxy) {
      const aiRoutine = await this.aiProxy.generateRoutine({
        userId: client.id,
        objective: dto.objective,
        daysPerWeek: dto.daysPerWeek,
        difficulty: dto.difficulty,
      });
      const routine = this.routinesRepo.create({
        gymId: actor.gymId as string,
        title: aiRoutine.title || `Rutina ${dto.objective.replace('_', ' ')}`,
        description: aiRoutine.description,
        objective: dto.objective,
        difficulty: dto.difficulty,
        daysPerWeek: dto.daysPerWeek,
        durationWeeks: 8,
        isTemplate: false,
        status: RoutineStatus.ACTIVE,
        assigneeId: client.id,
        createdById: actor.sub,
      });
      const saved = await this.routinesRepo.save(routine);
      if (Array.isArray(aiRoutine.exercises)) {
        const mapped: any[] = aiRoutine.exercises.map(
          (
            ex: {
              exerciseId: string;
              dayOfWeek?: number;
              sets?: number;
              reps?: number;
              restSeconds?: number;
            },
            i: number,
          ) => ({
            exerciseId: ex.exerciseId,
            dayOfWeek: ex.dayOfWeek ?? (i % dto.daysPerWeek) + 1,
            order: (i % dto.daysPerWeek) + 1,
            sets: ex.sets ?? 3,
            reps: ex.reps ?? 10,
            restSeconds: ex.restSeconds ?? 60,
          }),
        );
        await this.saveExercises(saved, mapped);
      }
      return this.findById(saved.id, actor);
    }

    return this.generateLocal(client.id, dto, actor);
  }

  private async generateLocal(
    userId: string,
    dto: GenerateRoutineDto,
    actor: JwtPayload,
  ): Promise<Routine> {
    const categoriesByObjective: Record<string, ExerciseCategory[]> = {
      [RoutineObjective.STRENGTH]: [
        ExerciseCategory.CHEST,
        ExerciseCategory.BACK,
        ExerciseCategory.LEGS,
        ExerciseCategory.SHOULDERS,
      ],
      [RoutineObjective.HYPERTROPHY]: [
        ExerciseCategory.CHEST,
        ExerciseCategory.BACK,
        ExerciseCategory.LEGS,
        ExerciseCategory.ARMS,
      ],
      [RoutineObjective.WEIGHT_LOSS]: [
        ExerciseCategory.CARDIO,
        ExerciseCategory.FULL_BODY,
        ExerciseCategory.CORE,
        ExerciseCategory.LEGS,
      ],
      [RoutineObjective.ENDURANCE]: [
        ExerciseCategory.CARDIO,
        ExerciseCategory.FULL_BODY,
        ExerciseCategory.STRETCHING,
        ExerciseCategory.CORE,
      ],
      [RoutineObjective.REHABILITATION]: [
        ExerciseCategory.STRETCHING,
        ExerciseCategory.CORE,
        ExerciseCategory.FULL_BODY,
      ],
      [RoutineObjective.GENERAL]: [
        ExerciseCategory.FULL_BODY,
        ExerciseCategory.CHEST,
        ExerciseCategory.BACK,
        ExerciseCategory.LEGS,
      ],
    };

    const categories = categoriesByObjective[dto.objective] || categoriesByObjective[1];
    const difficulty = dto.difficulty ?? 3;

    const exercises = await this.exercisesRepo
      .createQueryBuilder('e')
      .where('e.is_active = true')
      .andWhere('e.category IN (:...categories)', { categories })
      .andWhere('(e.difficulty IS NULL OR e.difficulty BETWEEN :min AND :max)', {
        min: Math.max(1, difficulty - 1),
        max: Math.min(5, difficulty + 1),
      })
      .orderBy('e.name', 'ASC')
      .getMany();

    const routine = this.routinesRepo.create({
      gymId: actor.gymId as string,
      title: `Rutina automática de ${dto.objective.replace('_', ' ')}`,
      description: `Rutina generada automáticamente (${dto.daysPerWeek} días/semana)`,
      objective: dto.objective,
      difficulty,
      daysPerWeek: dto.daysPerWeek,
      durationWeeks: 8,
      isTemplate: false,
      status: RoutineStatus.ACTIVE,
      assigneeId: userId,
      createdById: actor.sub,
    });
    const saved = await this.routinesRepo.save(routine);

    const picked: RoutineExercise[] = [];
    const count = Math.max(3, Math.floor(exercises.length / dto.daysPerWeek));
    for (let day = 1; day <= dto.daysPerWeek; day++) {
      const slice = exercises.slice((day - 1) * count, day * count);
      if (slice.length === 0) continue;
      slice.forEach((exercise, index) => {
        picked.push(
          this.routineExercisesRepo.create({
            routineId: saved.id,
            exerciseId: exercise.id,
            dayOfWeek: day,
            order: index + 1,
            sets: 3,
            reps: 10,
            restSeconds: 60,
          }),
        );
      });
    }

    if (picked.length > 0) {
      await this.routineExercisesRepo.save(picked);
    } else {
      throw new BadRequestException(
        'No hay ejercicios en el catálogo. Crea ejercicios antes de generar rutinas.',
      );
    }

    return this.findById(saved.id, actor);
  }

  private async saveExercises(routine: Routine, exercises: any[]): Promise<void> {
    const rows = exercises.map((ex) =>
      this.routineExercisesRepo.create({
        routineId: routine.id,
        exerciseId: ex.exerciseId,
        dayOfWeek: ex.dayOfWeek,
        order: ex.order ?? 1,
        sets: ex.sets,
        reps: ex.reps,
        restSeconds: ex.restSeconds,
        weight: ex.weight,
        notes: ex.notes,
      }),
    );
    await this.routineExercisesRepo.save(rows);
  }
}
