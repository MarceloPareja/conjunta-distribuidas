import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { AuditService } from './audit.service';

@Controller()
export class AuditConsumer {
  private readonly logger = new Logger(AuditConsumer.name);

  constructor(private readonly auditService: AuditService) {}

  @EventPattern('audit_event')
  async handleAuditEvent(@Payload() data: any, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.log(`[AuditConsumer] Mensaje recibido desde RabbitMQ: ${data.entity} -> ${data.action}`);
      await this.auditService.createAuditLog(data);

      // Confirmar manualmente (ACK manual) solo después de persistir con éxito
      channel.ack(originalMsg);
      this.logger.log(`[AuditConsumer] Registro persistido en BD y mensaje confirmado (ACK manual) exitosamente.`);
    } catch (err: any) {
      this.logger.error(`[AuditConsumer] Error guardando registro de auditoría: ${err.message}`, err.stack);
      // Nack manual indicando reintento o envío a dead letter queue
      channel.nack(originalMsg, false, false);
    }
  }
}
