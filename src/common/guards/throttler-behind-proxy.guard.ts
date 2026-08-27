import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Guard de rate limiting que respeta X-Forwarded-For para que el límite
 * cuente por IP real cuando hay proxies delante del servidor.
 */
@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.ips?.length ? req.ips[0] : req.ip;
  }
}