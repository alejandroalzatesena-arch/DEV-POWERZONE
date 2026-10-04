/* global fetch */
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AiProxyService {
  private readonly logger = new Logger(AiProxyService.name);

  constructor(private readonly configService: ConfigService) {}

  private get baseUrl(): string {
    return this.configService.get<string>('ai.url') || 'http://localhost:8000';
  }

  private get apiKey(): string {
    return this.configService.get<string>('ai.apiKey') || 'internal-ai-key';
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const url = `${this.baseUrl}${path}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AI-Key': this.apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        this.logger.warn(`AI service respondió ${response.status}: ${text}`);
        throw new ServiceUnavailableException('El servicio de IA no está disponible.');
      }
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      this.logger.warn(`Error de conexión con el servicio de IA: ${(error as Error).message}`);
      throw new ServiceUnavailableException('El servicio de IA no está disponible.');
    } finally {
      clearTimeout(timeout);
    }
  }

  async health(): Promise<{ status: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${this.baseUrl}/health`, { signal: controller.signal });
      const ok = response.ok;
      return { status: ok ? 'ok' : 'unavailable' };
    } catch {
      return { status: 'unavailable' };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Chatbot del asistente del gimnasio. Fallback local si la IA está caída.
   */
  async chat(
    sessionId: string,
    message: string,
    context?: Record<string, any>,
  ): Promise<{ reply: string }> {
    try {
      return await this.post<{ reply: string }>('/chat', {
        session_id: sessionId,
        message,
        context: context || {},
      });
    } catch {
      return {
        reply:
          'Soy el asistente virtual de Power Zone (modo fallback). El servicio de IA no está disponible: ' +
          'puedes consultar horarios de clases, estado de tu membresía o pedir ayuda a recepción.',
      };
    }
  }

  /**
   * Generación de rutinas vía IA. Devuelve el mismo formato que la generación local.
   */
  async generateRoutine(payload: {
    userId: string;
    objective: string;
    daysPerWeek: number;
    difficulty?: number;
  }): Promise<{ title: string; description: string; exercises: any[] }> {
    return this.post('/routines/generate', {
      user_id: payload.userId,
      objective: payload.objective,
      days_per_week: payload.daysPerWeek,
      difficulty: payload.difficulty,
    });
  }

  async recommendWorkout(userId: string, context?: Record<string, any>): Promise<any> {
    try {
      return await this.post('/recommendations/workout', {
        user_id: userId,
        context: context || {},
      });
    } catch {
      return {
        recommendation:
          'Te sugerimos una sesión equilibrada: 10 min de calentamiento, 40 min de fuerza y 10 min de cardio. (fallback local)',
      };
    }
  }

  async recommendNutrition(userId: string, context?: Record<string, any>): Promise<any> {
    try {
      return await this.post('/recommendations/nutrition', {
        user_id: userId,
        context: context || {},
      });
    } catch {
      return {
        recommendation:
          'Mantén entre 1.6 y 2.2 g de proteína por kilo de peso corporal. Prioriza alimentos integrales. (fallback local)',
      };
    }
  }
}
