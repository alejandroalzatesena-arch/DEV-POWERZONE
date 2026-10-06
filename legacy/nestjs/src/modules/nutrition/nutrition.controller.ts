import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NutritionService, MacroTotals } from './nutrition.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../common/enums';
import {
  CreateFoodDto,
  CreateNutritionLogDto,
  QueryFoodsDto,
  QueryNutritionLogsDto,
  UpdateFoodDto,
} from './dto/nutrition.dto';
import { Food } from './entities/food.entity';
import { NutritionLog } from './entities/nutrition-log.entity';

@ApiTags('nutrition')
@ApiBearerAuth()
@Controller('nutrition')
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  // ---------------- Alimentos (catálogo) ----------------
  @Post('foods')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiOperation({ summary: 'Crear alimento en la base de datos (admin/entrenador)' })
  @ApiResponse({ status: 201, description: 'Alimento creado', type: Food })
  createFood(@Body() dto: CreateFoodDto): Promise<Food> {
    return this.nutritionService.createFood(dto);
  }

  @Get('foods')
  @ApiOperation({ summary: 'Buscar alimentos (paginado)' })
  @ApiResponse({ status: 200, description: 'Alimentos paginados' })
  findAllFoods(@Query() query: QueryFoodsDto): Promise<PaginatedResult<Food>> {
    return this.nutritionService.findAllFoods(query);
  }

  @Patch('foods/:id')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiOperation({ summary: 'Actualizar alimento (admin/entrenador)' })
  @ApiResponse({ status: 200, description: 'Alimento actualizado', type: Food })
  updateFood(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFoodDto): Promise<Food> {
    return this.nutritionService.updateFood(id, dto);
  }

  @Delete('foods/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar alimento (soft delete, admin)' })
  @ApiResponse({ status: 200, description: 'Alimento eliminado' })
  async removeFood(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.nutritionService.removeFood(id);
    return { message: 'Alimento eliminado.' };
  }

  // ---------------- Registro de comidas ----------------
  @Post('logs')
  @ApiOperation({ summary: 'Registrar comida (cliente)' })
  @ApiResponse({ status: 201, description: 'Registro creado', type: NutritionLog })
  createLog(
    @Body() dto: CreateNutritionLogDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<NutritionLog> {
    return this.nutritionService.createLog(dto, actor);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Listar registros de comida (paginado)' })
  @ApiResponse({ status: 200, description: 'Registros paginados' })
  findAllLogs(
    @Query() query: QueryNutritionLogsDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<PaginatedResult<NutritionLog>> {
    return this.nutritionService.findAllLogs(query, actor);
  }

  @Get('summary/daily')
  @ApiOperation({
    summary: 'Resumen nutricional diario',
    description: 'Calcula calorías y macros del día (por defecto el usuario autenticado).',
  })
  @ApiResponse({ status: 200, description: 'Resumen diario' })
  dailySummary(
    @Query('date') date: string,
    @Query('userId') userId: string | undefined,
    @CurrentUser() actor: JwtPayload,
  ): Promise<{ date: string; logs: NutritionLog[]; totals: MacroTotals }> {
    const d =
      date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10);
    return this.nutritionService.dailySummary(actor, d, userId);
  }

  @Get('logs/:id')
  @Roles(UserRole.ADMIN, UserRole.TRAINER, UserRole.CLIENT)
  @ApiOperation({ summary: 'Obtener registro por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del registro', type: NutritionLog })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ): Promise<NutritionLog> {
    return this.nutritionService.findById(id, actor);
  }

  @Delete('logs/:id')
  @ApiOperation({ summary: 'Eliminar registro de comida' })
  @ApiResponse({ status: 200, description: 'Registro eliminado' })
  async removeLog(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ): Promise<{ message: string }> {
    await this.nutritionService.removeLog(id, actor);
    return { message: 'Registro eliminado.' };
  }
}
