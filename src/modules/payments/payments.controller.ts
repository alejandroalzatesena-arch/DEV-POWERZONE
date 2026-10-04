import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { UserRole } from '../../common/enums';
import { CreateCheckoutDto, CreatePaymentDto, QueryPaymentsDto } from './dto/payments.dto';
import { Payment } from './entities/payment.entity';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({
    summary: 'Registrar pago manual (admin/recepcionista)',
    description: 'Registra un pago en efectivo/transferencia y lo marca como pagado.',
  })
  @ApiResponse({ status: 201, description: 'Pago registrado', type: Payment })
  create(@Body() dto: CreatePaymentDto, @CurrentUser() actor: JwtPayload): Promise<Payment> {
    return this.paymentsService.create(dto, actor);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.TRAINER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Listar pagos (paginado, filtros)' })
  @ApiResponse({ status: 200, description: 'Pagos paginados' })
  findAll(
    @Query() query: QueryPaymentsDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<PaginatedResult<Payment>> {
    return this.paymentsService.findAll(query, actor);
  }

  @Get('my')
  @ApiOperation({ summary: 'Mis pagos (cliente)' })
  @ApiResponse({ status: 200, description: 'Pagos del cliente autenticado' })
  async myPayments(@CurrentUser() actor: JwtPayload): Promise<Payment[]> {
    const result = await this.paymentsService.findAll(
      { userId: actor.sub } as QueryPaymentsDto,
      actor,
    );
    return result.items;
  }

  @Post('checkout')
  @Roles(UserRole.ADMIN, UserRole.CLIENT)
  @ApiOperation({
    summary: 'Crear sesión de checkout (Stripe)',
    description:
      'Crea una checkout session. Si Stripe no está configurado devuelve una URL mock para desarrollo.',
  })
  @ApiResponse({ status: 201, description: 'URL de pago generada' })
  createCheckout(
    @Body() dto: CreateCheckoutDto,
    @CurrentUser() actor: JwtPayload,
  ): Promise<{ url: string; paymentId: string }> {
    return this.paymentsService.createCheckout(dto, actor);
  }

  @Post('mock-checkout/:id/confirm')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.CLIENT)
  @ApiOperation({
    summary: 'Confirmar checkout mock (desarrollo)',
    description: 'Solo para desarrollo: marca un pago pendiente como pagado y activa la membresía.',
  })
  @ApiResponse({ status: 200, description: 'Pago confirmado', type: Payment })
  confirmMockCheckout(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ): Promise<Payment> {
    return this.paymentsService.mockConfirmCheckout(id, actor);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.TRAINER, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Obtener pago por ID' })
  @ApiResponse({ status: 200, description: 'Detalle del pago', type: Payment })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ): Promise<Payment> {
    return this.paymentsService.findById(id, actor);
  }

  @Public()
  @Post('webhook/stripe')
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  @ApiBody({ type: Object })
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    return this.paymentsService.handleStripeWebhook(req.rawBody?.toString('utf8') || '', signature);
  }
}
