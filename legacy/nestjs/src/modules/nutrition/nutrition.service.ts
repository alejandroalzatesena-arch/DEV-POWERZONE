import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PaginatedResult, paginate } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums';
import { User } from '../users/entities/user.entity';
import { Food } from './entities/food.entity';
import { NutritionLog } from './entities/nutrition-log.entity';
import {
  CreateFoodDto,
  CreateNutritionLogDto,
  QueryFoodsDto,
  QueryNutritionLogsDto,
  UpdateFoodDto,
} from './dto/nutrition.dto';

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  sugar: number;
}

@Injectable()
export class NutritionService {
  constructor(
    @InjectRepository(Food) private readonly foodsRepo: Repository<Food>,
    @InjectRepository(NutritionLog) private readonly logsRepo: Repository<NutritionLog>,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  // ------------------------------------------------------------------
  // Base de datos de alimentos (catálogo global)
  // ------------------------------------------------------------------
  async createFood(dto: CreateFoodDto): Promise<Food> {
    const food = this.foodsRepo.create(dto);
    return this.foodsRepo.save(food);
  }

  async findAllFoods(query: QueryFoodsDto): Promise<PaginatedResult<Food>> {
    const { page, limit, sortBy, sortOrder, category, search } = query;

    const qb = this.foodsRepo.createQueryBuilder('f');
    if (category) qb.andWhere('f.category = :category', { category });
    if (search) qb.andWhere('f.name ILIKE :search', { search: `%${search}%` });
    qb.orderBy(`f.${sortBy || 'name'}`, sortOrder || 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findFoodById(id: string): Promise<Food> {
    const food = await this.foodsRepo.findOne({ where: { id } });
    if (!food) throw new NotFoundException('Alimento no encontrado.');
    return food;
  }

  async updateFood(id: string, dto: UpdateFoodDto): Promise<Food> {
    const food = await this.findFoodById(id);
    Object.assign(food, dto);
    return this.foodsRepo.save(food);
  }

  async removeFood(id: string): Promise<void> {
    const food = await this.findFoodById(id);
    await this.foodsRepo.softDelete(food.id);
  }

  // ------------------------------------------------------------------
  // Registro de comidas
  // ------------------------------------------------------------------
  async createLog(
    dto: CreateNutritionLogDto,
    actor: JwtPayload,
    targetUserId?: string,
  ): Promise<NutritionLog> {
    let userId = actor.sub;
    if (targetUserId && (actor.isSuperAdmin || actor.role !== UserRole.CLIENT)) {
      const target = await this.usersRepo.findOne({ where: { id: targetUserId } });
      if (!target) throw new NotFoundException('Usuario no encontrado.');
      if (!actor.isSuperAdmin && target.gymId !== actor.gymId) {
        throw new ForbiddenException('El usuario pertenece a otro gimnasio.');
      }
      userId = target.id;
    } else if (targetUserId && targetUserId !== actor.sub) {
      throw new ForbiddenException('No puedes registrar comida en nombre de otro cliente.');
    }

    const food = await this.findFoodById(dto.foodId);
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    if (!user.gymId) throw new BadRequestException('El usuario no pertenece a un gimnasio.');

    const factor = dto.quantityG / food.servingSizeG;

    const log = this.logsRepo.create({
      gymId: user.gymId,
      userId: user.id,
      foodId: food.id,
      mealType: dto.mealType,
      quantityG: dto.quantityG,
      eatenAt: dto.eatenAt ? new Date(dto.eatenAt) : new Date(),
      calculatedCalories: Number((Number(food.calories) * factor).toFixed(1)),
    });
    return this.logsRepo.save(log);
  }

  async findAllLogs(
    query: QueryNutritionLogsDto,
    actor: JwtPayload,
  ): Promise<PaginatedResult<NutritionLog>> {
    const { page, limit, sortBy, sortOrder, mealType, from, to, userId } = query;

    const qb = this.logsRepo
      .createQueryBuilder('nl')
      .leftJoinAndSelect('nl.food', 'food')
      .leftJoinAndSelect('nl.user', 'user');

    if (!actor.isSuperAdmin) {
      if (actor.gymId) qb.andWhere('nl.gym_id = :gymId', { gymId: actor.gymId });
    }
    if (userId) {
      if (actor.role === UserRole.CLIENT && userId !== actor.sub) {
        throw new ForbiddenException('No puedes ver los registros de otro cliente.');
      }
      qb.andWhere('nl.user_id = :userId', { userId });
    }
    if (mealType) qb.andWhere('nl.meal_type = :mealType', { mealType });
    if (from && to) {
      qb.andWhere('nl.eaten_at BETWEEN :from AND :to', {
        from: new Date(`${from}T00:00:00`),
        to: new Date(`${to}T23:59:59`),
      });
    }

    qb.orderBy(`nl.${sortBy || 'eatenAt'}`, sortOrder || 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return paginate(items, total, page, limit);
  }

  async findById(id: string, actor: JwtPayload): Promise<NutritionLog> {
    const log = await this.logsRepo.findOne({
      where: { id },
      relations: ['food', 'user'],
    });
    if (!log) throw new NotFoundException('Registro no encontrado.');
    if (!actor.isSuperAdmin) {
      if (log.gymId !== actor.gymId)
        throw new ForbiddenException('No tienes acceso a este registro.');
      if (actor.role === UserRole.CLIENT && log.userId !== actor.sub) {
        throw new ForbiddenException('No puedes ver este registro.');
      }
    }
    return log;
  }

  async removeLog(id: string, actor: JwtPayload): Promise<void> {
    const log = await this.findById(id, actor);
    await this.logsRepo.softDelete(log.id);
  }

  // ------------------------------------------------------------------
  // Resumen diario
  // ------------------------------------------------------------------
  async dailySummary(
    actor: JwtPayload,
    date = new Date().toISOString().slice(0, 10),
    userId?: string,
  ): Promise<{
    date: string;
    logs: NutritionLog[];
    totals: MacroTotals;
  }> {
    let targetId = actor.sub;
    if (userId && (actor.isSuperAdmin || actor.role !== UserRole.CLIENT)) {
      const target = await this.usersRepo.findOne({ where: { id: userId } });
      if (!target) throw new NotFoundException('Usuario no encontrado.');
      targetId = target.id;
    }

    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59.999`);

    const logs = await this.logsRepo.find({
      where: {
        userId: targetId,
        eatenAt: Between(start, end),
      },
      relations: ['food'],
      order: { eatenAt: 'ASC' },
    });

    const totals: MacroTotals = logs.reduce(
      (acc, log) => {
        const factor = log.quantityG / log.food.servingSizeG;
        acc.calories += Number(log.food.calories) * factor;
        acc.protein += Number(log.food.protein) * factor;
        acc.carbs += Number(log.food.carbs) * factor;
        acc.fats += Number(log.food.fats) * factor;
        acc.fiber += Number(log.food.fiber || 0) * factor;
        acc.sugar += Number(log.food.sugar || 0) * factor;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fats: 0, fiber: 0, sugar: 0 },
    );

    Object.keys(totals).forEach((key) => {
      totals[key as keyof MacroTotals] = Number(totals[key as keyof MacroTotals].toFixed(1));
    });

    return { date, logs, totals };
  }
}
