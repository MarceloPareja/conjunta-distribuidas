# Guía de Instalación y Despliegue de Kubernetes en Windows 11 con Minikube

> Basado en: *Guía de instalación de Kubernetes en Windows 11 con Minikube* — Universidad de las Fuerzas Armadas ESPE, Aplicaciones Distribuidas.

## Objetivo

Instalar y configurar un clúster local de Kubernetes en Windows 11 usando **Minikube** y **kubectl**, para crear un entorno de pruebas que permita implementar, gestionar y monitorear contenedores de forma orquestada.

---

## 1. Requisitos previos

- Sistema operativo: **Windows 11** (Home, Pro o Enterprise)
- **Virtualización habilitada en la BIOS** (VT-x en Intel o AMD-V en AMD)
- Un hipervisor / administrador de contenedores, por ejemplo:
  - **WSL 2** (recomendado)
  - **Docker**
  - **Hyper-V** (solo ediciones Pro o Enterprise)
- Acceso a **PowerShell como administrador**

### Requisitos mínimos de hardware
- 2 CPU o más
- 2 GB de memoria libre
- 20 GB de espacio libre en disco
- Conexión a Internet
- Un gestor de contenedores/VMs: Docker, QEMU, Hyperkit, Hyper-V, KVM, Parallels, Podman, VirtualBox o VMware Fusion/Workstation

---

## 2. Instalación de Minikube

Minikube es una versión local de Kubernetes pensada para aprendizaje y desarrollo. Requiere tener instalado Docker (o un entorno de máquina virtual compatible).

📘 Documentación oficial: https://minikube.sigs.k8s.io/docs/start

### Opción A — Windows Package Manager (winget)
```powershell
winget install Kubernetes.minikube
```

### Opción B — Chocolatey
```powershell
choco install minikube
```

### Iniciar el clúster
Desde una terminal con permisos de administrador (sin iniciar sesión como root):
```powershell
minikube start
```
✅ **Salida esperada:** el mensaje final debe indicar `Done! kubectl is now configured to use "minikube" cluster and "default" namespace by default`.

---

## 3. Instalación de kubectl (cliente de Kubernetes)

### Opción A — winget
```powershell
winget install -e --id Kubernetes.kubectl
```

### Opción B — Chocolatey
```powershell
choco install kubernetes-cli -y
```
✅ **Salida esperada:** debe aparecer el texto `Successfully installed`.

### Verificar ambas instalaciones
```powershell
minikube version
kubectl version --client
```

---

## 4. Iniciar el clúster con el driver de Docker

Si se cuenta con Docker Desktop o WSL 2 instalado:
```powershell
minikube start --driver=docker
```

### Verificar que el clúster está activo
```powershell
kubectl get nodes
```
Debe mostrarse un nodo `minikube` con estado `Ready` y rol `control-plane`.

### Acceder al Dashboard web
```powershell
minikube dashboard
```
Esto abre automáticamente el Dashboard de Kubernetes en el navegador predeterminado.

> 💡 Si se necesitan todas las funciones del dashboard (métricas), habilitar el addon:
> ```powershell
> minikube addons enable metrics-server
> ```

---

## 5. Deploy de prueba (hello-world)

### Crear y exponer un deployment de ejemplo
```powershell
kubectl create deployment hello-world --image=kicbase/echo-server:1.0
kubectl expose deployment hello-world --type=NodePort --port=8080
```

### Verificar el servicio
```powershell
kubectl get services hello-world
```

### Exponer con port-forward
```powershell
kubectl port-forward service/hello-world 7080:8080
```
Comprobar en el navegador: **http://localhost:7080**

### Limpiar el clúster (al finalizar pruebas)
```powershell
minikube delete --all
```

---

## 6. Conceptos clave: tipos de Service

| Tipo de Service | ¿Qué hace? | Uso típico |
|---|---|---|
| **ClusterIP** | Crea una IP virtual interna del clúster, solo accesible desde dentro | Comunicación interna entre microservicios |
| **NodePort** | Asigna un puerto estático en cada nodo (rango 30000–32767) y reenvía el tráfico al Service | Exponer una app fuera del clúster sin infra extra; ideal para desarrollo con Minikube |
| **LoadBalancer** | Solicita a un proveedor cloud un balanceador de carga externo | Producción en AWS, GCP, Azure |
| **ExternalName** | Mapea el Service a un nombre DNS externo (sin proxy/balanceo interno) | Integrar servicios externos (ej. BD gestionada fuera del clúster) |

### Componentes y funciones

| Componente | Función |
|---|---|
| Docker | Construir imágenes de contenedor |
| kubectl | CLI para interactuar con el clúster |
| Minikube | Ejecuta un clúster Kubernetes local |
| Virtualización | Hypervisor (VirtualBox, Hyper-V o driver Docker) |

---

## 7. Práctica 1 — Despliegue de una SPA (React) con Ingress

Se despliega una imagen pública alojada en Docker Hub: `agcudco/ejemplo-prime-crud`.

### Paso 1 — Iniciar el clúster
```powershell
minikube start --driver=docker
```

### Paso 2 — Habilitar el Ingress Controller
```powershell
minikube addons enable ingress
minikube dashboard
```

### Paso 3 — Verificar que el controlador está corriendo
```powershell
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

### Paso 4 — Crear el Namespace

Un **Namespace** aísla recursos dentro del mismo clúster (Pods, Services, Deployments, ConfigMaps, etc.).

**`1namespace.yml`**
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: prime-crud-ns
```

### Paso 5 — Crear el Deployment

Un **Deployment** gestiona de forma declarativa la creación y actualización de Pods, garantizando que el estado real coincida con el estado deseado (réplicas, rolling updates, rollback automático, escalado).

**`2deployment.yml`**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prime-crud
  namespace: prime-crud-ns
  labels:
    app: prime-crud
spec:
  replicas: 2
  selector:
    matchLabels:
      app: prime-crud
  template:
    metadata:
      labels:
        app: prime-crud
    spec:
      containers:
        - name: app
          image: agcudco/ejemplo-prime-crud:latest   # imagen pública
          ports:
            - containerPort: 80
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 128Mi
```

### Paso 6 — Crear el Service

Un **Service** provee acceso estable a uno o varios Pods, descubriéndolos por etiquetas (selector) y balanceando tráfico entre ellos mediante una IP virtual (ClusterIP).

**`3servicio.yml`**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: prime-crud-svc
  namespace: prime-crud-ns
spec:
  selector:
    app: prime-crud
  ports:
    - port: 80
      targetPort: 80
      protocol: TCP
  type: ClusterIP
```

### Paso 7 — Crear el Ingress

El **Ingress** gestiona el acceso HTTP/HTTPS externo, actuando como reverse proxy que enruta el tráfico según reglas de host/ruta hacia el Service correspondiente (punto único de entrada, terminación TLS, anotaciones para middleware).

**`4ingress.yml`**
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: prime-crud-ingress
  namespace: prime-crud-ns
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
    - host: prime-crud.local   # cambiar por un dominio real si aplica
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: prime-crud-svc
                port:
                  number: 80
```

### Paso 8 — Aplicar los manifiestos
```powershell
kubectl apply -f 1namespace.yml
kubectl apply -f 2deployment.yml
kubectl apply -f 3servicio.yml
kubectl apply -f 4ingress.yml

# verificar el funcionamiento
kubectl get pods -n prime-crud-ns -w
```

### Paso 9 — Configurar el dominio local (archivo hosts)
```powershell
# En Windows (CMD como administrador)
minikube ip
# copiar la IP obtenida

notepad C:\Windows\System32\drivers\etc\hosts
# añadir la línea:
# <IP> prime-crud.local
```

Luego acceder desde el navegador a **http://prime-crud.local**.

### Paso 10 — Diagnóstico en caso de fallos

```powershell
# Comprobar que el namespace existe
kubectl get ns prime-crud-ns

# Ver los pods y sus estados
kubectl get pods -n prime-crud-ns

# Ver el deployment
kubectl get deploy -n prime-crud-ns

# Ver el servicio
kubectl get svc -n prime-crud-ns

# Ver el ingress
kubectl get ingress -n prime-crud-ns

# Ver todo de un vistazo
kubectl get all -n prime-crud-ns
```

Si hay problemas con Ingress/DNS/hosts, usar **port-forward** como alternativa:
```powershell
kubectl port-forward -n prime-crud-ns svc/prime-crud-svc 8080:80
```
Y acceder a **http://localhost:8080**.

---

## 8. Práctica 2 — Aplicación de tres capas (BD + Backend + Frontend)

Esta práctica involucra tres componentes:

1. **Base de datos** — se despliega con `1basededatos.yml`, usando un volumen persistente.
2. **Backend** — proyecto en **Node.js**, API REST que conecta a una base de datos NoSQL (**MongoDB**).
3. **Frontend** — proyecto en **Vue 2**, usa **Vuetify** y consume la API REST del backend.

> ⚠️ **Importante:** para exponer las apps se usa un Ingress, por lo que el addon de ingress debe estar habilitado en Minikube (`minikube addons enable ingress`).

### Pasos

1. Descargar los archivos del repositorio:
   ```
   https://github.com/agcudco/taller-kubernetes.git
   ```
2. Aplicar los manifiestos YAML incluidos en el repositorio (base de datos, backend, frontend) con `kubectl apply -f <archivo>.yml`, de forma similar a la Práctica 1.
3. Si hay problemas con el Ingress, usar port-forward:
   ```powershell
   kubectl port-forward -n ejemplo svc/frontend 8000:80
   ```
4. Acceder a **http://localhost:8000/** — debería verse la aplicación Vuetify con el sistema de tareas (agregar tareas, listado, etc.).

---

## 9. Actividad propuesta

Realizar el despliegue del proyecto **AppPublicaciones** mediante un clúster local de Kubernetes, de modo que sea visible desde la URL:

```
http://app-publicaciones.local
```

**Sugerencia de enfoque** (siguiendo el mismo patrón de la Práctica 1):
1. Crear un Namespace dedicado (ej. `app-publicaciones-ns`).
2. Crear el Deployment con la imagen del proyecto AppPublicaciones.
3. Crear el Service (`ClusterIP`) que apunte al Deployment.
4. Crear el Ingress con `host: app-publicaciones.local` apuntando al Service.
5. Aplicar los manifiestos con `kubectl apply -f`.
6. Obtener la IP de Minikube (`minikube ip`) y añadir la entrada correspondiente en el archivo `hosts` de Windows.
7. Verificar accediendo a `http://app-publicaciones.local` (o mediante `port-forward` si hay problemas con el Ingress/DNS).

---

## 10. Resumen de comandos esenciales

```powershell
# Instalación
winget install Kubernetes.minikube
winget install -e --id Kubernetes.kubectl

# Iniciar clúster
minikube start --driver=docker

# Verificación
kubectl get nodes
minikube version
kubectl version --client

# Dashboard
minikube dashboard

# Ingress
minikube addons enable ingress
kubectl get pods -n ingress-nginx

# Despliegue estándar
kubectl apply -f <archivo>.yml
kubectl get all -n <namespace>

# Exposición alternativa
kubectl port-forward -n <namespace> svc/<servicio> <puerto-local>:<puerto-servicio>

# Limpieza
minikube delete --all
```
