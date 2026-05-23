/**
 * Shared test fixtures.
 *
 * From Chapter 2 of the book.
 *
 * USAGE
 *   import { test, expect } from './fixtures';
 *
 *   test('view dashboard', async ({ loggedInPage }) => {
 *     await expect(loggedInPage.getByText('Dashboard')).toBeVisible();
 *   });
 */
import { test as base, Page } from '@playwright/test';
import 'dotenv/config';

type Fixtures = {
  loggedInPage: Page;
};

export const test = base.extend<Fixtures>({
  loggedInPage: async ({ page }, use) => {
    const email = process.env.TEST_USER_EMAIL || 'test@example.com';
    const password = process.env.TEST_USER_PASSWORD || 'hunter2';
    const baseURL = process.env.BASE_URL;

    if (baseURL) {
      await page.goto(`${baseURL}/login`);
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill(password);
      await page.getByRole('button', { name: /sign in|log in/i }).click();
      await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    }

    await use(page);
  },
});

export { expect } from '@playwright/test';
