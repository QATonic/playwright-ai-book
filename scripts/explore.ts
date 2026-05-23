#!/usr/bin/env ts-node
/**
 * explore.ts — Agentic exploratory testing via Playwright MCP.
 *
 * From Chapter 6 of the book.
 *
 * USAGE
 *   # In one terminal:
 *   npx @playwright/mcp@latest --port 8931
 *
 *   # In another:
 *   npx ts-node scripts/explore.ts
 *
 * WHAT IT DOES
 *   Hands control to Claude with a mission ("complete the signup flow") and
 *   the Playwright MCP toolset. Claude navigates, clicks, types, observes,
 *   and reports issues as JSON.
 *
 * SAFETY
 *   - Staging environments only. Never point this at production.
 *   - Set step limits and max_tokens to prevent runaway exploration.
 *   - Use dedicated test accounts. Agents will type into forms.
 */
import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';
import { logCost } from '../tests/helpers/cost';

const client = new Anthropic();
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

interface ExploreOptions {
  url: string;
  mission: string;
  mcpUrl?: string;
}

async function explore({ url, mission, mcpUrl = 'http://localhost:8931/sse' }: ExploreOptions): Promise<void> {
  console.log(`🕵️  Exploring ${url}`);
  console.log(`🎯 Mission: ${mission}\n`);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    // @ts-expect-error — mcp_servers is a beta feature, not in SDK types yet
    mcp_servers: [{
      type: 'url',
      url: mcpUrl,
      name: 'playwright',
    }],
    messages: [{
      role: 'user',
      content: `You are an exploratory tester. Visit ${url} and complete this mission:

${mission}

Use the playwright tools to navigate, click, fill forms, and observe.
Stop after at most 15 steps. After exploring, return a JSON report:
{
  "completed": true/false,
  "stepsAttempted": number,
  "issuesFound": [{ "severity": "low|medium|high", "description": "..." }],
  "summary": "one paragraph"
}`,
    }],
  });

  logCost(response.usage.input_tokens, response.usage.output_tokens, 'explore');

  // Combine all text outputs from the agent's turn
  const final = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n');

  console.log('📋 Agent report:\n');
  console.log(final);
}

// Example mission — edit for your app
const URL = process.env.EXPLORE_URL || 'https://playwright.dev';
const MISSION = process.env.EXPLORE_MISSION || 'Visit the docs section and try to find the "Locators" guide. Report any confusing navigation.';

explore({ url: URL, mission: MISSION }).catch((err) => {
  console.error('💥', err);
  process.exit(1);
});
