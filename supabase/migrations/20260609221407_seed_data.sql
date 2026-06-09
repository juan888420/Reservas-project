-- =============================================================================
-- MediReserva — Seed Data (Datos de prueba)
-- =============================================================================

-- Médicos de ejemplo
INSERT INTO medicos (nombre, especialidad, tarifa) VALUES
  ('Dr. Juan García López', 'Cardiología', 150.00),
  ('Dra. María Rodríguez Pérez', 'Dermatología', 120.00),
  ('Dr. Carlos Mendoza Silva', 'Neurocirugía', 200.00),
  ('Dra. Ana Martínez Sánchez', 'Pediatría', 100.00)
ON CONFLICT DO NOTHING;

-- Slots (próximos 14 días, 9:00-17:00, cada hora)
INSERT INTO slots (medico_id, fecha, hora, disponible)
SELECT
  m.id,
  (CURRENT_DATE + d.day_offset)::date,
  (h.hour || ':00')::time,
  true
FROM medicos m
CROSS JOIN generate_series(0, 13) AS d(day_offset)
CROSS JOIN generate_series(9, 16) AS h(hour)
WHERE EXTRACT(DOW FROM CURRENT_DATE + d.day_offset) NOT IN (0, 6)
ON CONFLICT (medico_id, fecha, hora) DO NOTHING;
