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
import { RoutinesService } from './routines.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../common/enums';
import {
  AssignRoutineDto,
  CreateRoutineDto,
  GenerateRoutineDto,
  QueryRoutinesDto,
  UpdateRoutineDto,
} from './dto/routines.dto';
import { Routine } from './entities/routine.entity';

@ApiTags('routines')
@ApiBearerAuth()
@Controller('routines')
export class RoutinesController {
  constructor(private readonly routinesService: RoutinesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiOperation({ summary: 'Crear rutina (admin/entrenador)' })
  @ApiResponse({ status: 201, description: 'Rutina creada', type: Routine })
  create(@Body() dto: CreateRoutineDto, @CurrentUser() actor: JwtPayload): Promise<Routine> {
    return this.routinesService.create(dto, actor);
  }

  @Post('generate')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiOperation({
    summary: 'Generar rutina automáticamente (admin/entrenador)',
    description: 'Genera una rutina con la generación local por objetivo o con el módulo de IA (useAI=true).',
  })
  @ApiResponse({ status: 201, description: 'Rutina generada', type: Routine })
  generate(@Body() dto: GenerateRoutineDto, @CurrentUser() actor: JwtPayload): Promise<Routine> {
    return this.routinesService.generate(dto, actor);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiOperation({ summary: 'Listar rutinas (paginado, filtros)' })
  @ApiResponse({ status: 200, description: 'Rutinas paginadas' })
  findAll(
    @Query() query: QueryRoutinesDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<PaginatedResult<Routine>> {
    return this.routinesService.findAll(query, actor);
  }

  @Get('mine')
  @ApiOperation({ summary: 'Mis rutinas (cliente)' })
  @ApiResponse({ status: 200, description: 'Rutinas del cliente autenticado' })
  async mine(@CurrentUser() actor: JwtPayload): Promise<PaginatedResult<Routine>> {
    return this.routinesService.findAll({ mine: true } as QueryRoutinesDto, actor);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiOperation({ summary: 'Obtener rutina por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la rutina', type: Routine })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtPayload): Promise<Routine> {
    return this.routinesService.findById(id, actor);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiOperation({ summary: 'Actualizar rutina (admin/entrenador)' })
  @ApiResponse({ status: 200, description: 'Rutina actualizada', type: Routine })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoutineDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<Routine> {
    return this.routinesService.update(id, dto, actor);
  }

  @Patch(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiOperation({ summary: 'Asignar rutina a un cliente (admin/entrenador)' })
  @ApiResponse({ status: 200, description: 'Rutina asignada', type: Routine })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRoutineDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<Routine> {
    return this.routinesService.assign(id, dto, actor);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar rutina (soft delete, admin)' })
  @ApiResponse({ status: 200, description: 'Rutina eliminada' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtPayload): Promise<{ message: string }> {
    await this.routinesService.remove(id, actor);
    return { message: 'Rutina eliminada.' };
  }
}