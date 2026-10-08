# Labour Indicators Dashboard

[![Next.js](https://img.shields.io/badge/next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue)](./tsconfig.json)

The front end for [labour-indicators-api](https://github.com/wastewalker/labour-indicators-api):
a Next.js app that lists indicator series, charts them with year-over-year variation, and
manages each series' lifecycle from draft to published to archived.

> **What this is.** The client half of a small full-stack system, built to show the front-end
> engineering around it: server-rendered pages, schema-driven forms with accessible
> validation, a typed API client, component tests with React Testing Library, and end-to-end
> tests with Playwright in CI.
>
> **What this is not.** A statistics product. There is no authentication, and the API it talks
> to is deliberately small. See [Limitations](#limitations).
>
> **How it was built.** With Claude Code, more delegated than the API it talks to.
> [AI-WORKFLOW.md](./AI-WORKFLOW.md) records what was decided, what was generated, and what
> went wrong.

---

## Contents

- [Quick start](#quick-start)
- [What it does](#what-it-does)
- [Design decisions](#design-decisions)
- [Testing strategy](#testing-strategy)
- [CI](#ci)
- [Project layout](#project-layout)
- [Limitations](#limitations)
- [How AI was used](./AI-WORKFLOW.md)

---

## Quick start

Requires Node 22.

### Try it without the API

A seeded in-memory copy of the API ships with the repository, so the dashboard runs with
nothing else installed:

```bash
npm ci
cp .env.example .env.local   # then set INDICATORS_API_URL=http://localhost:4010
npm run mock-api             # terminal 1: mock API on :4010
npm run dev                  # terminal 2: app on http://localhost:3001
```

Next.js reads `.env.local` itself, so this works the same on Windows, macOS and Linux.

### Against the real API

Start the API from its own repository (`docker compose up --build` there serves it on
`:3000`), set `INDICATORS_API_URL=http://localhost:3000` in `.env.local`, and run
`npm run dev`.

### Run the checks

```bash
npm run lint
npm run typecheck
npm test                 # unit and component tests
npm run test:coverage    # same, with the thresholds CI enforces
npx playwright install chromium
npm run test:e2e         # builds the app, starts it with the mock API, runs Playwright
```

## What it does

| Page               | Purpose                                                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `/`                | All indicators, filterable by status, paginated. Filters and pages live in the URL.                                         |
| `/indicators/new`  | Create a draft indicator.                                                                                                   |
| `/indicators/[id]` | Latest value, chart, observations with year-over-year variation, an add-observation form for drafts, and lifecycle actions. |

## Design decisions

**The browser never talks to the API.** Pages are React Server Components that call the API
on the server, and every mutation is a Server Action. The API URL is read through a module
marked `server-only`, so importing it into client code fails the build. This also means the
API needs no CORS configuration.

**Variation is rendered in the unit the API says it is in.** The API returns `variationKind`
with every series. A percentage series changes in percentage points, so an unemployment rate
going from 6.0% to 7.5% shows as **+1.5 pp**, never as "+1.5%" (which would claim a 1.5%
relative rise). `formatVariation` is the only place that decision is made, and it is unit
tested.

**Direction is not judged by colour.** Whether a rise is good news depends on the indicator
(employment up is good, unemployment up is not), so the variation cell shows direction with
an arrow and a screen-reader word, not green-for-up and red-for-down.

**Forms are generated from the series they edit.** The add-observation form takes the
indicator's unit and frequency. The period field's format, example and `pattern` follow the
frequency (`2024`, `2024-Q1`, `2024-M01`), and the value field's step, bounds and hint follow
the unit (whole numbers for counts, 0–100 for percentages, strictly positive for indices).
The create form explains which variation the chosen unit implies before the series exists.

**Client-side rules are a courtesy; the API is the authority.** `src/lib/domain.ts` mirrors
the API's validation so users see mistakes before a round trip, but every rule is re-checked
by the API, and its error message is what the form shows when they disagree. Submitted
values are echoed back on error so a refused form keeps what was typed.

**Only legal lifecycle moves are offered.** A draft can be published (once it has two
observations) or archived; a published series can only be archived; archived is final. The
UI disables "Publish" with the reason instead of letting the API refuse it.

**No chart library.** The chart is server-rendered SVG. The geometry (scales, tick
steps, label thinning) is a pure module tested on its own, and the table beside it carries
the same numbers for assistive technology.

## Testing strategy

**Unit and component tests (Vitest + React Testing Library).** Domain rules, formatting,
chart geometry and the API client are tested directly. The client takes `fetch` as a
parameter, so its tests use canned responses with no network and no module mocking.
Components are tested the way a user meets them: by label and role, typing with
`user-event`, and asserting on what is announced. Forms receive their Server Action as a
prop, so tests pass a plain function and inspect the `FormData` it was called with.

Coverage thresholds (90% lines, 85% branches) apply to `src/lib` and `src/components` and
are enforced in CI. Pages, layouts and Server Actions are framework glue and are covered by
the end-to-end suite instead of being mocked.

**End-to-end tests (Playwright).** The suite builds the production app and runs it against
`e2e/mock-api/server.mjs`, an in-memory implementation of the API's routes, status codes and
error bodies. Each test resets it, so tests are independent and need no database. They cover
listing and filtering, a percentage series rendered in pp, the full create → observe →
publish flow, client-side rejection of a malformed period, and the API's own refusals
(duplicate period, duplicate code) reaching the form.

The mock is a stand-in, not a source of truth. The create → observe → publish and not-found
tests have also been run against the real API backed by PostgreSQL.

## CI

`.github/workflows/ci.yml` runs on every push and pull request to `main`:

1. **quality**: Prettier check, ESLint, TypeScript.
2. **unit**: Vitest with coverage thresholds, summary posted to the run.
3. **e2e**: after both pass, installs Chromium and runs Playwright; the HTML report is
   uploaded when it fails.

## Project layout

```
src/
  app/                    routes (server components), error and not-found pages
    indicators/actions.ts server actions: create, add observation, change status
  components/             UI components and their tests
  lib/
    api/                  typed client, error type, server-only instance
    domain.ts             client-side copy of the API's rules
    format.ts             value and variation formatting
    chart.ts              chart geometry
    forms.ts              form state shared by actions and components
e2e/
  indicators.spec.ts      Playwright tests
  mock-api/server.mjs     in-memory API for e2e and local demos
```

## Limitations

- No authentication or roles; anyone who can reach the app can publish.
- The mock API mirrors the contract the UI uses, not every edge of the real service.
- Text is English only.
