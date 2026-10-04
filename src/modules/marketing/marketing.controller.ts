import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MarketingService } from './marketing.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../common/enums';
import { CreateCampaignDto, QueryCampaignsDto, UpdateCampaignDto } from './dto/marketing.dto';
import { Campaign } from './entities/campaign.entity';

@ApiTags('marketing')
@ApiBearerAuth()
@Controller('marketing')
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Post('campaigns')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Crear campaña de marketing (admin)' })
  @ApiResponse({ status: 201, description: 'Campaña creada', type: Campaign })
  create(@Body() dto: CreateCampaignDto, @CurrentUser() actor: JwtPayload): Promise<Campaign> {
    return this.marketingService.create(dto, actor);
  }

  @Get('campaigns')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar campañas (paginado)' })
  @ApiResponse({ status: 200, description: 'Campañas paginadas' })
  findAll(
    @Query() query: QueryCampaignsDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<PaginatedResult<Campaign>> {
    return this.marketingService.findAll(query, actor);
  }

  @Post('campaigns/:id/send')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Enviar campaña (admin)',
    description:
      'Segmenta la audiencia y envía notificaciones. Programa si scheduledAt está en el futuro.',
  })
  @ApiResponse({ status: 200, description: 'Campaña procesada', type: Campaign })
  send(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ): Promise<Campaign> {
    return this.marketingService.send(id, actor, true);
  }

  @Post('campaigns/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cancelar campaña programada (admin)' })
  @ApiResponse({ status: 200, description: 'Campaña cancelada', type: Campaign })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ): Promise<Campaign> {
    return this.marketingService.cancelScheduled(id, actor);
  }

  @Get('campaigns/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Obtener campaña por ID' })
  @ApiResponse({ status: 200, description: 'Detalle de la campaña', type: Campaign })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ): Promise<Campaign> {
    return this.marketingService.findById(id, actor);
  }

  @Patch('campaigns/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar campaña (admin)' })
  @ApiResponse({ status: 200, description: 'Campaña actualizada', type: Campaign })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<Campaign> {
    return this.marketingService.update(id, dto, actor);
  }

  @Delete('campaigns/:id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Eliminar campaña (soft delete, admin)' })
  @ApiResponse({ status: 200, description: 'Campaña eliminada' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ): Promise<{ message: string }> {
    await this.marketingService.remove(id, actor);
    return { message: 'Campaña eliminada.' };
  }
}
