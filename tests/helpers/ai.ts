/**
 * ai() — Find elements and perform actions by intent, not selectors.
 *
 * From Chapter 3 of the book.
 *
 * USAGE
 *   await ai('Click the Get Started link in the main navigation', { page });
 *
 * HOW IT WORKS
 *   1. Snapshots the page's accessibility tree.
 *   2. Sends the snapshot + instruction to Claude.
 *   3. Executes the returned Playwright code via `new Function`.
 *   4. Caches the generated code by (instruction + snapshot) hash.
 *
 * SAFETY
 *   This helper executes generated code. ONLY use it:
 *   - In test environments
 *   - With prompts you control (never with user input flowing in)
 *   - Against staging or local services (never production)
 *
 *   See Appendix B (Security & Safety) for the full checklist.
 */
import Anthropic from '@anthropic-ai/sdk';
import { Page } from '@playwright/test';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';
import { checkBudget, logCost } from './cost';

const client = new Anthropic();
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const CACHE_DIR = '.ai-cache';

if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

interface AiOptions {
  page: Page;
}

export async function ai(instruction: string, { page }: AiOptions): Promise<void> {
  checkBudget();

  const snapshot = await page.locator('body').ariaSnapshot({ ref: true } as never);
  const cacheKey = createHash('md5')
    .update(instruction + snapshot)
    .digest('hex');
  const cachePath = join(CACHE_DIR, `${cacheKey}.txt`);

  let code: string;

  if (existsSync(cachePath)) {
    code = readFileSync(cachePath, 'utf-8');
    console.log(`🧠 [ai] cache hit: "${instruction}"`);
  } else {
    console.log(`🤖 [ai] calling Claude: "${instruction}"`);
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: buildPrompt(snapshot, instruction) }],
    });
    code = (response.content[0] as { type: 'text'; text: string }).text.trim();
    writeFileSync(cachePath, code);
    logCost(response.usage.input_tokens, response.usage.output_tokens, 'ai');
  }

  try {
    const fn = new Function('page', `return (async () => { ${code} })()`);
    await fn(page);
  } catch (err) {
    console.error(`❌ [ai] generated code failed:\n${code}`);
    throw err;
  }
}

function buildPrompt(snapshot: string, instruction: string): string {
  // Truncate large snapshots to keep token costs sane
  const snapStr = snapshot.slice(0, 8000);
  return `You are a Playwright expert. Given this page snapshot and instruction, return ONLY the Playwright code to execute. No explanations, no markdown fences, no preamble.

Use 'page' as the Page object. Prefer getByRole, getByLabel, getByText. Never use brittle CSS classes or XPath.

Page snapshot:
${snapStr}

Instruction: ${instruction}`;
}
