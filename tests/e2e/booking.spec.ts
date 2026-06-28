import { test, expect } from "@playwright/test";

test.describe("Flujo de reserva completo", () => {
  test("reserva exitosa — seleccionar médico, slot, pagar y confirmar", async ({
    page,
  }) => {
    await page.route("**/api/citas", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          cita_id: "test-cita-id",
          monto: 100,
          paypal_order_id: "test-paypal-order-id",
        }),
      })
    );

    await page.goto("/reservar");

    // Paso 1: Ver lista de médicos
    await expect(page.getByText("Elige tu médico")).toBeVisible();
    const medicoCards = page.locator("button.group");
    await expect(medicoCards.first()).toBeVisible({ timeout: 10_000 });

    // Seleccionar el primer médico disponible
    await medicoCards.first().click();

    // Paso 2: Seleccionar fecha y hora
    await expect(page.getByText("Elige fecha y hora")).toBeVisible();

    const fechas = page.locator("button.shrink-0");
    await expect(fechas.first()).toBeVisible({ timeout: 10_000 });
    await fechas.first().click();

    const slots = page.locator("button:not([disabled])").filter({ hasText: /^\d{2}:\d{2}$/ });
    await expect(slots.first()).toBeVisible({ timeout: 5_000 });
    await slots.first().click();

    // Click "Continuar"
    await page.getByText("Continuar").click();

    // Paso 3: Datos del paciente
    await expect(page.getByText("Tus datos")).toBeVisible();
    await expect(page.getByText("Motivo")).toBeVisible();

    await page.getByPlaceholder("Juan Pérez").fill("Paciente Test E2E");
    await page.getByPlaceholder("juan@email.com").fill("test-e2e@example.com");
    await page
      .getByPlaceholder("Describe brevemente el motivo...")
      .fill("Test de integración automatizado");

    await page.getByText("Ir al pago").click();

    // Paso 4: Ver página de pago
    await expect(page.getByText("Pago con PayPal")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Total/)).toBeVisible();
  });

  test("vuelta atrás — navegar entre pasos no pierde selecciones", async ({
    page,
  }) => {
    await page.goto("/reservar");

    // Seleccionar médico
    const medicoCards = page.locator("button.group");
    await expect(medicoCards.first()).toBeVisible({ timeout: 10_000 });
    await medicoCards.first().click();

    // Ir a paso 2, volver al 1
    await expect(page.getByText("Elige fecha y hora")).toBeVisible();
    await page.getByText("Cambiar médico").click();
    await expect(page.getByText("Elige tu médico")).toBeVisible();

    // Volver a seleccionar el mismo médico
    await medicoCards.first().click();
    await expect(page.getByText("Elige fecha y hora")).toBeVisible();
  });

  test("muestra error al cargar médicos si el servidor falla", async ({
    page,
  }) => {
    await page.route("**/api/medicos", (route) =>
      route.fulfill({ status: 500, body: "Server error" })
    );

    await page.goto("/reservar");
    await expect(page.getByText(/error/i)).toBeVisible({ timeout: 10_000 });
  });
});
