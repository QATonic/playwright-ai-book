import { chromium, FullConfig } from '@playwright/test';
import 'dotenv/config';

/**
 * Runs once before all tests. Logs in and saves storage state to auth.json
 * so individual tests can start already authenticated.
 *
 * See Chapter 2 for the full pattern.
 *
 * NOTE: This is a demo. Wire it up to YOUR app's login flow.
 * Don't run it against production.
 */
async function globalSetup(_config: FullConfig): Promise<void> {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  const baseURL = process.env.BASE_URL;

  if (!email || !password || !baseURL) {
    console.log('⏭  Skipping global-setup: TEST_USER_EMAIL/PASSWORD/BASE_URL not set');
    return;
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(`${baseURL}/login`);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.context().storageState({ path: 'auth.json' });
    console.log('✅ Saved auth.json');
  } catch (err) {
    console.warn('⚠️  global-setup failed (this is fine if you have no app running):', (err as Error).message);
  } finally {
    await browser.close();
  }
}

export default globalSetup;
