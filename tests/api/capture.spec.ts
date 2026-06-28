import { test, expect } from "@playwright/test";
import { api } from "../helpers";

test.describe("POST /api/paypal/capture", () => {
  test("400 — payload vacío devuelve error de validación", async () => {
    const res = await api("/api/paypal/capture", { method: "POST", body: {} });
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error).toBe("Datos inválidos");
  });

  test("400 — orderId vacío", async () => {
    const res = await api("/api/paypal/capture", {
      method: "POST",
      body: { orderId: "" },
    });
    expect(res.status).toBe(400);
  });

  test("400 — orderId nulo", async () => {
    const res = await api("/api/paypal/capture", {
      method: "POST",
      body: { orderId: null },
    });
    expect(res.status).toBe(400);
  });

  test.describe("rate limiting", () => {
    test("429 — después de 3 solicitudes por minuto", async () => {
      test.skip(
        !process.env.UPSTASH_REDIS_REST_URL,
        "Rate limiting desactivado sin UPSTASH_REDIS_REST_URL"
      );
      const results = await Promise.all(
        Array.from({ length: 4 }, () =>
          api("/api/paypal/capture", {
            method: "POST",
            body: { orderId: "test-order-id" },
          })
        )
      );

      const count429 = results.filter((r) => r.status === 429).length;
      expect(count429).toBeGreaterThanOrEqual(1);
    });
  });
});
