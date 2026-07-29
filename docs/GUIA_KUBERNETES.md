# 🍷 CavaLocal — Guía de Despliegue con Kubernetes

---

## 1. Microservicio de Auditoría — Funcionamiento y Comunicación

### 1.1 ¿Para qué sirve?

El microservicio de auditoría registra **cada acción importante** que ocurre en el sistema:  
registros de usuarios, inicios de sesión, creación de reservas, pagos, cancelaciones, etc.  
Expone además una **API REST con paginación y filtros** para consultar ese historial.

---

### 1.2 Arquitectura de Comunicación

```
┌───────────────────────────────────────────────────────────────┐
│                      KUBERNETES CLUSTER                        │
│                     (namespace: cavalocal)                     │
│                                                               │
│  ┌──────────────┐   emit('audit_event')   ┌─────────────┐    │
│  │   Backend    │ ───────────────────────► │  RabbitMQ   │    │
│  │  (NestJS)    │                          │  (queue:    │    │
│  │  :3001       │                          │ audit_queue)│    │
│  └──────────────┘                          └──────┬──────┘    │
│                                                   │           │
│                                         consume (noAck:false) │
│                                                   │           │
│                                            ┌──────▼──────┐   │
│                                            │  ms-audit   │   │
│                                            │  (x2 pods)  │   │
│                                            │  :3002      │   │
│                                            └──────┬──────┘   │
│                                                   │           │
│                                           ACK manual          │
│                                                   │           │
│                                            ┌──────▼──────┐   │
│                                            │  PostgreSQL │   │
│                                            │  cavalocal  │   │
│                                            │  :5432      │   │
│                                            └─────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  API REST: GET /audit-logs  (consulta + paginacion)  │    │
│  └──────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
```

---

### 1.3 Flujo paso a paso

#### Paso A — El Backend publica el evento

Cuando ocurre una acción (login, reserva, pago...), el backend llama a `AuditPublisherService.publish()`:

```typescript
// backend/src/common/audit/audit-publisher.service.ts
this.client.emit('audit_event', {
  entity: 'User',
  action: 'LOGIN',
  userId: '123',
  userEmail: 'usuario@ejemplo.com',
  timestamp: new Date().toISOString(),
  data: { before: null, after: { id: '123', name: 'Juan' } }
});
```

El backend se conecta a RabbitMQ como **productor** usando el token `AUDIT_SERVICE` (ClientProxy de NestJS Microservices). El evento se encola en `audit_queue` con durabilidad habilitada (`durable: true`).

---

#### Paso B — RabbitMQ almacena el mensaje en la cola

La cola `audit_queue` es **durable** (sobrevive reinicios de RabbitMQ).  
El mensaje queda pendiente hasta que un pod del microservicio lo consuma.

---

#### Paso C — El Microservicio de Auditoría consume el mensaje

```typescript
// audit-service/src/audit/audit.consumer.ts
@EventPattern('audit_event')
async handleAuditEvent(@Payload() data: any, @Ctx() context: RmqContext) {
  const channel = context.getChannelRef();
  const originalMsg = context.getMessage();

  try {
    await this.auditService.createAuditLog(data);   // Persiste en PostgreSQL
    channel.ack(originalMsg);                         // ACK manual
  } catch (err) {
    channel.nack(originalMsg, false, false);          // NACK -> dead-letter
  }
}
```

> **ACK manual (noAck: false)**: el mensaje solo se confirma y elimina de la cola **despues de persistir exitosamente** en la base de datos. Si falla antes del ACK, RabbitMQ reencola el mensaje automaticamente.

---

#### Paso D — Modelo de datos (tabla `AuditLog`)

| Campo | Tipo | Descripcion |
|---|---|---|
| `id` | UUID | Identificador unico |
| `entity` | String | Entidad afectada (`User`, `Reservation`, `Review`) |
| `action` | String | Accion ejecutada (`LOGIN`, `REGISTER`, `CREATE`, `PAY`, `CANCEL`) |
| `userId` | String? | ID del usuario que realizo la accion |
| `userEmail` | String? | Email del usuario |
| `timestamp` | DateTime | Momento en que ocurrio la accion |
| `data` | JSON | Payload con estado `before` y `after` (util para updates) |

---

#### Paso E — API REST de consulta

El microservicio expone en el puerto `3002`:

| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET` | `/audit-logs` | Lista con paginacion y filtros |
| `GET` | `/audit-logs/:id` | Detalle de un registro |
| `GET` | `/audit-logs/stream` | Stream SSE en tiempo real |
| `GET` | `/health` | Health check (usado por K8s) |
| `GET` | `/docs` | Swagger UI |

**Filtros disponibles** (`/audit-logs?...`):
```
?page=1&pageSize=20
?entity=User
?action=LOGIN
?user=juan@ejemplo.com
?startDate=2026-01-01&endDate=2026-12-31
```

---

### 1.4 Escalabilidad horizontal (2 replicas en K8s)

El microservicio corre con **2 pods** (`replicas: 2`). RabbitMQ distribuye los mensajes entre ellos en modo **cola competitiva**: cada mensaje es consumido por **un solo pod**, sin duplicados.

```
RabbitMQ audit_queue
        |
   ┌────┴────┐
   v         v
ms-audit-1  ms-audit-2   (cada mensaje va a uno solo)
```

---

## 2. Despliegue en Kubernetes (Minikube)

### 2.1 Requisitos previos

- Minikube instalado
- kubectl instalado
- Docker instalado y corriendo

---

### 2.2 Paso 1 — Iniciar Minikube

```powershell
minikube start
```

Verificar que esta corriendo:

```powershell
minikube status
```

Debe mostrar:
```
host: Running
kubelet: Running
apiserver: Running
kubeconfig: Configured
```

---

### 2.3 Paso 2 — Apuntar al Docker daemon de Minikube

> **CRITICO**: las imagenes deben construirse DENTRO de Minikube.
> Sin este paso, K8s no encontrara las imagenes locales (ImagePullBackOff).

```powershell
# En PowerShell (Windows)
minikube -p minikube docker-env | Invoke-Expression
```

Para confirmar que funciono:
```powershell
docker images
```

---

### 2.4 Paso 3 — Construir las 3 imagenes Docker

Desde la **raiz del repositorio**:

```powershell
# 1. Backend NestJS
docker build -t cavalocal-backend:latest ./backend

# 2. Microservicio de Auditoria
docker build -t cavalocal-audit-service:latest ./audit-service

# 3. Frontend (carpeta web/)
docker build -t cavalocal-frontend:latest ./web
```

Verificar que las imagenes existen:
```powershell
docker images | Select-String "cavalocal"
```

---

### 2.5 Paso 4 — Habilitar el Ingress Controller

```powershell
minikube addons enable ingress
```

Esperar a que el pod del ingress este listo:
```powershell
kubectl get pods -n ingress-nginx -w
```

---

### 2.6 Paso 5 — Aplicar todos los manifiestos

```powershell
kubectl apply -f k8s/
```

Salida esperada:
```
namespace/cavalocal created
configmap/cavalocal-config created
secret/vinos-secret created
persistentvolumeclaim/db-cavalocal-pvc created
deployment.apps/db-cavalocal created
service/db-cavalocal created
persistentvolumeclaim/rabbitmq-pvc created
deployment.apps/rabbitmq created
service/rabbitmq created
deployment.apps/backend created
service/backend created
deployment.apps/ms-audit created
service/ms-audit created
deployment.apps/frontend created
service/frontend created
ingress.networking.k8s.io/cavalocal-ingress created
```

---

### 2.7 Paso 6 — Esperar que todos los pods esten Running

```powershell
kubectl get pods -n cavalocal -w
```

Estado esperado (puede tardar 2-4 minutos):
```
NAME                           READY   STATUS    RESTARTS
db-cavalocal-xxx               1/1     Running   0
rabbitmq-xxx                   1/1     Running   0
backend-xxx                    1/1     Running   0
ms-audit-xxx (pod 1)           1/1     Running   0
ms-audit-xxx (pod 2)           1/1     Running   0
frontend-xxx                   1/1     Running   0
```

---

### 2.8 Paso 7 — Configurar el dominio en el archivo hosts

Obtener la IP de Minikube:
```powershell
minikube ip
```

Abrir el archivo hosts **como Administrador**:
```powershell
notepad C:\Windows\System32\drivers\etc\hosts
```

Agregar al final (reemplaza `<IP>` con la IP obtenida):
```
<IP>  conjunta3p.espe.edu.ec
```

---

### 2.9 Paso 8 — Verificar el Ingress

```powershell
kubectl get ingress -n cavalocal
```

Debe mostrar la IP asignada en la columna `ADDRESS`.

---

## 3. Verificacion del Sistema

### 3.1 Health checks

```powershell
# Backend
curl http://conjunta3p.espe.edu.ec/api/health

# Microservicio de auditoria
curl http://conjunta3p.espe.edu.ec/api/audit/health
```

### 3.2 Consultar logs de auditoria

```powershell
curl http://conjunta3p.espe.edu.ec/api/audit/audit-logs
```

### 3.3 Frontend

Abrir en el navegador:
```
http://conjunta3p.espe.edu.ec/
```

---

## 4. Diagnostico de Problemas

### Ver logs de un pod especifico

```powershell
# Listar pods
kubectl get pods -n cavalocal

# Ver logs
kubectl logs <nombre-del-pod> -n cavalocal

# Seguir logs en tiempo real
kubectl logs -f <nombre-del-pod> -n cavalocal
```

### Describir un pod que falla

```powershell
kubectl describe pod <nombre-del-pod> -n cavalocal
```

### Reiniciar un deployment

```powershell
kubectl rollout restart deployment/ms-audit -n cavalocal
```

### Escalar el microservicio de auditoria

```powershell
kubectl scale deployment ms-audit -n cavalocal --replicas=3
```

### Dashboard visual de Minikube

```powershell
minikube dashboard
```

---

## 5. Rutas del Ingress (dominio: conjunta3p.espe.edu.ec)

| URL | Servicio destino |
|---|---|
| `http://conjunta3p.espe.edu.ec/` | Frontend (Nginx, puerto 80) |
| `http://conjunta3p.espe.edu.ec/dashboard` | Frontend |
| `http://conjunta3p.espe.edu.ec/api/...` | Backend NestJS (puerto 3001) |
| `http://conjunta3p.espe.edu.ec/api/audit/...` | Microservicio Auditoria (puerto 3002) |
