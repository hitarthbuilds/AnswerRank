# Product + Engineering Roadmap

## Phase 1: Input limits
- Add strict request-size and competitor-count guards
- Normalize buyer-intent query and competitor inputs

## Phase 2: Rate limiting
- Add per-route free-tier limits
- Prefer Upstash Redis, fallback to in-memory development mode

## Phase 3: Query expansion
- Deterministic buyer-intent expansion
- Optional LLM-assisted expansion behind env gating

## Phase 4: Streaming diagnostics
- Add `/api/diagnose/stream`
- Stream stage events, provider progress, and final result

## Phase 5: Multi-query scoring
- Move from single-query scoring to expanded query coverage
- Add visibility score, confidence score, and coverage level

## Phase 6: Full tri-engine audit
- Unlock Gemini + OpenAI + Claude when configured
- Keep provider coverage claims honest

## Phase 7: Lead capture
- Add full-audit request CTA
- Capture and log leads safely before adding payments

## Phase 8: PDF/export
- Generate shareable PDF and share-link output

## Phase 9: Payments
- Add self-serve checkout for full audits

## Phase 10: Monthly tracking
- Scheduled re-runs
- Historical visibility trends
- Alerting and retention workflows
