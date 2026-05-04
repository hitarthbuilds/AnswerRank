# AnswerRank AI

AnswerRank AI is a Next.js take-home MVP for diagnosing how well a product shows up inside buyer-intent AI shopping answers.

The app accepts structured product context, runs either stable mock mode or live provider mode, parses brand mentions deterministically, calculates an AEO score, and renders a founder-demo-ready dashboard.

## Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS

## APIs / Tools Used

This project satisfies the take-home requirement of using 2+ APIs/tools:

1. Gemini API
   Used as the live answer-engine provider for buyer-intent product recommendation responses.

2. Firecrawl API
   Used to extract product-page context from submitted product URLs.

Optional adapters:
- OpenAI provider adapter
- Anthropic provider adapter

These are implemented as optional adapters and skipped gracefully if API keys are not present.

Internal tools:
- Deterministic brand mention parser
- AEO scoring engine
- Competitor leaderboard builder
- Recommendation generator

## Running Locally

Install dependencies and start the app:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Running in Mock Mode

Set:

```bash
NEXT_PUBLIC_DEMO_MODE=true
```

Mock mode uses stable seeded OpenAI, Gemini, and Claude-style responses so the demo works without any external API keys.

## Running Gemini + Firecrawl Live Mode

Set:

```bash
NEXT_PUBLIC_DEMO_MODE=false
GEMINI_API_KEY=your_key
FIRECRAWL_API_KEY=your_key
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
```

Gemini is enough for live LLM mode. Firecrawl is optional, but when a product URL is provided and a Firecrawl key exists, the app will extract product-page context and add it to the Gemini prompt.

## Enabling Full 3-Provider Live Mode

Add valid provider keys:

```bash
NEXT_PUBLIC_DEMO_MODE=false
GEMINI_API_KEY=your_key
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
FIRECRAWL_API_KEY=your_key
```

When valid OpenAI and Anthropic keys are added later, the app automatically expands from Gemini-only live mode to multi-provider live mode without further code changes.

## Behavior Notes

- No auth
- No billing
- No database
- API keys stay server-side
- Mock mode remains fully supported
- One failed provider does not break the report
- If live providers all fail, the app falls back to the seeded mock report

## Validation

Before shipping:

```bash
npm run lint
npm run build
```
