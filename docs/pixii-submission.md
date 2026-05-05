# Pixii.ai Submission Pack

## Public GitHub Repo

[https://github.com/hitarthbuilds/AnswerRank](https://github.com/hitarthbuilds/AnswerRank)

## Live Project

[https://answerrank-ai.vercel.app](https://answerrank-ai.vercel.app)

Current deployment note:
- The public deployment is configured in stable mock mode for reviewer reliability.
- That means the app always renders a complete diagnostic flow without depending on live provider credits or third-party uptime.

## Demo Video Script

Target length:
- 2.5 to 3 minutes

Suggested title card:
- `AnswerRank AI`
- `Pixii.ai Founding Engineer Take-Home`

### Opening

Hi, I’m Hitarth. I built AnswerRank AI, a lightweight AEO diagnostic for ecommerce brands.

The core problem I wanted to solve is that brands know how to optimize for Google, Amazon, and paid channels, but they usually have no visibility into how AI answer engines talk about their products.

AnswerRank AI makes that visible by showing whether a product is mentioned, where it ranks, which competitors win, and what listing changes would improve its chances of being recommended.

### Show the homepage

I’ll start on the homepage.

The app is built in Next.js with the App Router, TypeScript, and Tailwind.

The workflow is intentionally simple for a take-home demo: enter structured product context, run a diagnostic, inspect the report, and generate a listing rewrite.

### Show the form

Here’s the diagnostic intake form.

It accepts the product name, product URL, product description, the target buyer-intent query, competitors, audience, and region.

For the demo, I can use the built-in sample input so the flow is reproducible and fast.

### Run diagnostic

When I click Run Diagnostic, the app sends the request to `/api/diagnose`.

In stable mock mode, it uses seeded OpenAI, Gemini, and Claude-style responses so the demo is deterministic.

In live mode, Gemini can run as the answer engine, Firecrawl can extract product-page context from the submitted URL, and optional OpenAI and Anthropic adapters can be enabled later just by adding keys.

### Show report dashboard

The report shows the overall AEO score, a component breakdown, provider-level results, competitor visibility, insights, recommendations, and raw provider responses.

One thing I wanted to be explicit about is provider coverage.

If only one live provider runs, the app keeps the sampled score internally, but caps the displayed score so a single provider does not pretend to represent the full AI answer surface.

That makes the output more honest in Gemini-only live mode.

### Show source metadata card

This source card makes the runtime path explicit.

It shows whether the report came from mock mode, live mode, or mock fallback, which providers were configured, which providers actually ran, whether Firecrawl was used, and what coverage the score is based on.

I added this because for a tool like this, it is important that a reviewer can tell whether they are seeing a live result or a stable fallback.

### Show competitor leaderboard and recommendations

The competitor leaderboard is built from deterministic parsing of the raw provider responses.

The parser normalizes product names, handles punctuation differences like straight and curly apostrophes, detects mentions, infers rank by first appearance, and excludes the submitted product from the competitor table.

The recommendation layer then groups concrete actions into title, bullets, FAQ, trust signals, positioning, and comparison content.

### Show Fix It Engine

Below that is the Fix It Engine.

This takes the current report and generates a stronger listing rewrite: a rewritten title, five bullets, FAQ copy, and a positioning statement.

In mock mode it falls back deterministically.

In live mode it can use Gemini, but the UX stays the same.

### Close

My goal with this build was not to over-engineer a full v2 platform.

I focused on a stable founding-engineer MVP that stays honest about live versus mock behavior, degrades gracefully when providers fail, and gives a reviewer a complete demo in under three minutes.

If I extended this further, the next steps would be streaming diagnostics, query expansion, repeat tracking over time, and deeper commerce workflow integrations.

## Short Intro For The Submission Form

Hi, I’m Hitarth. I like building practical AI products that make their runtime behavior explicit instead of hiding behind demo magic.

For this take-home, I treated the assignment like a small production launch rather than a prototype. I focused on a stable end-to-end experience first: a usable Next.js product, deterministic mock mode, a truthful live-mode path, graceful provider failure handling, and a report that is easy to understand quickly.

My thought process was to keep the architecture simple but extensible. I separated provider adapters from parsing and scoring, made the report contract consistent across mock and live paths, added coverage-adjusted scoring so single-provider runs are not misleading, and built the Fix It Engine on top of the same report state instead of inventing a separate flow.

The result is a demoable MVP that works reliably today, while still being structured so full multi-provider live mode can be expanded later without rewriting the app.

## Short Version For A Text Box

I built AnswerRank AI as a stable MVP for diagnosing how ecommerce products appear in AI buying answers. My priority was shipping a reliable end-to-end workflow first: structured input, deterministic mock mode, live Gemini + Firecrawl support, honest source metadata, coverage-adjusted scoring, competitor analysis, and a Fix It Engine for listing rewrites. I deliberately kept the architecture simple, with provider adapters separated from parsing and scoring, so the product is demoable now and still extensible toward a fuller multi-provider AEO platform later.
