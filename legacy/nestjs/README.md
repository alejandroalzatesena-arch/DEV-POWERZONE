# Power Zone Backend CD

Sistema de gestión integral para gimnasios **"Power Zone"**. Backend desarrollado con **NestJS 11**, **TypeORM** y **PostgreSQL**, con caché y tiempo real vía **Redis**, pagos con **Stripe** (y modo mock), e integración con un servicio de IA en **FastAPI**.

> Proyecto académico propuesto dentro del programa de formación de **Analistas y Programadores de Software**.

---

## 1. Características

- **Autenticación JWT** (access + refresh con rotación), registro, cierre de sesión y cambio de contraseña.
- **Control de roles**: `superadmin`, `admin`, `trainer`, `receptionist` y `client`.
- **Multi-sucursal**: gestión de gimnasios y operación aislada por sucursal.
- **Membresías**: planes, asignación, renovación y vencimiento automático.
- **Pagos**: integración con **Stripe** (checkout/charges) y **modo mock** cuando no hay clave configurada; webhooks firmados.
- **Rutinas y clases**: creación de rutinas con ejercicios, reservas de clases con lista de espera.
- **Asistencia**: check-in/check-out con **ocupación en tiempo real** (Redis + WebSocket).
- **Inventario**: control de equipos, stock y mantenimientos.
- **Nutrición**: catálogo de alimentos y registro/diario de macros.
- **Notificaciones**: envío y consulta en tiempo real por WebSocket.
- **Marketing**: campañas segmentadas con programación de envío y cancelación.
- **Reportes**: financieros, operativos, membresías, asistencia y progreso, con **exportación a CSV** y estado de carga con skeletons.
- **Check-in QR**: los clientes obtienen un QR propio en Asistencia y el personal puede registrar ingresos escaneando/pegando ese código.
- **Tema claro/oscuro**: toggle desde el menú de usuario del frontend (persistido en localStorage y con fallback a `prefers-color-scheme`).
- **IA**: proxy seguro hacia un servicio de IA (FastAPI) con fallback local, y contexto enriquecido (membresía, rutinas, asistencia y nutrición del usuario).
- **Seguridad**: helmet, CORS, rate limiting (Throttler), DTOs de validación, filtro global de excepciones y **bloqueo automático por intentos fallidos de login** (5 intentos / 15 min).
- **Jobs programados** (`@nestjs/schedule`): expiración automática de membresías vencidas (02:00) y envío de campañas de marketing programadas (cada 5 min).
- **Documentación Swagger** automática.

---

## 2. Stack tecnológico

| Capa        | Tecnología                                        |
| ----------- | ------------------------------------------------- |
| Framework   | NestJS 11 + Node.js                               |
| ORM         | TypeORM 0.3                                       |
| Base de datos | PostgreSQL 16                                   |
| Caché / Tiempo real | Redis 7 + Socket.IO                       |
| Pagos       | Stripe (SDK oficial)                              |
| IA          | FastAPI (Python) + proxy en NestJS                |
| Documentación | Swagger / OpenAPI                               |
| Validación  | class-validator + class-transformer               |
| Seguridad   | Helmet, Throttler, Passport-JWT, bcrypt           |

---

## 3. Estructura del proyecto

```
powerzone-backend/
├── ai-service/               # Servicio de IA (FastAPI): /chat, rutinas, recomendaciones
├── frontend/                 # Aplicación Angular (cliente web del sistema)
├── src/
│   ├── common/               # Enums, entidades base, guards, filtros, interceptores, Redis
│   ├── config/               # Configuración por factor y validación de variables de entorno
│   ├── database/
│   │   ├── migrations/       # Migración inicial (todas las tablas, FKs e índices)
│   │   ├── seeds/            # Datos de desarrollo (seed.ts / clear.ts)
│   │   └── data-source.ts    # DataSource para la CLI de TypeORM
│   ├── modules/              # Módulos de dominio (ver tabla de abajo)
│   ├── app.module.ts         # Módulo raíz
│   ├── app.controller.ts     # Health check público (GET /api/health)
│   └── main.ts               # Bootstrap: helmet, CORS, prefijo /api, Swagger
├── test/                     # Smoke e2e (health + OpenAPI)
├── docker-compose.yml        # PostgreSQL 16 + Redis 7
├── eslint.config.mjs
├── tsconfig.json / tsconfig.build.json
└── package.json
```

### Módulos de dominio

| Módulo        | Responsabilidad                                     |
| ------------- | --------------------------------------------------- |
| `auth`        | Login, registro, refresh (rotación), logout, cambio de contraseña |
| `gyms`        | Sucursales del gimnasio                             |
| `users`       | Usuarios y perfiles corporales                      |
| `memberships` | Tipos de membresía y membresías asignadas           |
| `payments`    | Stripe, modo mock y webhooks                        |
| `exercises`   | Catálogo de ejercicios                              |
| `routines`    | Rutinas y detalle de ejercicios                     |
| `classes`     | Clases, reservas y lista de espera                  |
| `attendance`  | Asistencia y ocupación en tiempo real (Gateway)     |
| `inventory`   | Inventario y mantenimientos                         |
| `nutrition`   | Alimentos y registros nutricionales                 |
| `notifications` | Notificaciones en tiempo real (Gateway)           |
| `marketing`   | Campañas segmentadas                                |
| `reports`     | Reportes financieros y operativos                   |
| `ai-proxy`    | Proxy seguro hacia el servicio de IA                |

---

## 4. Requisitos previos

- Node.js **18+** (recomendado 20/22)
- npm **9+**
- Docker Desktop (para PostgreSQL y Redis) **o** instancias locales de ambos
- Python **3.10+** (solo si se quiere levantar el servicio de IA)

---

## 5. Puesta en marcha rápida

> **Nota de puertos**: el archivo `docker-compose.run.yml` sobrescribe los puertos locales a **5433** (PostgreSQL) y **6380** (Redis), que son los que usa el `.env` de desarrollo. Usa el comando de abajo con ambos archivos.

1. **Instalar dependencias del backend**

   ```bash
   npm install
   ```

2. **Instalar dependencias del frontend**

   ```bash
   cd frontend
   npm install
   cd ..
   ```

3. **Levantar PostgreSQL y Redis** (puertos 5433/6380)

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.run.yml up -d
   ```
   *(Si prefieres los puertos por defecto 5432/6379, omite `docker-compose.run.yml` y ajusta `DB_PORT`/`REDIS_PORT` en `.env`.)*

4. **Configurar variables de entorno**

   ```bash
   cp .env.example .env
   ```

   En desarrollo, `DB_SYNCHRONIZE=true` crea el esquema automáticamente. Para usar migraciones, cambia el valor y ejecuta `npm run migration:run`.

5. **Cargar datos de demostración** (opcional)

   ```bash
   npm run seed
   ```

6. **Arrancar el backend**

   ```bash
   npm run start:dev
   ```

7. **Arrancar el frontend** (terminal aparte)

   ```bash
   cd frontend
   npm start        # ng serve → http://localhost:4200
   ```

   El frontend usa un proxy (`proxy.conf.json`) que redirige `/api` al backend en `http://localhost:3000`.

La API quedará disponible en `http://localhost:3000/api`, la documentación en `http://localhost:3000/api/docs` y el frontend en `http://localhost:4200`.

---

## 6. Variables de entorno

| Variable                 | Descripción                              | Valor por defecto        |
| ------------------------ | ---------------------------------------- | ------------------------ |
| `NODE_ENV`               | Entorno de ejecución                     | `development`            |
| `PORT`                   | Puerto del servidor                      | `3000`                   |
| `API_PREFIX`             | Prefijo global de la API                 | `api`                    |
| `APP_NAME`               | Nombre de la aplicación                  | `Power Zone API`         |
| `CORS_ORIGINS`           | Orígenes permitidos (separados por coma) | `http://localhost:3001,http://localhost:5173` |
| `BCRYPT_ROUNDS`          | Rondas de hash de contraseñas            | `10`                     |
| `DB_HOST` / `DB_PORT`    | Host y puerto de PostgreSQL              | `localhost` / `5432`     |
| `DB_USER` / `DB_PASSWORD`| Credenciales de PostgreSQL               | `postgres` / `postgres`  |
| `DB_NAME`                | Nombre de la base de datos               | `powerzone`              |
| `DB_SYNCHRONIZE`         | Sincronizar esquema automáticamente      | `true` (solo desarrollo) |
| `DB_LOGGING`             | Logs de SQL                              | `false`                  |
| `REDIS_HOST` / `REDIS_PORT` | Host y puerto de Redis                 | `localhost` / `6379`     |
| `REDIS_PASSWORD`         | Contraseña de Redis (vacía en local)     | *(vacío)*                |
| `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` | Secretos JWT          | *(cambiarlos en prod)*   |
| `JWT_ACCESS_EXPIRES_IN`  | Expiración del access token              | `15m`                    |
| `JWT_REFRESH_EXPIRES_IN` | Expiración del refresh token             | `7d`                     |
| `STRIPE_SECRET_KEY`      | Clave secreta de Stripe (vacía => mock)  | *(vacío)*                |
| `STRIPE_WEBHOOK_SECRET`  | Secreto del webhook de Stripe            | *(vacío)*                |
| `STRIPE_CURRENCY`        | Moneda de los pagos                      | `usd`                    |
| `AI_SERVICE_URL`         | URL del servicio de IA (FastAPI)         | `http://localhost:8000`  |
| `AI_SERVICE_API_KEY`     | Clave interna para el servicio de IA     | `internal-ai-key`        |
| `THROTTLE_TTL` / `THROTTLE_LIMIT` | Rate limiting (segundos / peticiones) | `60` / `100`     |

---

## 7. Autenticación y roles

- Los endpoints protegidos requieren el header `Authorization: Bearer <token>`.
- El flujo de autenticación expira el access token (`15m`) y rota el refresh token (`7d`).
- Los **roles** controlan el acceso por endpoint mediante guards:

| Rol          | Descripción                                        |
| ------------ | -------------------------------------------------- |
| `superadmin` | Operación global sobre todas las sucursales        |
| `admin`      | Gestión completa de la sucursal                    |
| `trainer`    | Rutinas, clases y seguimiento de progreso          |
| `receptionist` | Membresías, pagos y asistencia                   |
| `client`     | Perfil, membresía y reservas                       |

---

## 8. Documentación de la API

Con el servidor corriendo, abre:

```
http://localhost:3000/api/docs
```

Usa el botón **Authorize** del Swagger para adjuntar el token JWT a todas las peticiones.

---

## 9. Base de datos y migraciones

La migración inicial crea todas las tablas, claves foráneas e índices. Para gestionarla con la CLI de TypeORM:

```bash
# Crear la base de datos y aplicar migraciones
npm run migration:run

# Revertir la última migración
npm run migration:revert

# Generar una nueva migración a partir de los cambios en las entidades
npm run migration:generate

# Sincronizar el esquema directamente (solo desarrollo)
npm run schema:sync
```

---

## 10. Datos de demostración (seed)

Poblado con el comando `npm run seed`: una sucursal, **6 usuarios**, tipos de membresía con pagos, **12 ejercicios**, **11 alimentos**, clases con reservas, asistencia, registros nutricionales e inventario.

Usuarios de prueba (contraseña `PowerZone2024!`):

| Email                    | Rol          |
| ------------------------ | ------------ |
| superadmin@powerzone.app | superadmin   |
| admin@powerzone.app      | admin        |
| trainer@powerzone.app    | trainer      |
| reception@powerzone.app  | receptionist |
| client@powerzone.app     | client       |
| client2@powerzone.app    | client       |

Para limpiar los datos: `npm run seed:clear`.

---

## 11. Servicio de IA (FastAPI)

El módulo `ai-proxy` delega en `ai-service` y, si el servicio no responde, usa un **fallback local**. Para levantarlo:

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Endpoints del servicio: `GET /health`, `POST /chat`, `POST /routines/generate`, `POST /recommendations/workout` y `POST /recommendations/nutrition`, protegidos con el header `X-AI-Key`.

---

## 12. Tiempo real (WebSockets)

- **NotificationsGateway** (`/notifications`): notificaciones en vivo por usuario.
- **AttendanceGateway** (`/occupancy`): ocupación del gimnasio en tiempo real, respaldada por contadores en Redis.

---

## 13. Scripts disponibles

| Script                | Comando                          |
| --------------------- | -------------------------------- |
| `npm run build`       | Compila a `dist/`                |
| `npm run start:dev`   | Arranque con watch               |
| `npm run start:prod`  | Arranca el build                  |
| `npm run lint`        | ESLint (fix automático)          |
| `npm run typecheck`   | TypeScript sin emitir            |
| `npm run format`      | Prettier                         |
| `npm run seed`        | Datos de demostración            |
| `npm run seed:clear`  | Limpia datos                     |
| `npm run migration:run` | Aplica migraciones             |
| `npm test`            | Tests unitarios (Jest, sin infraestructura) |
| `npm run test:watch`  | Tests unitarios en watch         |
| `npm run test:cov`    | Cobertura de tests               |
| `npm run test:e2e`    | Tests end-to-end (requieren PostgreSQL y Redis arriba) |

---

## 14. Estrategia de ramas y convención de commits

- La rama principal es `main`, con merges `--no-ff` de ramas de funcionalidad.
- Cada módulo se desarrolló en su propia rama `feat/<módulo>`.
- Los mensajes de commit siguen **Conventional Commits**: `feat(scope): descripción`, `chore: ...`, `fix(...): ...`, `docs: ...`, `merge: ...`.

**Ramas feature:**

```
feat/auth  feat/users  feat/gyms  feat/memberships  feat/payments
feat/exercises  feat/routines  feat/classes  feat/attendance
feat/inventory  feat/nutrition  feat/notifications  feat/marketing
feat/reports  feat/ai-proxy
```

---

## 15. Despliegue y producción

- Desactiva `DB_SYNCHRONIZE` (`false`) y ejecuta `npm run migration:run` de forma controlada.
- Cambia `JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` por secretos robustos.
- Configura `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` reales para activar pagos.
- Restringe `CORS_ORIGINS` y coloca un reverso proxy (nginx/Caddy) para terminar TLS.
- Ajusta `THROTTLE_LIMIT` según la escala esperada.

---

## 16. Calidad del código

- **Build**: `npm run build` → exit 0.
- **Lint**: `npm run lint` → exit 0 (0 errores; avisos de `no-explicit-any` heredados).
- **Typecheck**: `npm run typecheck` → exit 0.
- **Tests unitarios**: `npm test` → exit 0 (validación de entorno y health check).
- **Smoke e2e**: `npm run test:e2e` → exit 0 con PostgreSQL/Redis levantados (`GET /api/health` y `GET /api/docs-json`).

---

## 17. Licencia

Proyecto académico con fines educativos. MIT.