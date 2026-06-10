import { test, expect } from "@playwright/test";

test.describe("Flujo de login", () => {
  test("muestra la página de login", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Odonto Reminder")).toBeVisible();
    await expect(page.getByText("Iniciar sesión")).toBeVisible();
  });

  test("login fallido muestra error", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', "admin");
    await page.fill('input[name="password"]', "wrongpass");
    await page.click('button[type="submit"]');
    await expect(page.getByText("Credenciales inválidas")).toBeVisible({ timeout: 10000 });
  });

  test("login exitoso redirige al dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', process.env.ADMIN_USER || "admin");
    await page.fill('input[name="password"]', process.env.ADMIN_PASS || "admin123");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.getByText("Panel de Control")).toBeVisible({ timeout: 10000 });
  });
});
