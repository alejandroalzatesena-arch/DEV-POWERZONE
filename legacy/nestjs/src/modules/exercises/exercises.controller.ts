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
import { ExercisesService } from './exercises.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums';
import { CreateExerciseDto, QueryExercisesDto, UpdateExerciseDto } from './dto/exercises.dto';
import { Exercise } from './entities/exercise.entity';

@ApiTags('exercises')
@ApiBearerAuth()
@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiOperation({ summary: 'Crear ejercicio (admin/entrenador)' })
  @ApiResponse({ status: 201, description: 'Ejercicio creado', type: Exercise })
  create(@Body() dto: CreateExerciseDto): Promise<Exercise> {
    return this.exercisesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar ejercicios (catálogo global, paginado)' })
  @ApiResponse({ status: 200, description: 'Ejercicios paginados' })
  findAll(@Query() query: QueryExercisesDto): Promise<PaginatedResult<Exercise>> {
    return this.exercisesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener ejercicio por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del ejercicio', type: Exercise })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Exercise> {
    return this.exercisesService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiOperation({ summary: 'Actualizar ejercicio (admin/entrenador)' })
  @ApiResponse({ status: 200, description: 'Ejercicio actualizado', type: Exercise })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExerciseDto,
  ): Promise<Exercise> {
    return this.exercisesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar ejercicio (soft delete, admin)' })
  @ApiResponse({ status: 200, description: 'Ejercicio eliminado' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    await this.exercisesService.remove(id);
    return { message: 'Ejercicio eliminado.' };
  }
}
