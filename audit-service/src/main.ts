import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const rmqUrl = config.get<string>('RABBITMQ_URL') ?? 'amqp://guest:guest@localhost:5672';
  const queueName = config.get<string>('RABBITMQ_QUEUE') ?? 'audit_queue';

  // Configurar microservicio RabbitMQ con confirmación manual (noAck: false)
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [rmqUrl],
      queue: queueName,
      noAck: false, // Confirmación manual (ACK manual) tras persistir exitosamente
      queueOptions: {
        durable: true,
      },
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const corsOrigins = config.get<string[]>('corsOrigins') ?? ['*'];
  app.enableCors({ origin: corsOrigins.includes('*') ? true : corsOrigins });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('CavaLocal Audit Microservice API')
    .setDescription('Microservicio REST y consumidor asíncrono RabbitMQ para auditoría')
    .setVersion('0.1.0')
    .build();
  const document = SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, swaggerConfig));

  await app.startAllMicroservices();

  const port = config.get<number>('PORT') ?? 3002;
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`[AuditService] REST API corriendo en http://localhost:${port} - Swagger en http://localhost:${port}/docs`);
  // eslint-disable-next-line no-console
  console.log(`[AuditService] Escuchando cola RabbitMQ '${queueName}' en ${rmqUrl} (noAck: false)`);
}
bootstrap();
