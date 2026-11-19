# Plan de Implementación Backend: Gestión de Donantes, Reapertura y Paginación

**Fecha:** 19 de Noviembre de 2026  
**Módulos Afectados:** `src/campaign/` (`campaign.service.ts`, `campaign.controller.ts`, DTOs y pruebas unitarias).  
**Objetivo:** Respaldar a nivel de API y lógica de negocio las reglas de gestión de donantes desde el dashboard:
1. Permitir la edición directa de `currentDonors` y `targetDonors` en campañas activas.
2. Validar la reapertura de campañas completadas cuya meta fue alcanzada (`currentDonors >= targetDonors`), requiriendo una nueva meta superior a los donantes ya conseguidos (o dejándola sin límite con `null`).
3. Bloquear estrictamente la operación de decremento (`-1` / `incrementDonors: -1` o `currentDonors < prevCurrentDonors`) en campañas en estado `COMPLETED` que alcanzaron su meta antes de ser reabiertas.
4. Implementar paginación formal en el endpoint de listado del dashboard administrativo (`GET /institutions/:id/campaigns/dashboard`).

---

## 1. Diagnóstico del Estado Actual en Backend

### 1.1 `CampaignService.adminUpdate` (`src/campaign/campaign.service.ts`)
Actualmente, el método:
- Permite actualizar `currentDonors`, `incrementDonors` y `targetDonors` sin verificar el estado de la campaña en relación a la operación realizada.
- En las líneas 337–351, si la campaña está en `ACTIVE` y `newCurrentDonors >= effectiveTarget`, se transiciona automáticamente a `COMPLETED`.
- **Problema de reapertura sin meta ampliada:** Si un administrador intenta reabrir una campaña con meta alcanzada enviando únicamente `status: "ACTIVE"` y nueva fecha límite sin modificar `targetDonors`, en la siguiente acción de incremento de donante la condición `newCurrentDonors >= effectiveTarget` se cumple de inmediato y vuelve a forzar el estado a `COMPLETED`.
- **Problema de decremento en completadas:** Actualmente un request que reduzca `currentDonors` en una campaña `COMPLETED` no es bloqueado en backend, lo que permite eludir el flujo formal de reapertura.

### 1.2 `AdminUpdateCampaignDto` (`src/campaign/dto/admin-update-campaign.dto.ts`)
- `incrementDonors`: Tiene la regla `@Min(1)`. Por este motivo, peticiones con `incrementDonors: -1` son rechazadas por `class-validator` con un error 400 antes de llegar al servicio, forzando al cliente a usar `currentDonors` absoluto como fallback.
- `targetDonors`: Acepta números enteros positivos o `null`.

---

## 2. Reglas de Negocio a Implementar

### Regla 1: Restricción de decremento en campañas completadas con meta alcanzada
> **"No permitir el -1 en completadas con meta alcanzada antes de reabrir"**

- Si `campaign.status === 'COMPLETED'` y `campaign.targetDonors !== null` y `(campaign.currentDonors ?? 0) >= campaign.targetDonors`:
  - Si el DTO intenta reducir donantes:
    - Vía `incrementDonors < 0`
    - O vía `currentDonors !== undefined && currentDonors < campaign.currentDonors`
  - **Acción:** Lanzar `BadRequestException`:
    > *"No está permitido restar donantes a una campaña completada que alcanzó su meta. Debe reabrir la campaña primero."*

### Regla 2: Reapertura controlada con ampliación de meta
> **"Reabrir campañas completadas con meta alcanzada y pasarla a ACTIVA de nuevo"**

- Si `campaign.status === 'COMPLETED'` y la campaña había alcanzado su meta (`campaign.targetDonors !== null && (campaign.currentDonors ?? 0) >= campaign.targetDonors`):
- Y el administrador solicita reactivarla (`dto.status === 'ACTIVE'`):
  - El backend debe validar que se provea una nueva meta válida:
    - **Opción A (Ampliación de meta):** `dto.targetDonors` debe ser un número entero estrictamente mayor a `campaign.currentDonors`.
    - **Opción B (Sin límite):** `dto.targetDonors === null` (se remueve el tope).
  - Si `dto.targetDonors` no se especifica o es `<= campaign.currentDonors`:
    - **Acción:** Lanzar `BadRequestException`:
      > *"Para reabrir una campaña cuya meta fue alcanzada, debe ingresar una nueva meta de donantes mayor a los donantes ya conseguidos (${campaign.currentDonors}) o dejarla sin límite (null)."*

### Regla 3: Edición directa de donantes en campañas activas
> **"Modificar cantidad de donantes en el dashboard para campañas activas"**

- Si se envía `dto.currentDonors !== undefined`:
  - Si la campaña no se encuentra en `ACTIVE` y el DTO no incluye `status: 'ACTIVE'`:
    - **Acción:** Lanzar `BadRequestException`:
      > *"Solo se puede modificar directamente la cantidad de donantes conseguidos en campañas en estado ACTIVE."*
  - Si la campaña es `ACTIVE` y la nueva cantidad de donantes alcanza o supera la meta efectiva (`effectiveTarget`), se ejecuta la regla ya existente de transición automática a `COMPLETED`.

---

## 3. Propuesta de Código Backend

### 3.1 Actualización de `AdminUpdateCampaignDto` (`src/campaign/dto/admin-update-campaign.dto.ts`)
Para soportar decrementos atómicos sin fallar en `class-validator`, actualizar la restricción de `incrementDonors`:

```typescript
  /**
   * Ajuste incremental o decremental de donantes.
   * Acepta enteros positivos (ej: +1) o negativos (ej: -1 para corregir).
   */
  @Transform(({ obj, value }) => {
    const val = value !== undefined ? value : obj?.increment_donors;
    if (val === undefined) return undefined;
    const num = Number(val);
    return Number.isNaN(num) ? val : num;
  })
  @IsOptional()
  @IsInt({
    message: 'El incremento o decremento de donantes debe ser un número entero.',
  })
  @Min(-100, {
    message: 'El ajuste de donantes no puede ser menor a -100 en una sola operación.',
  })
  @Max(100, {
    message: 'El incremento de donantes no puede exceder 100 en una sola operación.',
  })
  incrementDonors?: number;
```

### 3.2 Actualización de `CampaignService.adminUpdate` (`src/campaign/campaign.service.ts`)

```typescript
    // 1. Validar existencia y pertenencia a la institución
    const campaign = await this.adminFindOne(institutionId, campaignId);

    const actuales = campaign.currentDonors ?? 0;
    const metaPreviaAlcanzada =
      campaign.targetDonors !== null &&
      campaign.targetDonors !== undefined &&
      actuales >= campaign.targetDonors;

    // 2. Calcular nueva cantidad de donantes
    let newCurrentDonors: number | undefined;
    if (dto.incrementDonors !== undefined) {
      newCurrentDonors = Math.max(0, actuales + dto.incrementDonors);
    } else if (dto.currentDonors !== undefined) {
      newCurrentDonors = dto.currentDonors;
    }

    // 3. Regla: No permitir -1 en completadas con meta alcanzada antes de reabrir
    const intentaDecrementar =
      (dto.incrementDonors !== undefined && dto.incrementDonors < 0) ||
      (newCurrentDonors !== undefined && newCurrentDonors < actuales);

    if (campaign.status === 'COMPLETED' && metaPreviaAlcanzada && intentaDecrementar) {
      throw new BadRequestException(
        'No está permitido restar donantes a una campaña completada que alcanzó su meta. Debe reabrir la campaña primero.',
      );
    }

    // 4. Regla: Edición directa de donantes solo en campañas activas (o en reapertura)
    if (
      dto.currentDonors !== undefined &&
      campaign.status !== 'ACTIVE' &&
      dto.status !== 'ACTIVE'
    ) {
      throw new BadRequestException(
        'Solo se puede modificar la cantidad de donantes en campañas que se encuentren activas.',
      );
    }

    // 5. Regla: Reapertura de completadas con meta alcanzada
    if (
      campaign.status === 'COMPLETED' &&
      metaPreviaAlcanzada &&
      dto.status === 'ACTIVE'
    ) {
      const nuevaMeta = dto.targetDonors;
      // Si no envía targetDonors o envía una meta menor o igual a los donantes ya asistidos
      if (nuevaMeta !== null && (nuevaMeta === undefined || nuevaMeta <= actuales)) {
        throw new BadRequestException(
          `Para reabrir una campaña cuya meta fue alcanzada, debe ingresar una nueva meta de donantes mayor a los donantes ya conseguidos (${actuales}) o dejarla sin límite fijado (null).`,
        );
      }
    }
```

---

## 4. Plan de Paginación en Backend

### 4.1 Endpoint: `GET /institutions/:institutionId/campaigns/dashboard`
Actualmente el endpoint devuelve un array completo (`campaigns: []`). Para grandes volúmenes de campañas, debe implementar paginación mediante query params.

### 4.2 DTO de Consulta (`DashboardQueryDto`):
```typescript
export class DashboardCampaignsQueryDto {
  @IsOptional()
  @IsIn(['ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'DRAFT', 'ALL'])
  status?: string = 'ACTIVE';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 30;
}
```

### 4.3 Consulta con Prisma:
```typescript
const [total, campaigns] = await Promise.all([
  this.prisma.campaign.count({ where }),
  this.prisma.campaign.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: 'desc' },
  }),
]);

return {
  campaigns,
  pagination: {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  },
  summary: { ...kpisGlobales },
};
```

---

## 5. Casos de Prueba Unitarios Recomendados (`campaign.service.spec.ts`)

1. **`debe rechazar el decremento de donantes si la campaña está en COMPLETED y alcanzó su meta`**
   - Mock: Campaña con `status: 'COMPLETED'`, `targetDonors: 10`, `currentDonors: 10`.
   - Input: `{ incrementDonors: -1 }` o `{ currentDonors: 9 }`.
   - Expectativa: Lanza `BadRequestException`.

2. **`debe permitir reabrir a ACTIVE una campaña completada si se provee una nueva meta mayor`**
   - Mock: Campaña con `status: 'COMPLETED'`, `targetDonors: 10`, `currentDonors: 10`.
   - Input: `{ status: 'ACTIVE', deadline: '2026-12-01', targetDonors: 15 }`.
   - Expectativa: Actualiza exitosamente y el estado pasa a `ACTIVE`.

3. **`debe permitir reabrir a ACTIVE una campaña completada si se remueve la meta (targetDonors: null)`**
   - Mock: Campaña con `status: 'COMPLETED'`, `targetDonors: 10`, `currentDonors: 10`.
   - Input: `{ status: 'ACTIVE', deadline: '2026-12-01', targetDonors: null }`.
   - Expectativa: Actualiza exitosamente y el estado pasa a `ACTIVE`.

4. **`debe rechazar la reapertura si la nueva meta es menor o igual a los donantes ya conseguidos`**
   - Mock: Campaña con `status: 'COMPLETED'`, `targetDonors: 10`, `currentDonors: 10`.
   - Input: `{ status: 'ACTIVE', deadline: '2026-12-01', targetDonors: 10 }`.
   - Expectativa: Lanza `BadRequestException`.

5. **`debe actualizar donantes conseguidos en campañas activas y autocompletar si alcanza la meta`**
   - Mock: Campaña con `status: 'ACTIVE'`, `targetDonors: 12`, `currentDonors: 5`.
   - Input: `{ currentDonors: 12 }`.
   - Expectativa: `currentDonors: 12`, `status: 'COMPLETED'`.
