-- Tabla para guardar integración con Google Calendar
CREATE TABLE IF NOT EXISTS google_calendar_integrations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id     UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  google_user_id TEXT NOT NULL,
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry  TIMESTAMPTZ,
  calendar_id   TEXT NOT NULL DEFAULT 'primary',
  enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (medico_id)
);

-- Tabla para rastrear eventos sincronizados con Google Calendar
CREATE TABLE IF NOT EXISTS google_calendar_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id     UUID NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  cita_id       UUID NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
  google_event_id TEXT NOT NULL,
  synced_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cita_id, google_event_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_google_calendar_medico ON google_calendar_integrations(medico_id);
CREATE INDEX IF NOT EXISTS idx_google_events_cita ON google_calendar_events(cita_id);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trg_google_calendar_integrations_updated_at ON google_calendar_integrations;
CREATE TRIGGER trg_google_calendar_integrations_updated_at
  BEFORE UPDATE ON google_calendar_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_google_calendar_events_updated_at ON google_calendar_events;
CREATE TRIGGER trg_google_calendar_events_updated_at
  BEFORE UPDATE ON google_calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE google_calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_events ENABLE ROW LEVEL SECURITY;

-- Políticas: El médico solo puede ver su integración
DROP POLICY IF EXISTS google_calendar_doctor_read ON google_calendar_integrations;
CREATE POLICY google_calendar_doctor_read ON google_calendar_integrations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM medicos m
      WHERE m.id = medico_id AND m.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS google_calendar_doctor_write ON google_calendar_integrations;
CREATE POLICY google_calendar_doctor_write ON google_calendar_integrations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM medicos m
      WHERE m.id = medico_id AND m.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS google_events_doctor_read ON google_calendar_events;
CREATE POLICY google_events_doctor_read ON google_calendar_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM medicos m
      WHERE m.id = medico_id AND m.auth_user_id = auth.uid()
    )
  );
