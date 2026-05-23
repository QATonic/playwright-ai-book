/**
 * Chapter 3 — Your first AI test.
 *
 * These tests use the ai() helper to act on the page by intent,
 * and hand-written Playwright assertions to verify outcomes.
 *
 * Rule: AI acts. Playwright asserts. Always.
 */
import { expect, test } from '@playwright/test';
import { ai } from './helpers/ai';

test('AI navigates to installation page', async ({ page }) => {
  await page.goto('https://playwright.dev');

  // AI acts
  await ai('Click the Get Started link in the main navigation', { page });

  // Playwright asserts — explicit, deterministic
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});

test('AI opens the API docs', async ({ page }) => {
  await page.goto('https://playwright.dev');

  await ai('Click the API link in the navigation', { page });

  await expect(page).toHaveURL(/\/docs\/api/);
});
