# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Companion code for the book *Playwright + AI: From Zero to Shipping in a Weekend*. Every helper/script maps to a specific chapter — preserve those mappings (and the chapter references in file headers) when editing.

## Commands

```bash
npm test                  # run full suite (Chromium only)
npm run test:ui           # Playwright UI mode
npm run test:headed       # headed browser
npm run test:debug        # inspector
npm run report            # open last HTML report

# Run a single spec / single test
npx playwright test smoke.spec.ts
npx playwright test -g "AI navigates to installation page"

# Scripts (Chapters 5 & 6)
npm run gen -- https://playwright.dev          # ts-node scripts/gen-tests.ts
npm run mcp                                     # starts @playwright/mcp on :8931
npm run explore                                 # runs scripts/explore.ts (needs mcp running)

npm run cache:clear       # rm -rf .ai-cache (uses POSIX rm — on Windows use: Remove-Item -Recurse -Force .ai-cache)
```

First-time setup needs `npx playwright install --with-deps chromium` and an `ANTHROPIC_API_KEY` in `.env`. There is no lint or typecheck script wired up; rely on `tsc --noEmit` if needed.

Local default is 2 workers ([playwright.config.ts:21](playwright.config.ts#L21)). Unbounded parallelism stalls `browserContext.newPage` past the 30s timeout on typical dev machines — don't raise it without testing.

## Environment

- `ANTHROPIC_API_KEY` — required for any `tests/helpers/{ai,smart-locator,visual}.ts` call and the scripts.
- `ANTHROPIC_MODEL` — defaults to `claude-sonnet-4-6` everywhere.
- `AI_COST_CAP` — USD circuit breaker (default `1.00`). `checkBudget()` reads this before every API call and throws if exceeded.
- `BASE_URL`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD` — wire `global-setup.ts` and `tests/fixtures.ts`'s `loggedInPage` fixture against your own app. If `BASE_URL` is unset, global-setup logs a skip and tests run unauthenticated.
- `EXPLORE_URL`, `EXPLORE_MISSION` — override the example target/mission in `scripts/explore.ts`.

## Architecture

Three things are happening across the helpers; they share infrastructure but solve different problems:

1. **`ai()` (Chapter 3, `tests/helpers/ai.ts`)** — Intent → action. Snapshots the page's accessibility tree, asks Claude for Playwright code, then executes it via `new Function(...)`. Used inside tests for *actions only*.
2. **`smartLocator()` (Chapter 4, `tests/helpers/smart-locator.ts`)** — Self-healing wrapper around a primary locator. Tries the primary first (3s timeout); on failure, asks Claude for a replacement locator and caches it. Every heal is appended to `heal-report.json` for human review.
3. **`visualAssert()` (Chapter 6, `tests/helpers/visual.ts`)** — Vision-model semantic check. Sends a full-page screenshot + expectation, expects a `{ pass, reason }` JSON response.

**The invariant the book enforces (do not violate it):** *AI acts, Playwright asserts.* Generated/healed code is allowed for clicks/fills/navigation. Assertions stay hand-written and deterministic. `smartLocator` is explicitly documented as ACTIONS-ONLY — never wrap an assertion target with it.

**Shared caching layer.** `ai()` keys cache by hash(instruction + ariaSnapshot), `smartLocator` by hash(description + URL-without-query). Both write to `.ai-cache/`. Warm cache = no API call. `heal-report.json` and `.ai-cache/cost.log` are the audit trail.

**Cost tracking (`tests/helpers/cost.ts`)** is wired into every API caller — `ai`, `smartLocator`, `visualAssert`, `gen-tests`, `explore` all call `logCost(...)` after responses and `checkBudget()` before. `global-teardown.ts` prints the per-run total via `summarizeCost()`. The per-Mtoken rates in `cost.ts` are Sonnet-class estimates — they need updating when pricing or the default model changes.

**Generated code execution is intentional and load-bearing.** `ai()` and `smartLocator()` both `new Function(...)` Claude's output. The README's safety section and Appendix B are explicit that this is RCE-by-design — only safe because prompts are author-controlled and targets are staging. Do not refactor this into a more "general" eval path that could accept user input, and do not add a mode that points these helpers at production.

**Test entry points.** `tests/fixtures.ts` extends `@playwright/test` with a `loggedInPage` fixture; new auth-requiring specs should import `test, expect` from `./fixtures` instead of `@playwright/test`. `global-setup.ts` (not currently registered in `playwright.config.ts` — registration is left as a book exercise) is the storage-state pattern. `global-teardown.ts` is registered and prints cost totals.

**MCP path (`scripts/explore.ts`)** uses Anthropic's `mcp_servers` beta with a `@ts-expect-error` — keep that suppression until the SDK types catch up. It talks to a separately-launched `@playwright/mcp` process on port 8931.

## Conventions worth preserving

- Locator strategy is always `getByRole` / `getByLabel` / `getByText`. CSS selectors and XPath are explicitly disallowed in every AI prompt — don't loosen that.
- Snapshots sent to Claude are truncated to 8000 chars (`snapshot.slice(0, 8000)`). That's a deliberate token-cost ceiling; don't remove the slice when "fixing" a missing-element case — fix the prompt or the locator instead.
- Chapter references in file-header comments (`From Chapter X of the book`) are part of the product. Keep them accurate when moving code.
