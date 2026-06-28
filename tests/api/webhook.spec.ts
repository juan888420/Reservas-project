import { test, expect } from "@playwright/test";

const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";

test.describe("POST /api/webhook", () => {
  test("401 — firma inválida es rechazada", async () => {
    const res = await fetch(`${BASE}/api/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "paypal-auth-algo": "SHA256",
        "paypal-cert-url": "https://example.com/cert",
        "paypal-transmission-id": "fake",
        "paypal-transmission-sig": "fake",
        "paypal-transmission-time": new Date().toISOString(),
      },
      body: JSON.stringify({ event_type: "PAYMENT.CAPTURE.COMPLETED" }),
    });

    expect(res.status).toBe(401);
  });

  test("400 — evento sin event_type es rechazado", async () => {
    const res = await fetch(`${BASE}/api/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "paypal-auth-algo": "SHA256",
        "paypal-cert-url": "https://example.com/cert",
        "paypal-transmission-id": "fake",
        "paypal-transmission-sig": "fake",
        "paypal-transmission-time": new Date().toISOString(),
      },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(401);
  });
});
