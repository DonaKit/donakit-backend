# 📖 Documentación Técnica de la API - DonaKit Backend

Servidor backend desarrollado con **NestJS**, **TypeScript**, **Prisma ORM** y **Supabase (PostgreSQL)** para la plataforma de donación de sangre y hemoderivados **DonaKit**.

---

## 🌐 1. Información General y Entornos

| Entorno | URL Base | Descripción |
| :--- | :--- | :--- |
| **Local (Desarrollo)** | `http://localhost:3000` | Entorno local por defecto (`PORT=3000`) |
| **Producción (Render)** | `https://donakit-backend.onrender.com` | Despliegue en la nube (rama `development`) |

### Convenciones Globales
* **Sin prefijo `/api`:** Todas las rutas responden directamente sobre la raíz (ej. `/campaigns`, `/institutions`, `/health`).
* **Formato de intercambio:** `application/json; charset=utf-8`.
* **Compatibilidad de Nombres de Campo (Input):** El backend cuenta con un middleware automático que acepta tanto `camelCase` como `snake_case` en los cuerpos de las peticiones (ej. `patientName` o `patient_name`).
* **CORS:**
  * Permite automáticamente cualquier puerto en `localhost` y `127.0.0.1`.
  * Permite el frontend en Vercel (`https://donakit-frontend.vercel.app`) y sus subdominios de preview oficiales (`git-*` y hashes de commit).
  * Admite orígenes adicionales configurados en la variable de entorno `FRONTEND_URL`.

---

## 🔄 2. Ciclo de Vida y Flujo de Integración (Frontend ⇄ Backend)

A partir de la versión actual, el flujo de creación de un kit de donación se basa en un estado inicial **`DRAFT`** para permitir previsualización con QR real antes de la publicación definitiva:

```mermaid
sequenceDiagram
    autonumber
    actor Donante as Usuario / Donante
    participant Front as Frontend (Vercel)
    participant Back as Backend (Render)
    participant Storage as Supabase Storage
    participant DB as Supabase (Postgres)

    Donante->>Front: Completa formulario y hace clic en "Generar Kit"
    Front->>Back: POST /campaigns (datos completos)
    Back->>DB: Guarda campaña (status: 'DRAFT', genera slug y edit_token)
    Back-->>Front: Responde 201 Created { id, slug, editToken, status: 'DRAFT' }
    Note over Front: Renderiza placas en canvas (1:1 y 9:16) con QR del slug real
    Front->>Back: POST /campaigns/:id/assets (editToken + Base64)
    Back->>Storage: Sube PNGs a bucket 'campaign-assets'
    Back->>DB: Registra placas en tabla campaign_asset
    Back-->>Front: 201 Created con URLs públicas de las placas
    
    alt Usuario detecta un error ("Corregir")
        Donante->>Front: Modifica datos en el paso de edición
        Front->>Back: PATCH /campaigns/:id (con edit_token)
        Back->>DB: Actualiza campos modificados
    else Usuario confirma ("Publicar / Finalizar")
        Donante->>Front: Confirma la campaña
        Front->>Back: PATCH /campaigns/:id/confirm (status -> 'ACTIVE')
        Back->>DB: Actualiza status = 'ACTIVE'
        Back-->>Front: Campaña lista y pública para compartir
    end
```

### Máquina de Estados de la Campaña (`campaign_status`)

```mermaid
stateDiagram-v2
    [*] --> DRAFT: POST /campaigns (Previsualización con QR)
    DRAFT --> ACTIVE: Confirmación final del usuario
    DRAFT --> CANCELLED: Usuario descarta el borrador
    ACTIVE --> COMPLETED: Se alcanzó la cantidad objetivo de donantes
    ACTIVE --> EXPIRED: Se superó la fecha límite (deadline)
    ACTIVE --> CANCELLED: Usuario cancela la campaña con su editToken
    COMPLETED --> [*]
    EXPIRED --> [*]
    CANCELLED --> [*]
```

---

## 🚪 3. Catálogo de Endpoints

### 3.1. Estado del Servidor y Base de Datos (`Health Check`)

Comprueba la operatividad del backend y la conectividad con la base de datos Supabase mediante un ping ligero (`SELECT 1`). No expone metadatos internos por seguridad.

* **Método:** `GET`
* **Ruta:** `/health`
* **Autenticación:** Pública

#### Respuestas:
* **`200 OK` (Operativo):**
  ```json
  {
    "status": "ok"
  }
  ```
* **`503 Service Unavailable` (Fallo de Base de Datos):**
  ```json
  {
    "statusCode": 503,
    "error": "Service Unavailable",
    "message": "Servicio no disponible"
  }
  ```

---

### 3.2. Listado de Instituciones para Combobox

Devuelve el catálogo de centros de salud e instituciones activas acotado a los campos necesarios para selectores en el frontend. Respuesta directa sin envoltorio para facilitar su consumo con librerías tipo Axios o Fetch.

* **Método:** `GET`
* **Ruta:** `/institutions`
* **Autenticación:** Pública
* **Ordenamiento:** Alfabético por `name` ascendente (`is_active = true`).

#### Respuesta `200 OK`:
```json
[
  {
    "id": "63a65bfe-3c92-484e-b658-d3446355e5c2",
    "name": "Hospital Garrahan - Hemoterapia",
    "address": "Combate de los Pozos 1881",
    "city": "CABA"
  },
  {
    "id": "a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d",
    "name": "Hospital de Clínicas José de San Martín",
    "address": "Av. Córdoba 2351",
    "city": "CABA"
  }
]
```

---

### 3.3. Crear Pedido de Donación (Generación de Kit / Borrador)

Crea el registro del pedido con estado **`DRAFT`**, genera un UUID único, un slug seguro para la URL amigable y un `editToken` para control de cambios posterior.

* **Método:** `POST`
* **Ruta:** `/campaigns`
* **Headers requeridos:** `Content-Type: application/json`
* **Autenticación:** Pública

#### Cuerpo de la Petición (`Request Body`):
```json
{
  "patientName": "Sofía Agustina Martínez",
  "institutionId": "63a65bfe-3c92-484e-b658-d3446355e5c2",
  "bloodType": "A+",
  "donationType": "Plaquetas",
  "targetDonors": 15,
  "deadline": "2026-12-31",
  "observations": "Presentarse con DNI en ayuno de grasas."
}
```

#### Parámetros del Body:

| Campo | Tipo | Obligatorio | Restricciones / Reglas |
| :--- | :--- | :---: | :--- |
| `patientName` | `string` | **Sí** | 2 a 255 caracteres. Solo letras, espacios, guiones o apóstrofes. No permite números. |
| `institutionId` | `string` (UUID v4) | **Sí** | Debe existir en la base de datos y tener `is_active: true`. |
| `bloodType` | `string` | **Sí** | Valores permitidos: `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `0+`, `0-`, `O+`, `O-`, `TODOS`. |
| `donationType` | `string` | No | Máx. 50 caracteres. Por defecto: `"Sangre entera"`. |
| `targetDonors` | `integer` | No | Número entero entre `1` y `1000`. |
| `deadline` | `string` | No | Formato de fecha ISO 8601 o `YYYY-MM-DD`. |
| `observations` | `string` | No | Texto libre de hasta 1000 caracteres. |

#### Respuesta `201 Created`:
```json
{
  "success": true,
  "message": "Pedido de donación creado exitosamente.",
  "data": {
    "id": "b73a9e21-4f10-4821-bdfe-7bd73db49b06",
    "slug": "donantes-sofia-agustina-martinez-fefc4a",
    "editToken": "8f3a9b1c-2e4d-4a1b-8c2d-3e4f5a6b7c8d",
    "institutionId": "63a65bfe-3c92-484e-b658-d3446355e5c2",
    "patientName": "Sofía Agustina Martínez",
    "bloodType": "A+",
    "donationType": "Plaquetas",
    "targetDonors": 15,
    "currentDonors": 0,
    "deadline": "2026-12-31T00:00:00.000Z",
    "observations": "Presentarse con DNI en ayuno de grasas.",
    "generatedCopy": null,
    "status": "DRAFT",
    "createdAt": "2026-10-28T19:40:00.000Z",
    "updatedAt": "2026-10-28T19:40:00.000Z",
    "institution": {
      "id": "63a65bfe-3c92-484e-b658-d3446355e5c2",
      "name": "Hospital Garrahan - Hemoterapia",
      "address": "Combate de los Pozos 1881",
      "city": "CABA"
    }
  }
}
```

#### Errores Comunes:
* **`400 Bad Request` (Error de validación de campos):**
  ```json
  {
    "statusCode": 400,
    "error": "Bad Request",
    "message": "Error de validación en los datos del formulario.",
    "errors": {
      "patientName": ["El nombre del paciente es requerido."],
      "institutionId": ["El centro de salud debe ser un UUID v4 válido."],
      "bloodType": ["El grupo sanguíneo debe ser uno de los formatos válidos..."]
    },
    "details": [...]
  }
  ```
* **`404 Not Found` (Institución inexistente o inactiva):**
  ```json
  {
    "statusCode": 404,
    "error": "Not Found",
    "message": "El centro de salud con ID '...' no fue encontrado o no está activo en el sistema."
  }
  ```

---

### 3.4. Consultar Pedido Público (por UUID o por Slug)

Permite visualizar la información de una campaña para los donantes que acceden a través del enlace compartido o escanean el código QR.

> 🔒 **Seguridad Garantizada:** Por diseño de protección contra manipulación, **esta respuesta no expone `editToken` ni `slug`**. El enlace ya contiene el slug y el token solo le pertenece al creador original.

* **Método:** `GET`
* **Ruta:** `/campaigns/:idOrSlug`
* **Parámetro URL:** `:idOrSlug` (acepta tanto el UUID v4 como el slug amigable, ej. `donantes-sofia-agustina-martinez-fefc4a`).
* **Autenticación:** Pública

#### Respuesta `200 OK`:
```json
{
  "success": true,
  "message": "Pedido de donación obtenido exitosamente.",
  "data": {
    "id": "b73a9e21-4f10-4821-bdfe-7bd73db49b06",
    "institutionId": "63a65bfe-3c92-484e-b658-d3446355e5c2",
    "patientName": "Sofía Agustina Martínez",
    "bloodType": "A+",
    "donationType": "Plaquetas",
    "targetDonors": 15,
    "currentDonors": 0,
    "deadline": "2026-12-31T00:00:00.000Z",
    "observations": "Presentarse con DNI en ayuno de grasas.",
    "generatedCopy": null,
    "status": "DRAFT",
    "createdAt": "2026-10-28T19:40:00.000Z",
    "updatedAt": "2026-10-28T19:40:00.000Z",
    "institution": {
      "id": "63a65bfe-3c92-484e-b658-d3446355e5c2",
      "name": "Hospital Garrahan - Hemoterapia",
      "address": "Combate de los Pozos 1881",
      "city": "CABA"
    }
  }
}
```

#### Errores Comunes:
* **`404 Not Found` (Campaña inexistente):**
  ```json
  {
    "statusCode": 404,
    "error": "Not Found",
    "message": "No se encontró el pedido de donación con ID o slug '...'."
  }
  ```

---

### 3.5. Registrar y Subir Placas Gráficas Generadas (`POST /campaigns/:id/assets`)

Permite al frontend (que genera las placas en canvas de alta fidelidad) enviar las imágenes en formato Base64 para que el backend las almacene en el bucket de **Supabase Storage** (`campaign-assets`) y registre los metadatos correspondientes en la tabla **`campaign_asset`**.

* **Método:** `POST`
* **Ruta:** `/campaigns/:id/assets`
* **Parámetro URL:** `:id` (UUID v4 obligatorio del pedido de donación).
* **Headers requeridos:** `Content-Type: application/json`
* **Autenticación / Autorización:** Requiere enviar el campo `editToken` para verificar que la petición sea emitida por quien generó el borrador.

#### Cuerpo de la Petición (`Request Body`):
```json
{
  "editToken": "8f3a9b1c-2e4d-4a1b-8c2d-3e4f5a6b7c8d",
  "assets": [
    {
      "format": "SQUARE_1_1",
      "imageBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
      "width": 1080,
      "height": 1080
    },
    {
      "format": "STORY_9_16",
      "imageBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
      "width": 1080,
      "height": 1920
    }
  ]
}
```

#### Parámetros del Body:

| Campo | Tipo | Obligatorio | Descripción y Reglas |
| :--- | :--- | :---: | :--- |
| `editToken` | `string` | **Sí** | Token secreto de edición asignado al crear el pedido. Acepta también `edit_token`. |
| `assets` | `array` | **Sí** | Colección de placas generadas (mínimo 1 elemento). |
| `assets[].format` | `string` | **Sí** | Formato de la placa: `SQUARE_1_1` (feed) o `STORY_9_16` (historia). |
| `assets[].imageBase64` | `string` | **Sí** | Imagen codificada en Base64. Acepta Data URL (`data:image/png;base64,...`) o Base64 puro. Formatos soportados: PNG, JPEG y WebP. Acepta también `image_base64`. |
| `assets[].width` | `integer` | No | Ancho en píxeles (por defecto `1080`). Mínimo `100`. |
| `assets[].height` | `integer` | No | Alto en píxeles (por defecto `1080` para 1:1 y `1920` para 9:16). Mínimo `100`. |

#### Respuesta `201 Created`:
```json
{
  "success": true,
  "message": "Placas del pedido registradas y almacenadas exitosamente.",
  "data": [
    {
      "id": "11a2b3c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c",
      "campaignId": "b73a9e21-4f10-4821-bdfe-7bd73db49b06",
      "format": "SQUARE_1_1",
      "imageUrl": "https://xyz.supabase.co/storage/v1/object/public/campaign-assets/b73a9e21-4f10-4821-bdfe-7bd73db49b06/square_1_1.png",
      "width": 1080,
      "height": 1080,
      "createdAt": "2026-10-30T10:45:00.000Z"
    },
    {
      "id": "22a2b3c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c",
      "campaignId": "b73a9e21-4f10-4821-bdfe-7bd73db49b06",
      "format": "STORY_9_16",
      "imageUrl": "https://xyz.supabase.co/storage/v1/object/public/campaign-assets/b73a9e21-4f10-4821-bdfe-7bd73db49b06/story_9_16.png",
      "width": 1080,
      "height": 1920,
      "createdAt": "2026-10-30T10:45:00.000Z"
    }
  ]
}
```

#### Errores Comunes:
* **`400 Bad Request`:** Formato de UUID inválido en `:id`, Base64 corrupto, tipo de archivo no admitido o campos obligatorios faltantes.
* **`403 Forbidden`:** El `editToken` enviado no coincide con el token del creador de la campaña.
* **`404 Not Found`:** No existe una campaña con el UUID indicado.

---

## 🗄️ 4. Diccionario de Datos (Data Dictionary)

### 4.1. Tabla: `campaign` (Campañas / Pedidos de Donación)

| Columna | Tipo en BD | Nulo | Por Defecto | Descripción y Reglas de Negocio |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `UUID` | No | `uuid_generate_v4()` | Identificador único primario de la campaña. |
| `slug` | `VARCHAR(100)` | No | - | Slug único URL-friendly (`donantes-[nombre]-[hash]`). Con índice único. |
| `edit_token` | `VARCHAR(100)` | No | - | Token secreto para autorizar ediciones o confirmaciones futuras. |
| `institution_id` | `UUID` | No | - | Clave foránea que referencia a `institution(id)`. |
| `patient_name` | `VARCHAR(255)` | No | - | Nombre completo del paciente receptor. |
| `blood_type` | `VARCHAR(10)` | No | - | Grupo sanguíneo (`A+`, `0-`, `TODOS`, etc.). |
| `donation_type` | `VARCHAR(50)` | Sí | `'Sangre entera'` | Tipo de extracción requerida. |
| `target_donors` | `INTEGER` | Sí | `null` | Cantidad estimada de donantes que se necesitan. |
| `current_donors` | `INTEGER` | Sí | `0` | Cantidad de donantes confirmados. |
| `deadline` | `DATE` | Sí | `null` | Fecha límite para recibir las donaciones. |
| `observations` | `TEXT` | Sí | `null` | Indicaciones especiales (horarios, sala, ayuno, etc.). |
| `generated_copy`| `TEXT` | Sí | `null` | Texto publicitario generado automáticamente para redes. |
| `status` | `campaign_status`| No | `'DRAFT'` | Estado actual de la campaña. |
| `created_at` | `TIMESTAMPTZ(6)`| No | `now()` | Fecha y hora UTC de creación. |
| `updated_at` | `TIMESTAMPTZ(6)`| No | `now()` | Fecha y hora UTC de la última actualización. |

---

### 4.2. Tabla: `institution` (Centros de Salud / Hospitales)

| Columna | Tipo en BD | Nulo | Por Defecto | Descripción |
| :--- | :--- | :---: | :--- | :--- |
| `id` | `UUID` | No | `uuid_generate_v4()` | Identificador único de la institución. |
| `name` | `VARCHAR(255)` | No | - | Nombre oficial del centro o servicio de hemoterapia. |
| `address` | `VARCHAR(255)` | No | - | Dirección física (calle y numeración). |
| `city` | `VARCHAR(100)` | No | `'Buenos Aires'` | Ciudad o localidad. |
| `phone` | `VARCHAR(50)` | Sí | `null` | Teléfono de contacto institucional. |
| `whatsapp` | `VARCHAR(50)` | Sí | `null` | Número de WhatsApp para consultas. |
| `email` | `VARCHAR(100)` | Sí | `null` | Correo electrónico de contacto. |
| `website_url` | `TEXT` | Sí | `null` | Sitio web oficial. |
| `requirements_url`| `TEXT` | Sí | `null` | Enlace a requisitos específicos de la institución. |
| `faq_url` | `TEXT` | Sí | `null` | Enlace a preguntas frecuentes. |
| `business_hours`| `JSON` | Sí | *(Lunes a Viernes 8 a 12)* | Días y franjas horarias de atención. |
| `specific_requirements` | `TEXT` | Sí | `null` | Condiciones particulares exigidas por el centro. |
| `logo_url` | `TEXT` | Sí | `null` | URL de la imagen del logotipo. |
| `is_active` | `BOOLEAN` | No | `true` | Determina si se ofrece en los selectores del frontend. |
| `created_at` | `TIMESTAMPTZ(6)`| No | `now()` | Fecha de alta en el sistema. |

---

### 4.3. Enumeraciones del Sistema (Enums)

#### `campaign_status`
* **`DRAFT`:** Pedido creado durante el paso de previsualización con QR generado. Pendiente de confirmación.
* **`ACTIVE`:** Campaña confirmada y activa públicamente para recibir donaciones.
* **`COMPLETED`:** Campaña finalizada con éxito al alcanzar los donantes necesarios.
* **`EXPIRED`:** Campaña vencida tras superar la fecha límite (`deadline`).
* **`CANCELLED`:** Campaña cancelada por el usuario o administradores.

#### `asset_format`
* **`SQUARE_1_1`:** Plantilla gráfica cuadrada para feed de Instagram/Facebook (1080x1080).
* **`STORY_9_16`:** Plantilla gráfica vertical para Stories de Instagram/WhatsApp (1080x1920).

#### `download_type`
* **`IMAGE_1_1`:** Descarga individual de imagen cuadrada.
* **`IMAGE_9_16`:** Descarga individual de imagen vertical.
* **`ZIP_BUNDLE`:** Descarga del paquete completo comprimido.

---

## 🛠️ 5. Tablas de Soporte y Métricas

* **`campaign_asset`:** Almacena las URLs y dimensiones de las imágenes finales generadas para cada campaña.
* **`campaign_metric`:** Registra visitas anónimas por campaña con tipo de dispositivo, referrer y hash criptográfico de IP (sin almacenar la IP real por privacidad).
* **`download_log`:** Auditoría de descargas de kits para métricas de alcance.
* **`requirement`:** Requisitos generales y específicos por centro de salud (ej. peso mínimo, edad, tatuajes).
* **`faq_item`:** Preguntas y respuestas frecuentes para orientar a los donantes.
