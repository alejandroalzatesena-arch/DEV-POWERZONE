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
import { ClassesService } from './classes.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../common/enums';
import {
  BookClassDto,
  CreateClassDto,
  MarkAttendanceDto,
  QueryBookingsDto,
  QueryClassesDto,
  UpdateClassDto,
} from './dto/classes.dto';
import { GymClass } from './entities/gym-class.entity';
import { ClassBooking } from './entities/class-booking.entity';

@ApiTags('classes')
@ApiBearerAuth()
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiOperation({ summary: 'Crear clase grupal (admin/entrenador)' })
  @ApiResponse({ status: 201, description: 'Clase creada', type: GymClass })
  create(@Body() dto: CreateClassDto, @CurrentUser() actor: JwtPayload): Promise<GymClass> {
    return this.classesService.create(dto, actor);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar clases (paginado)',
    description: 'Incluye ocupación en tiempo real (cupos disponibles y lista de espera).',
  })
  @ApiResponse({ status: 200, description: 'Clases paginadas' })
  findAll(
    @Query() query: QueryClassesDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<PaginatedResult<any>> {
    return this.classesService.findAll(query, actor);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Clases disponibles próximas (14 días)' })
  @ApiResponse({ status: 200, description: 'Clases con cupo disponible', type: [GymClass] })
  upcoming(@CurrentUser() actor: JwtPayload): Promise<GymClass[]> {
    return this.classesService.getAvailableUpcomingClasses(actor);
  }

  @Post(':id/book')
  @ApiOperation({
    summary: 'Reservar clase (cliente)',
    description: 'Si la clase está llena pasa a lista de espera (si se permite).',
  })
  @ApiResponse({ status: 201, description: 'Reserva creada', type: ClassBooking })
  book(@Param('id', ParseUUIDPipe) id: string, @Body() dto: BookClassDto, @CurrentUser() actor: JwtPayload): Promise<ClassBooking> {
    return this.classesService.book(id, dto, actor);
  }

  @Delete(':id/book')
  @ApiOperation({ summary: 'Cancelar mi reserva (cliente)' })
  @ApiResponse({ status: 200, description: 'Reserva cancelada' })
  async cancelBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ): Promise<{ message: string }> {
    await this.classesService.cancelBooking(id, actor);
    return { message: 'Reserva cancelada.' };
  }

  @Get('bookings/me')
  @ApiOperation({ summary: 'Mis reservas (cliente)' })
  @ApiResponse({ status: 200, description: 'Reservas del cliente autenticado' })
  myBookings(
    @Query() query: QueryBookingsDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<PaginatedResult<ClassBooking>> {
    return this.classesService.myBookings(query, actor);
  }

  @Get('bookings/:classId')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiOperation({ summary: 'Listar reservas de una clase (admin/entrenador)' })
  @ApiResponse({ status: 200, description: 'Reservas de la clase' })
  bookings(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query() query: QueryBookingsDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<PaginatedResult<ClassBooking>> {
    return this.classesService.findAllBookings(classId, query, actor);
  }

  @Patch(':id/attendance')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiOperation({ summary: 'Marcar asistencia de un cliente a la clase' })
  @ApiResponse({ status: 200, description: 'Asistencia registrada', type: ClassBooking })
  markAttendance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MarkAttendanceDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<ClassBooking> {
    return this.classesService.markAttendance(id, dto, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener clase por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la clase', type: GymClass })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtPayload): Promise<GymClass> {
    return this.classesService.findById(id, actor);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiOperation({ summary: 'Actualizar clase (admin/entrenador)' })
  @ApiResponse({ status: 200, description: 'Clase actualizada', type: GymClass })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClassDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<GymClass> {
    return this.classesService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar clase (soft delete, admin)' })
  @ApiResponse({ status: 200, description: 'Clase eliminada' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtPayload): Promise<{ message: string }> {
    await this.classesService.remove(id, actor);
    return { message: 'Clase eliminada.' };
  }
}