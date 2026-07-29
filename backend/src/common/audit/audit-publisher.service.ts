import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

export interface AuditEventPayload {
  entity: string;
  action: string;
  userId?: string;
  userEmail?: string;
  data?: {
    before?: any;
    after?: any;
    [key: string]: any;
  };
  timestamp?: string | Date;
}

@Injectable()
export class AuditPublisherService {
  private readonly logger = new Logger(AuditPublisherService.name);

  constructor(@Inject('AUDIT_SERVICE') private readonly client: ClientProxy) {}

  publish(event: AuditEventPayload): void {
    const payload = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    };
    try {
      this.client.emit('audit_event', payload);
      this.logger.log(`[AuditPublisher] Publicado evento de auditoría: ${event.entity} -> ${event.action}`);
    } catch (err: any) {
      this.logger.error(`[AuditPublisher] Error publicando evento de auditoría: ${err.message}`, err.stack);
    }
  }
}
