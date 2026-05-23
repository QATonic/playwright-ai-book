#!/usr/bin/env ts-node
/**
 * gen-tests.ts — Generate Playwright spec files from a URL.
 *
 * From Chapter 5 of the book.
 *
 * USAGE
 *   npx ts-node scripts/gen-tests.ts https://playwright.dev
 *
 * OUTPUT
 *   tests/generated/<slug>.spec.ts
 *
 * THE REVIEW PASS (don't skip this)
 *   Generated files are DRAFTS. Before committing, verify:
 *   - Assertions are meaningful (not just "page loaded")
 *   - Critical paths are covered (AI doesn't know your business logic)
 *   - Locators are stable
 *   - Test data is sensible
 */
import Anthropic from '@anthropic-ai/sdk';
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';
import { logCost } from '../tests/helpers/cost';

const client = new Anthropic();
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

async function generateTests(url: string): Promise<void> {
  console.log(`🌐 Visiting ${url}...`);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  const snapshot = await page.locator('body').ariaSnapshot();
  const title = await page.title();
  await browser.close();

  console.log(`🤖 Asking Claude to scaffold tests...`);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: buildPrompt(url, title, snapshot) }],
  });

  logCost(response.usage.input_tokens, response.usage.output_tokens, 'gen-tests');

  const code = (response.content[0] as { type: 'text'; text: string }).text
    .replace(/```typescript\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  const outDir = 'tests/generated';
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const filename = url
    .replace(/https?:\/\//, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .toLowerCase()
    .replace(/^-+|-+$/g, '') + '.spec.ts';
  const outPath = join(outDir, filename);
  writeFileSync(outPath, code);

  console.log(`✨ Generated: ${outPath}`);
  console.log(`   Review before committing — see Chapter 5 "Review Pass".`);
}

function buildPrompt(url: string, title: string, snapshot: string): string {
  return `You are a senior test automation engineer. Generate a Playwright + TypeScript spec file for the URL below.

Rules:
- Use getByRole, getByLabel, getByText. NEVER use CSS selectors or XPath.
- Generate 4-6 tests covering: page load, primary navigation, key interactions, one negative case if obvious.
- Each test should be independent (no shared state).
- Add a one-line comment above each test explaining what it covers.
- Use expect() for assertions — be specific, not generic.
- Output ONLY the .spec.ts file content, no markdown fences, no explanations.

URL: ${url}
Page title: ${title}

Accessibility snapshot:
${snapshot.slice(0, 8000)}`;
}

const url = process.argv[2];
if (!url) {
  console.error('Usage: ts-node scripts/gen-tests.ts <url>');
  process.exit(1);
}

generateTests(url).catch((err) => {
  console.error('💥', err);
  process.exit(1);
});
