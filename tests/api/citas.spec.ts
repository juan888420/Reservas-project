import { test, expect } from "@playwright/test";
import { api } from "../helpers";

const SLOT_ID = "00000000-0000-4000-8000-000000000000";

test.describe("POST /api/citas", () => {
  test("400 — payload vacío devuelve error de validación", async () => {
    const res = await api("/api/citas", { method: "POST", body: {} });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe("Datos inválidos");
    expect(body.details).toBeDefined();
  });

  test("400 — falta paciente_nombre y email", async () => {
    const res = await api("/api/citas", {
      method: "POST",
      body: { slot_id: SLOT_ID },
    });
    expect(res.status).toBe(400);
  });

  test("400 — email inválido", async () => {
    const res = await api("/api/citas", {
      method: "POST",
      body: {
        slot_id: SLOT_ID,
        paciente_nombre: "Test Paciente",
        email: "no-es-un-email",
      },
    });
    expect(res.status).toBe(400);
  });

  test("400 — slot_id no es UUID", async () => {
    const res = await api("/api/citas", {
      method: "POST",
      body: {
        slot_id: "no-es-uuid",
        paciente_nombre: "Test",
        email: "test@example.com",
      },
    });
    expect(res.status).toBe(400);
  });

  test("400 — nombre demasiado corto", async () => {
    const res = await api("/api/citas", {
      method: "POST",
      body: {
        slot_id: SLOT_ID,
        paciente_nombre: "A",
        email: "test@example.com",
      },
    });
    expect(res.status).toBe(400);
  });

  test.describe("rate limiting", () => {
    test("429 — después de 5 solicitudes por minuto", async () => {
      test.skip(
        !process.env.UPSTASH_REDIS_REST_URL,
        "Rate limiting desactivado sin UPSTASH_REDIS_REST_URL"
      );
      const results = await Promise.all(
        Array.from({ length: 6 }, () =>
          api("/api/citas", {
            method: "POST",
            body: {
              slot_id: SLOT_ID,
              paciente_nombre: "Rate Limit Test",
              email: "ratelimit@example.com",
            },
          })
        )
      );

      const count429 = results.filter((r) => r.status === 429).length;
      expect(count429).toBeGreaterThanOrEqual(1);
    });
  });
});
