import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../common/enums';
import { CheckInDto, CheckOutDto, QueryAttendanceDto, RecordClassAttendanceDto } from './dto/attendance.dto';
import { AttendanceRecord } from './entities/attendance.entity';

@ApiTags('attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check-in/:userId')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.CLIENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar entrada (check-in)',
    description: 'Valida membresía activa y aforo. Emite actualización en tiempo real por WebSocket.',
  })
  @ApiResponse({ status: 201, description: 'Entrada registrada', type: AttendanceRecord })
  checkIn(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: CheckInDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<AttendanceRecord> {
    return this.attendanceService.checkIn(userId, dto, actor);
  }

  @Post('check-out/:userId')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.CLIENT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar salida (check-out)' })
  @ApiResponse({ status: 201, description: 'Salida registrada', type: AttendanceRecord })
  checkOut(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: CheckOutDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<AttendanceRecord> {
    return this.attendanceService.checkOut(userId, dto, actor);
  }

  @Post('class')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar asistencia a clase (cliente)' })
  @ApiResponse({ status: 201, description: 'Asistencia registrada', type: AttendanceRecord })
  recordClass(
    @Body() dto: RecordClassAttendanceDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<AttendanceRecord> {
    return this.attendanceService.recordClassAttendance(dto, actor);
  }

  @Get('history')
  @Roles(UserRole.ADMIN, UserRole.TRAINER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Historial de asistencia (paginado)' })
  @ApiResponse({ status: 200, description: 'Registros paginados' })
  findAll(
    @Query() query: QueryAttendanceDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<PaginatedResult<AttendanceRecord>> {
    return this.attendanceService.findAll(query, actor);
  }

  @Get('my')
  @ApiOperation({ summary: 'Mi historial de asistencia (cliente)' })
  @ApiResponse({ status: 200, description: 'Mis registros' })
  myHistory(
    @Query() query: QueryAttendanceDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<PaginatedResult<AttendanceRecord>> {
    return this.attendanceService.myHistory(query, actor);
  }

  @Get('occupancy/:gymId')
  @Roles(UserRole.ADMIN, UserRole.TRAINER, UserRole.RECEPTIONIST)
  @ApiOperation({
    summary: 'Aforo actual del gimnasio',
    description: 'Devuelve la ocupación en tiempo real (personas dentro / capacidad máxima).',
  })
  @ApiResponse({ status: 200, description: 'Estado de aforo' })
  occupancy(
    @Param('gymId', ParseUUIDPipe) gymId: string,
  ): Promise<{ current: number; maxCapacity: number; isFull: boolean }> {
    return this.attendanceService.capacityStatus(gymId);
  }
}