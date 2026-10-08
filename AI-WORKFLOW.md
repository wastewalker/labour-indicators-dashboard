# How AI was used to build this

This dashboard was built in a single working session with
[Claude Code](https://claude.com/claude-code). It was more delegated than its
companion, [labour-indicators-api](https://github.com/wastewalker/labour-indicators-api),
and this document says so plainly rather than dressing it up.

---

## The short version

| Area                        | Who drove                                                     |
| --------------------------- | ------------------------------------------------------------- |
| Goal, scope and constraints | Me                                                            |
| Domain rules                | Inherited from the API, which I designed; the UI mirrors them |
| Architecture and UI design  | Proposed by the AI, accepted by me                            |
| Implementation and tests    | AI-written                                                    |
| Verification                | Done by running things: compiler, linter, tests, the real API |
| Dependency versions         | Resolved by the package manager, never recalled from memory   |

---

## What I decided

- **What to build and why.** A job I was applying for asked for React, Next.js,
  dynamic forms, and component and end-to-end testing. My public work showed the
  backend side but not those. The brief was a front end for my own API that
  would make them verifiable, not a generic demo.
- **Scope.** A headless CMS (Strapi) and Storybook were considered and left for
  a later phase, so that one small thing got finished properly instead of two
  things half-done.
- **The domain.** The rules the UI has to respect (variation in percentage
  points for percentage series, periods that are not dates, published figures
  that never return to draft) are the API's. The dashboard's job was to render
  them faithfully, not to reinvent them.

## What the AI proposed and I accepted

- Server Components for reads and Server Actions for writes, so the browser
  never talks to the API and the API needs no CORS.
- Forms generated from the series they edit: the period field follows the
  frequency, the value field follows the unit.
- A client-side copy of the API's validation, explicitly as a courtesy, with
  the API's answer winning when they disagree.
- Direction shown with an arrow, not green and red, because whether a rise is
  good news depends on the indicator.
- A hand-rolled SVG chart instead of a charting library, with its geometry in a
  pure, separately tested module.
- An in-memory mock of the API for end-to-end tests, so CI needs no database.

## How the work was sequenced

```
read the API's routes, schemas and errors   (the contract, before any UI)
  -> wire types and typed client
    -> domain mirror and formatting
      -> components -> pages and server actions
        -> unit and component tests -> end-to-end tests -> CI
```

Reading the API's source first meant the wire types were copied from its
serialisers instead of guessed.

---

## What went wrong, and how it was caught

### An end-to-end selector matched an element nobody wrote

A test asserted on `getByRole('alert')` and failed in strict mode: Next.js
injects its own `role="alert"` route announcer. The fix was scoping the query to
the form under test. Assertions against the whole page are fragile in a
framework that adds its own accessibility nodes.

### The mock API drifted from the real one

The mock's error messages were written from the API's behaviour as described,
not as implemented. Running the dashboard against the real API on PostgreSQL
showed the duplicate-period message differed (the real one names the indicator
code). The mock was corrected to match. This is why the mock is documented as a
stand-in, and why the core flow was also run against the real service.

### React 19 resets forms after an action

React 19 clears uncontrolled form fields once a form action completes,
including when the server rejected the input. Left alone, a refused
observation would wipe what the user typed. Every action now echoes the
submitted values back on error, and the fields re-populate from them.

### Setup instructions that only worked on Linux

The first README told readers to run `INDICATORS_API_URL=... npm run dev`,
which fails in Windows `cmd` and PowerShell. It now uses `.env.local`, which
Next.js reads on every platform.

### The first commit bundled everything

The project was first committed as a single "initial commit". The history was
rebuilt into small conventional commits before publication, because commit
history is a review artifact.

---

## How it was verified

Nothing here was accepted because it looked right:

- `tsc` under `strict` and `noUncheckedIndexedAccess`, type-aware ESLint and
  Prettier, all clean.
- 84 unit and component tests, with coverage thresholds enforced (90% lines,
  85% branches on `src/lib` and `src/components`).
- 6 Playwright tests against the production build, not the dev server.
- The create → observe → publish and not-found flows run against the real API
  backed by PostgreSQL, not only the mock.
- Screens checked visually at desktop width before publishing.

---

## What I take from it

The delegation was larger here than on the API, and that was a deliberate
trade: the interesting decisions in this system live in the backend, which I
designed by hand. A front end that renders those decisions faithfully is
exactly the kind of work where a well-specified brief, a strict toolchain and
tests against the real service let an AI do most of the typing safely. Where it
was wrong, the compiler, the tests or the real API said so.
