/**
 * Chapter 1 — Setup smoke tests.
 *
 * These are the "your first test" examples. They run against playwright.dev
 * so you can verify your setup before pointing at your own app.
 */
import { expect, test } from '@playwright/test';

test('Playwright homepage has the right title', async ({ page }) => {
  await page.goto('https://playwright.dev');
  await expect(page).toHaveTitle(/Playwright/);
});

test('Get Started link works', async ({ page }) => {
  await page.goto('https://playwright.dev');
  await page.getByRole('link', { name: 'Get started' }).click();
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});

// The 90-second challenge from Chapter 1
test('Docs has Writing tests link', async ({ page }) => {
  await page.goto('https://playwright.dev');
  await page.getByRole('link', { name: 'Docs' }).first().click();
  await expect(page.getByRole('link', { name: 'Writing tests', exact: true })).toBeVisible();
});
