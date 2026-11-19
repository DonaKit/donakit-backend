---
name: nestjs
description: >-
  Guidelines, architectural standards, and workflows for developing the DonaKit backend
  with NestJS 12, TypeScript, Prisma, and Supabase. Use this skill when creating or modifying
  controllers, services, repositories, DTOs, entities, database queries, and testing with Vitest.
---

# NestJS Backend Development Guide (DonaKit)

Directrices y estándares de desarrollo para el backend de **DonaKit**, basado en **NestJS 12**, **TypeScript**, **Prisma** y **Supabase** (PostgreSQL).

---

## 📌 Entorno y Versiones Oficiales

| Herramienta / Paquete | Versión Exacta |
| :--- | :--- |
| **Node.js** | `v24.21.0` (definida en `.nvmrc`) |
| **npm** | `v11.19.0` |
| **NestJS Core / Common** | `v12.0.1` |
| **NestJS CLI** | `v12.0.0` |
| **TypeScript** | `v6.0.2` |
| **Prisma** | `v6.19.3` |
| **Vitest** | `v4.1.2` |
| **Oxlint** | `v1.58.0` |
| **Prettier** | `v3.4.2` |

---

## 🏗️ Arquitectura Modular por Dominio

El backend implementa una arquitectura modular desacoplada:

```text
src/
├── campaign/                  # Módulo de Dominio (ejemplo: campañas / donaciones)
│   ├── dto/                   # Data Transfer Objects validados con class-validator
│   │   ├── create-campaign.dto.ts
│   │   └── campaign-response.dto.ts
│   ├── entities/              # Entidades del dominio
│   │   └── campaign.entity.ts
│   ├── interfaces/            # Contratos e interfaces del repositorio
│   │   └── campaign-repository.interface.ts
│   ├── repositories/          # Implementación de acceso a datos (Prisma)
│   │   ├── campaign.repository.ts
│   │   └── campaign.repository.spec.ts
│   ├── utils/                 # Utilidades del dominio (ej. generación de slugs)
│   ├── campaign.controller.ts # Capa HTTP: enrutamiento, status codes, DTO validation
│   ├── campaign.service.ts    # Lógica de negocio y orquestación
│   └── campaign.module.ts     # Declaración del módulo (@Module)
│
├── common/                    # Capa transversal compartida
│   ├── exceptions/            # Excepciones de negocio personalizadas
│   ├── filters/               # Filtros globales de captura de excepciones
│   ├── middleware/            # Middlewares (ej. snake_case a camelCase)
│   └── pipes/                 # Pipes de validación
│
├── database/                  # Acceso a base de datos
│   ├── prisma.service.ts      # Cliente de conexión Prisma a Supabase
│   ├── test-connection.ts     # Script de diagnóstico de base de datos
│   └── database.module.ts     # Módulo global de base de datos
│
├── app.module.ts              # Módulo raíz
└── main.ts                    # Bootstrap, CORS, filtros globales y puerto
```

### Responsabilidades por Capa:
1. **Controllers (`*.controller.ts`)**:
   - Solo gestionan la capa de entrada HTTP, reciben peticiones, aplican `@UsePipes()` o validación de DTOs y devuelven el código de estado adecuado (`200`, `201`, `204`, etc.).
   - **No contienen lógica de negocio** ni consultas a la base de datos.
2. **Services (`*.service.ts`)**:
   - Contienen la lógica de negocio pura, validaciones de reglas del dominio y orquestación.
   - Anotados con `@Injectable()`.
3. **Repositories (`*.repository.ts`)**:
   - Implementan el patrón Repository aislando la persistencia de datos (PrismaClient).
   - El Service interactúa con el Repository a través de una interfaz TypeScript.
4. **DTOs (`dto/*.dto.ts`)**:
   - Clases estrictamente tipadas con validadores de `class-validator` (`@IsString()`, `@IsNotEmpty()`, `@IsOptional()`, etc.).
5. **Entities (`entities/*.entity.ts`)**:
   - Modelos de datos que representan entidades persistidas.

---

## 🗄️ Base de Datos y Variables de Entorno

- **Carga de variables de entorno**: Node.js nativo usa `process.loadEnvFile()` en `main.ts`, `vitest.config.ts` y scripts de testing.
- **Variables requeridas** en `.env`:
  - `DATABASE_URL`: Connection string transaccional para Supabase.
  - `DIRECT_URL`: Connection string directa para migraciones de Prisma.
- **Prisma Client**:
  - `package.json` incluye `"postinstall": "prisma generate"`.
  - Para aplicar migraciones en desarrollo: `npx prisma migrate dev`.
  - Para abrir Prisma Studio: `npx prisma studio` (puerto 5555).
  - Diagnóstico de conexión: `npm run test:db`.

---

## 🧪 Comandos y Flujo de Calidad

```bash
# Desarrollo con watch
npm run start:dev

# Diagnóstico de base de datos
npm run test:db

# Pruebas unitarias con Vitest
npm test

# Pruebas unitarias en modo watch
npm run test:watch

# Pruebas E2E
npm run test:e2e

# Cobertura de tests
npm run test:cov

# Linter ultra-rápido con Oxlint
npm run lint

# Formateo de código con Prettier
npm run format

# Build de producción
npm run build
```

---

## 🌿 Convención Git y Ramas

1. `US-XXX/ST-XX` (Subtarea) ➔ PR hacia `ft/US-XXX`.
2. `ft/US-XXX` (User Story) ➔ PR hacia `development`.
3. `development` (Integración) ➔ PR hacia `main`.
