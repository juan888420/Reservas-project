# MediReserva — Sistema de citas médicas

Reservas de citas médicas con Next.js, Supabase, PayPal Sandbox y Resend.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS v4)
- **Supabase** (PostgreSQL + Auth)
- **PayPal Sandbox** (pagos)
- **Resend** (emails de confirmación)

## Configuración

### 1. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. En el SQL Editor, ejecuta `supabase/schema.sql` y luego `supabase/seed.sql`
3. Crea un usuario médico en **Authentication → Users** (email + password)
4. Vincula el usuario al médico:

```sql
UPDATE medicos SET auth_user_id = 'UUID-DEL-USUARIO-AUTH'
WHERE id = 'a0000000-0000-4000-8000-000000000001';
```

### 2. Variables de entorno

Copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (anon) de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio (solo servidor) |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Client ID de PayPal Sandbox |
| `PAYPAL_CLIENT_SECRET` | Client Secret de PayPal Sandbox |
| `PAYPAL_WEBHOOK_ID` | ID del webhook registrado en PayPal |
| `RESEND_API_KEY` | API key de Resend |
| `RESEND_FROM_EMAIL` | Email remitente verificado en Resend |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app (ej. `http://localhost:3000`) |

### 3. PayPal Sandbox

1. Crea una app en [developer.paypal.com](https://developer.paypal.com)
2. Usa las credenciales **Sandbox**
3. Registra un webhook apuntando a `https://tu-dominio.com/api/webhook`
4. Suscríbete al evento `PAYMENT.CAPTURE.COMPLETED`
5. Copia el **Webhook ID** a `PAYPAL_WEBHOOK_ID`

### 4. Resend

1. Crea cuenta en [resend.com](https://resend.com)
2. Verifica tu dominio o usa el dominio de prueba
3. Configura `RESEND_FROM_EMAIL` con un remitente válido

## Desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Flujos

### Paciente (`/` → `/reservar`)
1. Elige médico → fecha → hora (slots ocupados deshabilitados)
2. Ingresa nombre, email y motivo
3. Paga con PayPal
4. Recibe email de confirmación con enlace a Google Calendar

### Webhook (`/api/webhook`)
Al confirmarse el pago:
- Marca la cita como `confirmada`
- Marca el slot como `disponible = false`
- Envía email de confirmación vía Resend

### Médico (`/medico/login` → `/medico/panel`)
- Inicia sesión con Supabase Auth
- Ve sus citas confirmadas (paciente, motivo, fecha/hora)

## Backend (Supabase Postgres)

### Setup

```bash
# Opción A: SQL Editor (producción)
# Ejecutar en orden: schema.sql → seed.sql

# Opción B: Supabase CLI (local)
supabase start
supabase db reset   # aplica schema + seed si están en migrations/
```

### Arquitectura

| Capa | Rol | Uso |
|---|---|---|
| `anon` | Lectura pública | GET `/api/medicos`, GET `/api/slots` (respeta RLS) |
| `authenticated` | Médico logueado | Panel: lee solo sus citas vía RLS |
| `service_role` | API servidor | Crear/confirmar citas vía RPC (nunca en cliente) |

### Funciones RPC (transacciones atómicas)

- `crear_cita_pendiente` — bloquea slot con `FOR UPDATE SKIP LOCKED`, evita doble reserva
- `confirmar_cita_db` — confirma cita + ocupa slot en una transacción (idempotente)
- `actualizar_paypal_order_id` — asocia orden PayPal a la cita

### Buenas prácticas aplicadas

- **RLS** forzado en todas las tablas; `(SELECT auth.uid())` en políticas
- **Índices parciales** en slots disponibles, citas pendientes/confirmadas, PayPal IDs
- **Índice único parcial** — una sola cita activa por slot
- **FK indexados** — `slots.medico_id`, `citas.slot_id`
- **Constraints** — email válido, tarifa/monto > 0, estados permitidos
- **Privilegios mínimos** — anon solo SELECT en medicos/slots; escrituras vía RPC + service_role

### Estructura de tablas

- **medicos**: nombre, especialidad, tarifa, auth_user_id
- **slots**: medico_id, fecha, hora, disponible
- **citas**: slot_id, paciente_nombre, email, motivo, monto, estado
