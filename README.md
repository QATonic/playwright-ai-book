# Playwright + AI — Companion Code

> Runnable code from the book **Playwright + AI: From Zero to Shipping in a Weekend**
> by Santosh Balbhim Karad, Sr. QA Engineer

This repository contains every helper, script, and configuration file referenced in the book. Clone, install, and ship.

---

## What's in here

```
playwright-ai-book/
├── tests/
│   ├── helpers/
│   │   ├── ai.ts             ← Chapter 3: AI as locator
│   │   ├── smart-locator.ts  ← Chapter 4: Self-healing tests
│   │   ├── visual.ts         ← Chapter 6: Visual assertions
│   │   └── cost.ts           ← Chapter 7: Cost tracking & budget caps
│   ├── fixtures.ts           ← Chapter 2: Shared test fixtures
│   ├── smoke.spec.ts         ← Chapter 1: First tests
│   └── ai-smoke.spec.ts      ← Chapter 3: First AI test
├── scripts/
│   ├── gen-tests.ts          ← Chapter 5: Generate tests from URL
│   └── explore.ts            ← Chapter 6: Agentic exploration via MCP
├── .github/workflows/
│   └── playwright.yml        ← Chapter 7: CI with AI cache
├── global-setup.ts           ← Chapter 2: Storage state
├── global-teardown.ts        ← Chapter 7: Cost summary
├── playwright.config.ts
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Quick start

```bash
# 1. Clone & install
git clone https://github.com/QATonic/playwright-ai-book.git
cd playwright-ai-book
npm install

# 2. Configure your API key
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# 3. Install browsers (one-time)
npx playwright install --with-deps chromium

# 4. Run the tests
npx playwright test
```

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| **Node.js** | 20.x LTS | 18+ works, 20+ recommended |
| **Playwright** | 1.49+ | For latest MCP server support |
| **TypeScript** | 5.x | Any 5.x release |
| **Anthropic SDK** | 0.40+ | `@anthropic-ai/sdk` |
| **Anthropic API key** | — | Get one at [console.anthropic.com](https://console.anthropic.com) |

---

## Configuration

Required environment variables:

```bash
ANTHROPIC_API_KEY=sk-ant-...your-key-here
```

Optional (with sensible defaults):

```bash
ANTHROPIC_MODEL=claude-sonnet-4-6   # Override if needed
AI_COST_CAP=1.00                    # Circuit breaker in USD
```

See `.env.example` for the full list.

---

## Running specific chapters

```bash
# Chapter 1: smoke tests
npx playwright test smoke.spec.ts

# Chapter 3: AI-driven tests
npx playwright test ai-smoke.spec.ts

# Chapter 5: Generate tests from a URL
npx ts-node scripts/gen-tests.ts https://playwright.dev

# Chapter 6: Run an agent against staging
npx @playwright/mcp@latest --port 8931 &
npx ts-node scripts/explore.ts
```

---

## Safety reminders (read before running)

These are paraphrased from **Appendix B** of the book. Take them seriously.

- **Never use production credentials** in AI-driven tests. Use staging or dedicated test accounts.
- **Never point an agent at production.** Agents wander. Staging only.
- **Never let arbitrary user input reach the AI prompt.** The helpers execute generated code; user-controlled prompts = RCE risk.
- **Set `AI_COST_CAP`** as a circuit breaker. Low locally ($0.50), modest in CI ($2–5).
- **Review every healed locator** before merging. A healed locator that finds the wrong element is worse than a failing test.
- **The rule:** AI acts. Playwright asserts. Always.

---

## Costs

Approximate costs for the patterns in this book, assuming Claude Sonnet pricing as of 2026:

| Scenario | Cost per run |
|---|---|
| Local dev (warm cache) | ~$0.01 |
| CI on PR (warm cache) | ~$0.05 |
| CI on PR (cold cache, new branch) | ~$0.40 |
| Weekly full regen | ~$1.50 |
| **Monthly** (10 devs, ~200 PRs) | **~$15–30** |

Check current pricing at [anthropic.com/pricing](https://www.anthropic.com/pricing).

---

## Contributing

Issues and PRs welcome. If you found a bug, a stale model name, an improved pattern, or a missing troubleshooting entry — open an issue.

---

## License

Code: MIT (see `LICENSE`)
Book text: © 2026 Santosh Balbhim Karad. All rights reserved.

---

## Buy the book

The book is available as a PDF / paperback. Links at [github.com/QATonic/playwright-ai-book#buy](https://github.com/QATonic/playwright-ai-book#buy).

If this repo saves you time, consider buying the book. It's how I keep writing.
