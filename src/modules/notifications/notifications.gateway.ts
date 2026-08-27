import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: 'notifications',
  cors: { origin: '*' },
})
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  handleConnection(client: any): void {
    const userId = client.handshake?.auth?.userId as string | undefined;
    if (userId) {
      void client.join(`user:${userId}`);
    }
    this.logger.log(`Cliente conectado a /notifications (socket ${client.id})`);
  }

  handleDisconnect(client: any): void {
    this.logger.log(`Cliente desconectado de /notifications (socket ${client.id})`);
  }

  @SubscribeMessage('subscribe:user')
  handleSubscribe(@MessageBody() body: { userId: string }, @ConnectedSocket() client: any): void {
    if (body?.userId) {
      void client.join(`user:${body.userId}`);
    }
  }

  emitTo(userId: string, event: string, payload: unknown): void {
    this.server?.to(`user:${userId}`).emit(event, payload);
  }
}