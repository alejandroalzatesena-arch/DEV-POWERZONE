import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../common/enums';
import { ReportQueryDto, UserProgressDto } from './dto/reports.dto';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('financial')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Reporte financiero (admin)',
    description: 'Ingresos por periodo, por método de pago y diarios. Solo multimillonario-gym.',
  })
  @ApiResponse({ status: 200, description: 'Resumen financiero' })
  financial(
    @Query() query: ReportQueryDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<Record<string, any>> {
    return this.reportsService.financial(query, actor);
  }

  @Get('operational')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Reporte operativo (admin)',
    description: 'Usuarios, membresías activas y aforo.',
  })
  @ApiResponse({ status: 200, description: 'Resumen operativo' })
  operational(@CurrentUser() actor: JwtPayload): Promise<Record<string, any>> {
    return this.reportsService.operational(actor);
  }

  @Get('memberships')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Reporte de membresías (admin)',
    description: 'Por tipo y estado, próximas a vencer.',
  })
  @ApiResponse({ status: 200, description: 'Resumen de membresías' })
  memberships(@CurrentUser() actor: JwtPayload): Promise<Record<string, any>> {
    return this.reportsService.memberships(actor);
  }

  @Get('attendance')
  @Roles(UserRole.ADMIN, UserRole.TRAINER, UserRole.RECEPTIONIST)
  @ApiOperation({
    summary: 'Reporte de asistencia',
    description: 'Check-ins/outs por día en un rango.',
  })
  @ApiResponse({ status: 200, description: 'Resumen de asistencia' })
  attendance(
    @Query() query: ReportQueryDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<Record<string, any>> {
    return this.reportsService.attendance(query, actor);
  }

  @Get('progress/:userId')
  @Roles(UserRole.ADMIN, UserRole.TRAINER)
  @ApiOperation({
    summary: 'Progreso de un cliente',
    description: 'Check-ins, clases, membresías e historial de pagos de un miembro.',
  })
  @ApiResponse({ status: 200, description: 'Progreso del usuario' })
  progress(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() _query: UserProgressDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<Record<string, any>> {
    return this.reportsService.progress(userId, actor);
  }
}
