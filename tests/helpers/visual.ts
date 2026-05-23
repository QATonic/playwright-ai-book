/**
 * visualAssert() — Semantic visual checks using a vision model.
 *
 * From Chapter 6 of the book.
 *
 * USAGE
 *   await visualAssert(page, `
 *     The page shows a checkout form with:
 *     - An order summary on the right with items and total
 *     - Payment fields on the left
 *     - A prominent "Pay Now" button at the bottom
 *   `);
 *
 * WHEN TO USE
 *   - Page shape checks (does the dashboard show all 4 widgets?)
 *   - Email template renders
 *   - Empty/error state visuals
 *
 * WHEN NOT TO USE
 *   - Pixel-perfect QA (use Playwright's toHaveScreenshot instead)
 *   - Critical flows (login, payment) — assertions should be deterministic
 *   - High-volume runs (vision calls are 5-10× the cost of text)
 */
import Anthropic from '@anthropic-ai/sdk';
import { Page } from '@playwright/test';
import 'dotenv/config';
import { checkBudget, logCost } from './cost';

const client = new Anthropic();
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

interface VisualResult {
  pass: boolean;
  reason: string;
}

export async function visualAssert(page: Page, expectation: string): Promise<void> {
  checkBudget();

  const screenshot = await page.screenshot({ fullPage: true });
  const base64 = screenshot.toString('base64');

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/png', data: base64 },
        },
        {
          type: 'text',
          text: `Look at this screenshot. Does it meet this expectation?

Expectation: ${expectation}

Reply with ONLY a JSON object (no markdown fences):
{ "pass": true/false, "reason": "one sentence" }`,
        },
      ],
    }],
  });

  logCost(response.usage.input_tokens, response.usage.output_tokens, 'visual');

  const text = (response.content[0] as { type: 'text'; text: string }).text.trim();
  let result: VisualResult;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(`👁️ visualAssert could not parse response as JSON: ${text}`);
  }

  if (!result.pass) {
    throw new Error(`👁️ Visual assertion failed: ${result.reason}`);
  }
  console.log(`👁️ [visual] ${result.reason}`);
}
