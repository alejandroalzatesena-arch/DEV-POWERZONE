import { Injectable } from '@angular/core';
import { TokenService } from './token.service';

type RealtimeEvent = { event: string; data: unknown };

@Injectable({ providedIn: 'root' })
export class SocketService {
  private notifications?: WebSocket;
  private occupancy?: WebSocket;
  private notificationGeneration = 0;
  private occupancyGeneration = 0;

  constructor(private token: TokenService) {}

  private connect(topic: string, onEvent: (data: unknown) => void, generation: number,
    currentGeneration: () => number, assign: (socket: WebSocket) => void): void {
    const access = this.token.access;
    if (!access) return;
    const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${scheme}//${location.host}/api/ws?${topic}`, ['pz', `jwt.${access}`]);
    assign(socket);
    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as RealtimeEvent;
        if (event.event === 'notification' || event.event === 'occupancy') onEvent(event.data);
      } catch { /* ignore malformed realtime event */ }
    };
    socket.onclose = () => {
      if (currentGeneration() === generation) {
        window.setTimeout(() => {
          if (currentGeneration() === generation) this.connect(topic, onEvent, generation, currentGeneration, assign);
        }, 3000);
      }
    };
  }

  connectNotifications(_userId: string, onNotification: (data: unknown) => void): void {
    this.disconnectNotifications();
    const generation = this.notificationGeneration;
    this.connect('topic=notifications', onNotification, generation,
      () => this.notificationGeneration, socket => { this.notifications = socket; });
  }

  disconnectNotifications(): void {
    this.notificationGeneration++;
    this.notifications?.close();
    this.notifications = undefined;
  }

  connectOccupancy(gymId: string, onOccupancy: (data: unknown) => void): void {
    this.disconnectOccupancy();
    const generation = this.occupancyGeneration;
    this.connect(`topic=occupancy&gymId=${encodeURIComponent(gymId)}`, onOccupancy, generation,
      () => this.occupancyGeneration, socket => { this.occupancy = socket; });
  }

  disconnectOccupancy(): void {
    this.occupancyGeneration++;
    this.occupancy?.close();
    this.occupancy = undefined;
  }
}
