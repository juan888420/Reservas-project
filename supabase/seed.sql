-- Seed: médicos y slots de ejemplo
-- Los médicos deben vincularse a usuarios de Supabase Auth (ver README)

INSERT INTO medicos (id, nombre, especialidad, tarifa) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Dra. Ana Martínez', 'Cardiología', 85.00),
  ('a0000000-0000-4000-8000-000000000002', 'Dr. Carlos Ruiz', 'Dermatología', 70.00),
  ('a0000000-0000-4000-8000-000000000003', 'Dra. Laura Vega', 'Pediatría', 65.00)
ON CONFLICT (id) DO NOTHING;

-- Slots para los próximos 7 días (09:00 - 17:00, cada hora)
INSERT INTO slots (medico_id, fecha, hora, disponible)
SELECT
  m.id,
  (CURRENT_DATE + d.day_offset)::date,
  (h.hour || ':00')::time,
  true
FROM medicos m
CROSS JOIN generate_series(0, 6) AS d(day_offset)
CROSS JOIN generate_series(9, 16) AS h(hour)
ON CONFLICT (medico_id, fecha, hora) DO NOTHING;

-- Vincular médico demo (ejecutar después de crear usuario en Auth):
-- UPDATE medicos SET auth_user_id = 'UUID-DEL-USUARIO-AUTH'
-- WHERE id = 'a0000000-0000-4000-8000-000000000001';
