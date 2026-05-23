/**
 * smartLocator() — A self-healing locator wrapper.
 *
 * From Chapter 4 of the book.
 *
 * USAGE
 *   const btn = await smartLocator(
 *     page,
 *     'the submit button on the login form',
 *     () => page.getByRole('button', { name: 'Sign in' })
 *   );
 *   await btn.click();
 *
 * BEHAVIOR
 *   1. Tries the primary locator. If it resolves and is visible, return it.
 *   2. If it fails, asks Claude for a new locator using the current page snapshot.
 *   3. Caches the healed locator by (description + URL) hash.
 *   4. Records every heal to heal-report.json for review.
 *
 * THE SAFETY RULE
 *   Use smartLocator for ACTIONS only (click, fill, hover).
 *   Never use it for ASSERTIONS — that masks real bugs.
 *   See Chapter 4 for the full rationale.
 */
import Anthropic from '@anthropic-ai/sdk';
import { Locator, Page } from '@playwright/test';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import 'dotenv/config';
import { checkBudget, logCost } from './cost';

const client = new Anthropic();
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const CACHE_DIR = '.ai-cache/heal';
const REPORT = 'heal-report.json';
const PRIMARY_TIMEOUT_MS = 3000;

if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

export async function smartLocator(
  page: Page,
  description: string,
  primary: () => Locator,
): Promise<Locator> {
  // Step 1: try the primary locator
  try {
    const loc = primary();
    await loc.waitFor({ state: 'visible', timeout: PRIMARY_TIMEOUT_MS });
    return loc;
  } catch {
    console.log(`🔧 [heal] primary locator failed for: "${description}"`);
  }

  // Step 2: check cache (strip query params from URL for stable keys)
  checkBudget();
  const url = page.url().split('?')[0];
  const cacheKey = createHash('md5').update(description + url).digest('hex');
  const cachePath = `${CACHE_DIR}/${cacheKey}.txt`;

  let healedCode: string;

  if (existsSync(cachePath)) {
    healedCode = readFileSync(cachePath, 'utf-8');
    console.log(`🧠 [heal] using cached healed locator`);
  } else {
    // Step 3: ask AI for a new locator
    const snapshot = await page.locator('body').ariaSnapshot();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `Given this page snapshot, return ONE line of Playwright locator code to find: "${description}". Return ONLY the code starting with "page.", no explanations.

Example output: page.getByRole('button', { name: 'Log in' })

Snapshot:
${snapshot.slice(0, 8000)}`,
      }],
    });

    healedCode = (response.content[0] as { type: 'text'; text: string }).text.trim();
    writeFileSync(cachePath, healedCode);
    logCost(response.usage.input_tokens, response.usage.output_tokens, 'heal');
    recordHeal(description, healedCode);
    console.log(`✨ [heal] AI suggested: ${healedCode}`);
  }

  // Step 4: eval the healed locator
  const fn = new Function('page', `return ${healedCode}`);
  return fn(page) as Locator;
}

function recordHeal(description: string, newCode: string): void {
  const entry = {
    description,
    newCode,
    at: new Date().toISOString(),
  };
  const existing = existsSync(REPORT)
    ? JSON.parse(readFileSync(REPORT, 'utf-8'))
    : [];
  existing.push(entry);
  writeFileSync(REPORT, JSON.stringify(existing, null, 2));
}
