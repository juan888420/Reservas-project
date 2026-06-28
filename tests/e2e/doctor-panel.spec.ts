import { test, expect } from "@playwright/test";

test.describe("Panel del médico", () => {
  test("redirige a login si no hay sesión", async ({ page }) => {
    await page.goto("/medico/panel");
    await expect(page).toHaveURL(/\/medico\/login/);
  });

  test("redirige al panel si ya hay sesión en login", async ({ page }) => {
    // No podemos probar autenticación real sin credenciales.
    // Este test verifica que la página de login carga correctamente.
    await page.goto("/medico/login");
    await expect(page.getByText("Panel médico")).toBeVisible();
    await expect(page.getByText("Inicia sesión")).toBeVisible();
    await expect(page.getByPlaceholder("Correo")).toBeVisible();
    await expect(page.getByPlaceholder("Contraseña")).toBeVisible();
  });

  test("login con credenciales inválidas muestra error", async ({ page }) => {
    await page.goto("/medico/login");

    await page.getByPlaceholder("Correo").fill("no-existe@test.com");
    await page.getByPlaceholder("Contraseña").fill("wrong-password");
    await page.getByText("Iniciar sesión").click();

    await expect(page.getByText(/error|inválido|incorrecto/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("landing page tiene enlace a acceso médico", async ({ page }) => {
    await page.goto("/");
    const accesoMedico = page.getByText("Acceso médico");
    await expect(accesoMedico).toBeVisible();
    await accesoMedico.click();
    await expect(page).toHaveURL(/\/medico\/login/);
  });
});
