import { test, expect } from "@playwright/test";

test.describe("Responsive mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } }); // iPhone X

  test("el login se ve bien en mobile", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("Odonto Reminder")).toBeVisible();
    // El formulario debe ser legible
    await expect(page.locator("form")).toBeVisible();
    // No debe haber scroll horizontal
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });

  test("el dashboard es usable en mobile", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('input[name="email"]', process.env.ADMIN_USER || "admin");
    await page.fill('input[name="password"]', process.env.ADMIN_PASS || "admin123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/);

    // Stats deben mostrar 2 columnas
    const statsGrid = page.locator(".grid-cols-2").first();
    await expect(statsGrid).toBeVisible();

    // Sin scroll horizontal
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5);
  });
});
