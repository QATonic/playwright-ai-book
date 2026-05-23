/**
 * Cost tracking and circuit breaker for AI calls.
 *
 * Logs every API call's cost to .ai-cache/cost.log (CSV format).
 * Throws if AI_COST_CAP is exceeded — prevents runaway loops.
 *
 * See Chapter 7 of the book for details.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';

const LOG = '.ai-cache/cost.log';
const COST_CAP = parseFloat(process.env.AI_COST_CAP || '1.00');

// Approximate Claude Sonnet pricing — update from anthropic.com/pricing
// These rates are for Sonnet-class models as of early 2026.
const PER_INPUT_MTOK = 3.0;   // $ per 1M input tokens
const PER_OUTPUT_MTOK = 15.0; // $ per 1M output tokens

function ensureLogDir(): void {
  const dir = dirname(LOG);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/**
 * Log a single AI call's token usage and computed cost.
 */
export function logCost(inputTokens: number, outputTokens: number, label: string): void {
  ensureLogDir();
  const cost =
    (inputTokens / 1_000_000) * PER_INPUT_MTOK +
    (outputTokens / 1_000_000) * PER_OUTPUT_MTOK;

  if (!existsSync(LOG)) {
    writeFileSync(LOG, 'time,label,input,output,cost\n');
  }
  appendFileSync(
    LOG,
    `${new Date().toISOString()},${label},${inputTokens},${outputTokens},${cost.toFixed(5)}\n`,
  );
}

/**
 * Throw if the run has exceeded AI_COST_CAP.
 * Call this before every AI API request.
 */
export function checkBudget(): void {
  if (!existsSync(LOG)) return;

  const total = readFileSync(LOG, 'utf-8')
    .trim()
    .split('\n')
    .slice(1) // skip CSV header
    .reduce((acc, line) => {
      const parts = line.split(',');
      return acc + (parseFloat(parts[4]) || 0);
    }, 0);

  if (total > COST_CAP) {
    throw new Error(
      `💸 AI cost cap of $${COST_CAP.toFixed(2)} exceeded ($${total.toFixed(4)}). ` +
      `Aborting to protect your wallet. Raise AI_COST_CAP or investigate the loop.`,
    );
  }
}

/**
 * Print a one-line cost summary. Called from globalTeardown.
 */
export function summarizeCost(): void {
  if (!existsSync(LOG)) {
    console.log('💰 No AI calls this run.');
    return;
  }
  const lines = readFileSync(LOG, 'utf-8').trim().split('\n').slice(1);
  const total = lines.reduce((acc, line) => {
    const parts = line.split(',');
    return acc + (parseFloat(parts[4]) || 0);
  }, 0);
  console.log(`💰 Total AI cost this run: $${total.toFixed(4)} across ${lines.length} calls`);
}
