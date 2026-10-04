import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable({ providedIn: 'root' })
export class AiService {
  constructor(private api: ApiService) {}

  health(): Observable<{ status: string }> {
    return this.api.get<{ status: string }>('/ai-proxy/health');
  }

  chat(
    message: string,
    sessionId: string,
    context: Record<string, unknown>,
  ): Observable<{ reply: string }> {
    return this.api.post<{ reply: string }>('/ai-proxy/chat', {
      message,
      sessionId,
      context,
    });
  }
}
