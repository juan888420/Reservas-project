-- =============================================================================
-- MediReserva — Schema (Supabase Postgres Best Practices)
-- Ejecutar en orden: schema.sql → seed.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tablas
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS medicos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre        TEXT NOT NULL,
  especialidad  TEXT NOT NULL,
  tarifa        NUMERIC(10, 2) NOT NULL,
  auth_user_id  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS slots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id   UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  fecha       DATE NOT NULL,
  hora        TIME NOT NULL,
  disponible  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (medico_id, fecha, hora)
);

CREATE TABLE IF NOT EXISTS citas (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id           UUID NOT NULL REFERENCES slots(id) ON DELETE RESTRICT,
  paciente_nombre   TEXT NOT NULL,
  email             TEXT NOT NULL,
  motivo            TEXT,
  monto             NUMERIC(10, 2) NOT NULL,
  estado            TEXT NOT NULL DEFAULT 'pendiente',
  paypal_order_id   TEXT,
  paypal_capture_id TEXT,
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Añadir expires_at si la tabla ya existía (idempotente)
ALTER TABLE citas ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 2. Constraints (idempotentes)
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'medicos_tarifa_positiva') THEN
    ALTER TABLE medicos ADD CONSTRAINT medicos_tarifa_positiva CHECK (tarifa > 0);
  END IF;
END $$;

DO $$ BEGIN
  -- Drop and recreate to support the new 'expirada' state (idempotente)
  ALTER TABLE citas DROP CONSTRAINT IF EXISTS citas_estado_valido;
  ALTER TABLE citas ADD CONSTRAINT citas_estado_valido
    CHECK (estado IN ('pendiente', 'confirmada', 'cancelada', 'expirada'));
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'citas_email_formato') THEN
    ALTER TABLE citas ADD CONSTRAINT citas_email_formato
      CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'citas_monto_positivo') THEN
    ALTER TABLE citas ADD CONSTRAINT citas_monto_positivo CHECK (monto > 0);
  END IF;
END $$;

-- Una sola cita activa (pendiente o confirmada) por slot
CREATE UNIQUE INDEX IF NOT EXISTS idx_citas_slot_activa
  ON citas (slot_id)
  WHERE estado IN ('pendiente', 'confirmada');

-- ---------------------------------------------------------------------------
-- 3. Índices (FK, consultas frecuentes, parciales)
-- ---------------------------------------------------------------------------

-- FK: slots.medico_id
CREATE INDEX IF NOT EXISTS idx_slots_medico_id ON slots (medico_id);

-- Consulta paciente: slots por médico y fecha
CREATE INDEX IF NOT EXISTS idx_slots_medico_fecha ON slots (medico_id, fecha, hora);

-- Solo slots disponibles (partial index)
CREATE INDEX IF NOT EXISTS idx_slots_disponibles
  ON slots (medico_id, fecha, hora)
  WHERE disponible = true;

-- FK: citas.slot_id
CREATE INDEX IF NOT EXISTS idx_citas_slot_id ON citas (slot_id);

-- Panel médico: citas confirmadas
CREATE INDEX IF NOT EXISTS idx_citas_confirmadas
  ON citas (created_at DESC)
  WHERE estado = 'confirmada';

-- Citas pendientes (webhook / limpieza)
CREATE INDEX IF NOT EXISTS idx_citas_pendientes
  ON citas (created_at)
  WHERE estado = 'pendiente';

-- Citas expiradas (auditoría / reportes de abandono)
CREATE INDEX IF NOT EXISTS idx_citas_expiradas
  ON citas (expires_at)
  WHERE estado = 'expirada';

-- PayPal lookups (partial)
CREATE INDEX IF NOT EXISTS idx_citas_paypal_order
  ON citas (paypal_order_id)
  WHERE paypal_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_citas_paypal_capture
  ON citas (paypal_capture_id)
  WHERE paypal_capture_id IS NOT NULL;

-- RLS: médicos por auth_user_id
CREATE INDEX IF NOT EXISTS idx_medicos_auth_user
  ON medicos (auth_user_id)
  WHERE auth_user_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Trigger updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_medicos_updated_at ON medicos;
CREATE TRIGGER trg_medicos_updated_at
  BEFORE UPDATE ON medicos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_slots_updated_at ON slots;
CREATE TRIGGER trg_slots_updated_at
  BEFORE UPDATE ON slots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_citas_updated_at ON citas;
CREATE TRIGGER trg_citas_updated_at
  BEFORE UPDATE ON citas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Funciones RPC (transacciones atómicas, SECURITY DEFINER)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.crear_cita_pendiente(
  p_slot_id          UUID,
  p_paciente_nombre  TEXT,
  p_email            TEXT,
  p_motivo           TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tarifa     NUMERIC(10, 2);
  v_disponible BOOLEAN;
  v_cita_id    UUID;
BEGIN
  SELECT s.disponible, m.tarifa
  INTO v_disponible, v_tarifa
  FROM slots s
  INNER JOIN medicos m ON m.id = s.medico_id
  WHERE s.id = p_slot_id
  FOR UPDATE OF s SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'slot_no_disponible');
  END IF;

  IF NOT v_disponible THEN
    RETURN json_build_object('error', 'slot_ocupado');
  END IF;

  -- Liberar reservas pendientes expiradas para este slot (conserva historial)
  UPDATE citas
  SET estado = 'expirada'
  WHERE slot_id = p_slot_id
    AND estado = 'pendiente'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  INSERT INTO citas (slot_id, paciente_nombre, email, motivo, monto, estado, expires_at)
  VALUES (p_slot_id, p_paciente_nombre, p_email, p_motivo, v_tarifa, 'pendiente', NOW() + INTERVAL '15 minutes')
  RETURNING id INTO v_cita_id;

  RETURN json_build_object('cita_id', v_cita_id, 'monto', v_tarifa);

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('error', 'slot_ocupado');
END;
$$;

CREATE OR REPLACE FUNCTION public.confirmar_cita_db(
  p_cita_id    UUID,
  p_capture_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cita           citas%ROWTYPE;
  v_already        BOOLEAN := FALSE;
  v_fecha          DATE;
  v_hora           TIME;
  v_medico_nombre  TEXT;
  v_especialidad   TEXT;
BEGIN
  SELECT * INTO v_cita FROM citas WHERE id = p_cita_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'cita_no_encontrada');
  END IF;

  IF v_cita.estado = 'confirmada' THEN
    v_already := TRUE;
  ELSIF v_cita.estado IN ('cancelada', 'expirada') THEN
    RETURN json_build_object('error', 'cita_no_confirmable');
  ELSE
    UPDATE citas
    SET estado = 'confirmada',
        paypal_capture_id = COALESCE(p_capture_id, paypal_capture_id)
    WHERE id = p_cita_id;

    UPDATE slots SET disponible = FALSE WHERE id = v_cita.slot_id;
  END IF;

  SELECT s.fecha, s.hora, m.nombre, m.especialidad
  INTO v_fecha, v_hora, v_medico_nombre, v_especialidad
  FROM slots s
  INNER JOIN medicos m ON m.id = s.medico_id
  WHERE s.id = v_cita.slot_id;

  RETURN json_build_object(
    'already_confirmed', v_already,
    'paciente_nombre',   v_cita.paciente_nombre,
    'email',             v_cita.email,
    'motivo',            v_cita.motivo,
    'monto',             v_cita.monto,
    'fecha',             v_fecha,
    'hora',              v_hora,
    'medico_nombre',     v_medico_nombre,
    'especialidad',      v_especialidad
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.actualizar_paypal_order_id(
  p_cita_id   UUID,
  p_order_id  TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE citas SET paypal_order_id = p_order_id WHERE id = p_cita_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Privilegios (principio de menor privilegio)
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.crear_cita_pendiente FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirmar_cita_db FROM PUBLIC;
REVOKE ALL ON FUNCTION public.actualizar_paypal_order_id FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.crear_cita_pendiente TO service_role;
GRANT EXECUTE ON FUNCTION public.confirmar_cita_db TO service_role;
GRANT EXECUTE ON FUNCTION public.actualizar_paypal_order_id TO service_role;

GRANT SELECT ON medicos TO anon, authenticated;
GRANT SELECT ON slots TO anon, authenticated;
GRANT SELECT ON citas TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Row Level Security (optimizado)
-- ---------------------------------------------------------------------------

ALTER TABLE medicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE slots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE citas   ENABLE ROW LEVEL SECURITY;

ALTER TABLE medicos FORCE ROW LEVEL SECURITY;
ALTER TABLE slots   FORCE ROW LEVEL SECURITY;
ALTER TABLE citas   FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS medicos_public_read ON medicos;
CREATE POLICY medicos_public_read ON medicos
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS slots_public_read ON slots;
CREATE POLICY slots_public_read ON slots
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS citas_doctor_read ON citas;
CREATE POLICY citas_doctor_read ON citas
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM slots s
      INNER JOIN medicos m ON m.id = s.medico_id
      WHERE s.id = citas.slot_id
        AND m.auth_user_id = (SELECT auth.uid())
    )
  );

-- Escrituras solo vía service_role (API) o funciones SECURITY DEFINER
-- anon/authenticated: sin INSERT/UPDATE/DELETE directo en citas/slots
