# AGENTS.md

You are building AnswerRank AI for the Pixii.ai Founding Engineer take-home.

Before coding, read:

- docs/AnswerRankAI_PRD_SRS_v2.docx

Use the document as the product and engineering source of truth.

Important implementation rule:

Do not try to build every v2 feature at once. Build in phases. The app must remain working after every phase.

MVP priority order:

1. Working UI with diagnostic form and sample data
2. Mock report dashboard using realistic mock data
3. TypeScript types and clean file structure
4. POST /api/diagnose route that validates input and returns a full DiagnoseResponse
5. Deterministic parser and scoring engine
6. Provider abstraction for OpenAI, Gemini, and Anthropic
7. Graceful fallback when API keys are missing
8. Fix It Engine endpoint and UI
9. Score history with localStorage
10. Share link
11. Streaming responses only after the stable non-streaming flow works
12. Firecrawl only if time remains

Hard constraints:

- Use Next.js 14+, TypeScript, Tailwind CSS, and App Router.
- No authentication.
- No billing.
- No server-side database.
- API keys must remain server-side only.
- App must work in mock/demo mode.
- One failed provider must not break the report.
- npm run build must pass.
- Final app must be demoable in under 3 minutes.

When in doubt, prioritize a working demo over advanced architecture.