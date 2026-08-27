import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';

export interface OccupancyPayload {
  gymId: string;
  current: number;
  maxCapacity: number;
  isFull: boolean;
  updatedAt: string;
}

@WebSocketGateway({
  namespace: 'attendance',
  cors: { origin: '*' },
})
export class AttendanceGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AttendanceGateway.name);

  handleConnection(client: any): void {
    const gymId = client.handshake?.query?.gymId as string | undefined;
    if (gymId) {
      void client.join(`gym:${gymId}`);
    }
    this.logger.log(`Cliente conectado a /attendance (socket ${client.id})`);
  }

  handleDisconnect(client: any): void {
    this.logger.log(`Cliente desconectado de /attendance (socket ${client.id})`);
  }

  @SubscribeMessage('subscribe:gym')
  handleSubscribe(@MessageBody() body: { gymId: string }, client: any): void {
    if (body?.gymId) {
      void client.join(`gym:${body.gymId}`);
    }
  }

  @SubscribeMessage('ping')
  handlePing(): { pong: string } {
    return { pong: new Date().toISOString() };
  }

  /**
   * Emite el estado de ocupación a todos los suscriptores del gimnasio.
   */
  emitOccupancy(payload: OccupancyPayload): void {
    this.server?.to(`gym:${payload.gymId}`).emit('occupancy', payload);
  }
}