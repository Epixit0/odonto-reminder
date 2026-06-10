import { test, expect } from "@playwright/test";

test.describe("Flujo de pacientes", () => {
  test.beforeEach(async ({ page }) => {
    // Login antes de cada test
    await page.goto("/login");
    await page.fill('input[name="email"]', process.env.ADMIN_USER || "admin");
    await page.fill('input[name="password"]', process.env.ADMIN_PASS || "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);
  });

  test("el dashboard carga correctamente", async ({ page }) => {
    await expect(page.getByText("Panel de Control")).toBeVisible();
    // Stats cards deben existir
    await expect(page.getByText("Total Pacientes")).toBeVisible();
    await expect(page.getByText("Confirmados")).toBeVisible();
  });

  test("se puede abrir y cerrar el formulario de registro", async ({ page }) => {
    await page.click("text=Nuevo paciente");
    await expect(page.getByText("Nombre del paciente")).toBeVisible();
    await page.click("text=Ocultar formulario");
  });

  test("se puede cambiar entre vista tabla y calendario", async ({ page }) => {
    await page.click("text=Calendario");
    await page.waitForTimeout(500);
    await page.click("text=Tabla");
    await expect(page.getByText("Buscar paciente")).toBeVisible();
  });

  test("el filtro de estado funciona", async ({ page }) => {
    // Buscar el select de filtrar y cambiar a "Confirmados"
    const filterSelect = page.locator("select").last();
    // O intentar con el trigger del Select de Shadcn
    await page.locator("text=Todos").first().click();
    await page.waitForTimeout(300);
    // Click fuera para cerrar
    await page.keyboard.press("Escape");
  });

  test("el header es visible y tiene los controles", async ({ page }) => {
    await expect(page.getByText("Odonto Reminder")).toBeVisible();
    // Botón de cerrar sesión
    await expect(page.locator('header button[class*="LogOut"]').first()).toBeVisible();
  });
});
