import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { CreateExerciseDto, QueryExercisesDto, UpdateExerciseDto } from './dto/exercises.dto';
import { Exercise } from './entities/exercise.entity';

@Injectable()
export class ExercisesService {
  constructor(
    @InjectRepository(Exercise) private readonly exercisesRepo: Repository<Exercise>,
  ) {}

  async create(dto: CreateExerciseDto): Promise<Exercise> {
    const exercise = this.exercisesRepo.create(dto);
    return this.exercisesRepo.save(exercise);
  }

  async findAll(query: QueryExercisesDto): Promise<PaginatedResult<Exercise>> {
    const { page, limit, sortBy, sortOrder, category, search } = query;

    const qb = this.exercisesRepo.createQueryBuilder('e');
    qb.andWhere('e.is_active = true');
    if (category) qb.andWhere('e.category = :category', { category });
    if (search) {
      qb.andWhere('(e.name ILIKE :search OR e.muscle_group ILIKE :search)', {
        search: `%${search}%`,
      });
    }
    qb.orderBy(`e.${sortBy || 'name'}`, sortOrder || 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findById(id: string): Promise<Exercise> {
    const exercise = await this.exercisesRepo.findOne({ where: { id } });
    if (!exercise) throw new NotFoundException('Ejercicio no encontrado.');
    return exercise;
  }

  async update(id: string, dto: UpdateExerciseDto): Promise<Exercise> {
    const exercise = await this.findById(id);
    Object.assign(exercise, dto);
    return this.exercisesRepo.save(exercise);
  }

  async remove(id: string): Promise<void> {
    const exercise = await this.findById(id);
    await this.exercisesRepo.softDelete(exercise.id);
  }
}