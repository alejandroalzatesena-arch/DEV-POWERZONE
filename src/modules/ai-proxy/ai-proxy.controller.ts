import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AiProxyService } from './ai-proxy.service';
import { AiGenerateRoutineDto, AiRecommendationDto, ChatDto } from './dto/ai-proxy.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('ai-proxy')
@ApiBearerAuth()
@Controller('ai-proxy')
export class AiProxyController {
  constructor(private readonly aiProxyService: AiProxyService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Estado del servicio de IA' })
  @ApiResponse({ status: 200, description: 'Estado del servicio FastAPI' })
  health(): Promise<{ status: string }> {
    return this.aiProxyService.health();
  }

  @Post('chat')
  @ApiOperation({
    summary: 'Chatbot asistente (IA)',
    description:
      'Envía un mensaje al asistente virtual basado en FastAPI. Si la IA está caída usa un fallback local.',
  })
  @ApiResponse({ status: 201, description: 'Respuesta del asistente' })
  chat(@Body() dto: ChatDto): Promise<{ reply: string }> {
    return this.aiProxyService.chat(dto.sessionId || 'general', dto.message, dto.context);
  }

  @Post('routines/generate')
  @ApiOperation({ summary: 'Generar rutina con IA' })
  @ApiResponse({ status: 201, description: 'Rutina generada' })
  generateRoutine(
    @Body() dto: AiGenerateRoutineDto,
  ): Promise<{ title: string; description: string; exercises: any[] }> {
    return this.aiProxyService.generateRoutine(dto);
  }

  @Post('recommendations/workout')
  @ApiOperation({ summary: 'Recomendación de entrenamiento (IA)' })
  @ApiResponse({ status: 201, description: 'Recomendación' })
  recommendWorkout(@Body() dto: AiRecommendationDto): Promise<any> {
    return this.aiProxyService.recommendWorkout(dto.userId, dto.context);
  }

  @Post('recommendations/nutrition')
  @ApiOperation({ summary: 'Recomendación nutricional (IA)' })
  @ApiResponse({ status: 201, description: 'Recomendación' })
  recommendNutrition(@Body() dto: AiRecommendationDto): Promise<any> {
    return this.aiProxyService.recommendNutrition(dto.userId, dto.context);
  }
}
