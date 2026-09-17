import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { TokenService } from './token.service';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private notifications?: Socket;
  private occupancy?: Socket;

  constructor(private token: TokenService) {}

  connectNotifications(userId: string, onNotification: (data: unknown) => void): void {
    this.disconnectNotifications();
    this.notifications = io('http://localhost:3000/notifications', {
      auth: { userId },
      transports: ['websocket', 'polling'],
    });
    this.notifications.on('connect', () => {
      this.notifications?.emit('subscribe:user', { userId });
    });
    this.notifications.on('notification', onNotification);
  }

  disconnectNotifications(): void {
    this.notifications?.disconnect();
    this.notifications = undefined;
  }

  connectOccupancy(gymId: string, onOccupancy: (data: unknown) => void): void {
    this.disconnectOccupancy();
    this.occupancy = io('http://localhost:3000/attendance', {
      query: { gymId },
      transports: ['websocket', 'polling'],
    });
    this.occupancy.on('connect', () => {
      this.occupancy?.emit('subscribe:gym', { gymId });
    });
    this.occupancy.on('occupancy', onOccupancy);
    this.occupancy.on('ping', () => this.occupancy?.emit('ping', { pong: true }));
  }

  disconnectOccupancy(): void {
    this.occupancy?.disconnect();
    this.occupancy = undefined;
  }
}