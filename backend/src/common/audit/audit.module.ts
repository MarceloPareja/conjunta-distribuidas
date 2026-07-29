import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuditPublisherService } from './audit-publisher.service';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'AUDIT_SERVICE',
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.get<string>('RABBITMQ_URL') ?? 'amqp://guest:guest@localhost:5672'],
            queue: 'audit_queue',
            queueOptions: {
              durable: true,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [AuditPublisherService],
  exports: [AuditPublisherService],
})
export class AuditModule {}
