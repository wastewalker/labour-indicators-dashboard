// An in-memory stand-in for labour-indicators-api, used by the end-to-end
// suite and for trying the dashboard without Docker.
//
// It implements the same routes, status codes and error bodies as the real
// service for everything the UI touches. It is not a second implementation to
// keep in step forever: the contract it mirrors is small and pinned by the
// e2e tests, which would fail if the UI came to depend on anything else.
//
//   node e2e/mock-api/server.mjs            # port 4010
//   MOCK_API_PORT=5000 node e2e/mock-api/server.mjs
//
// POST /__reset restores the seed data so each test starts from a known state.

import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.MOCK_API_PORT ?? 4010);

const UNITS = ['percentage', 'index', 'count', 'rate_per_thousand'];
const FREQUENCIES = ['annual', 'quarterly', 'monthly'];
const STATUSES = ['draft', 'published', 'archived'];
const TRANSITIONS = { draft: ['published', 'archived'], published: ['archived'], archived: [] };
const PERIOD_RE = {
  annual: /^\d{4}$/,
  quarterly: /^\d{4}-Q[1-4]$/,
  monthly: /^\d{4}-M(0[1-9]|1[0-2])$/,
};
const CODE_RE = /^[A-Z][A-Z0-9_]{2,31}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** @type {Map<string, any>} */
let indicators = new Map();

function seed() {
  indicators = new Map();
  const add = (fields, observations) => {
    const now = '2026-09-15T12:00:00.000Z';
    const id = fields.id ?? randomUUID();
    indicators.set(id, {
      id,
      createdAt: now,
      updatedAt: now,
      ...fields,
      observations: new Map(observations),
    });
  };
  add(
    {
      id: '11111111-1111-4111-8111-111111111111',
      code: 'UNEMP_RATE',
      name: 'Unemployment rate',
      unit: 'percentage',
      frequency: 'quarterly',
      status: 'published',
    },
    [
      ['2023-Q1', 6.0],
      ['2023-Q2', 5.8],
      ['2023-Q3', 5.6],
      ['2023-Q4', 5.9],
      ['2024-Q1', 7.5],
      ['2024-Q2', 6.9],
    ],
  );
  add(
    {
      id: '22222222-2222-4222-8222-222222222222',
      code: 'FORMAL_JOBS',
      name: 'Formal employment',
      unit: 'count',
      frequency: 'annual',
      status: 'draft',
    },
    [
      ['2022', 1180000],
      ['2023', 1225000],
    ],
  );
  add(
    {
      id: '33333333-3333-4333-8333-333333333333',
      code: 'WAGE_IDX',
      name: 'Real wage index',
      unit: 'index',
      frequency: 'monthly',
      status: 'archived',
    },
    [['2024-M01', 100]],
  );
}
seed();

const serialise = ({ observations: _o, ...rest }) => rest;

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body === undefined ? '' : JSON.stringify(body));
}
const fail = (res, status, code, message, details) =>
  send(res, status, { error: { code, message, ...(details ? { details } : {}) } });

function readJson(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve(null);
      }
    });
  });
}

function valueError(unit, value) {
  const rules = {
    percentage: [value >= 0 && value <= 100, 'a percentage must be between 0 and 100'],
    index: [value > 0, 'an index must be strictly greater than 0'],
    count: [Number.isInteger(value) && value >= 0, 'a count must be a non-negative whole number'],
    rate_per_thousand: [
      value >= 0 && value <= 1000,
      'a rate per thousand must be between 0 and 1000',
    ],
  };
  const [ok, description] = rules[unit];
  return ok ? null : `Invalid value ${value} for unit '${unit}': ${description}`;
}

function series(indicator) {
  const kind = indicator.unit === 'percentage' ? 'percentage_points' : 'percent_change';
  const round = (v) => Math.round(v * 1e4) / 1e4;
  const ordinal = (p) => p.replace(/-[QM]/, '.').padEnd(7, '0');
  const ordered = [...indicator.observations.entries()].sort((a, b) =>
    ordinal(a[0]) < ordinal(b[0]) ? -1 : 1,
  );
  const prior = (period) => {
    const year = Number(period.slice(0, 4)) - 1;
    return `${year}${period.slice(4)}`;
  };
  return {
    indicator: serialise(indicator),
    variationKind: kind,
    points: ordered.map(([period, value]) => {
      const before = indicator.observations.get(prior(period));
      if (before === undefined) {
        return { period, value, yearOverYear: null, variationGap: 'no_prior_year_observation' };
      }
      if (kind === 'percent_change' && before === 0) {
        return { period, value, yearOverYear: null, variationGap: 'prior_value_is_zero' };
      }
      const change =
        kind === 'percentage_points' ? value - before : ((value - before) / before) * 100;
      return { period, value, yearOverYear: { kind, value: round(change) }, variationGap: null };
    }),
  };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const parts = url.pathname.split('/').filter(Boolean);

  if (req.method === 'POST' && url.pathname === '/__reset') {
    seed();
    return send(res, 204);
  }
  if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/ready')) {
    return send(res, 200, { status: 'ok' });
  }
  if (parts[0] !== 'api' || parts[1] !== 'indicators') {
    return fail(res, 404, 'ROUTE_NOT_FOUND', `No route for ${req.method} ${url.pathname}`);
  }

  const id = parts[2];
  const sub = parts[3];

  if (!id) {
    if (req.method === 'GET') {
      const status = url.searchParams.get('status');
      const limit = Number(url.searchParams.get('limit') ?? 20);
      const offset = Number(url.searchParams.get('offset') ?? 0);
      const all = [...indicators.values()].filter((i) => !status || i.status === status);
      return send(res, 200, {
        items: all.slice(offset, offset + limit).map(serialise),
        total: all.length,
        limit,
        offset,
      });
    }
    if (req.method === 'POST') {
      const body = await readJson(req);
      const issues = [];
      if (!body || typeof body.code !== 'string' || body.code === '')
        issues.push({ path: 'code', message: 'Required' });
      if (!body || typeof body.name !== 'string' || body.name === '')
        issues.push({ path: 'name', message: 'Required' });
      if (!body || !UNITS.includes(body.unit))
        issues.push({ path: 'unit', message: 'Invalid option' });
      if (!body || !FREQUENCIES.includes(body.frequency))
        issues.push({ path: 'frequency', message: 'Invalid option' });
      if (issues.length)
        return fail(
          res,
          400,
          'VALIDATION_ERROR',
          'Request body or query parameters are invalid',
          issues,
        );
      if (!CODE_RE.test(body.code)) {
        return fail(
          res,
          400,
          'VALIDATION_ERROR',
          `Indicator code '${body.code}' is not valid. Use 3-32 characters: uppercase letters, digits and underscores, starting with a letter`,
        );
      }
      if ([...indicators.values()].some((i) => i.code === body.code)) {
        return fail(res, 409, 'CONFLICT', `An indicator with code '${body.code}' already exists`);
      }
      const now = new Date().toISOString();
      const indicator = {
        id: randomUUID(),
        code: body.code,
        name: body.name,
        unit: body.unit,
        frequency: body.frequency,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
        observations: new Map(),
      };
      indicators.set(indicator.id, indicator);
      return send(res, 201, serialise(indicator));
    }
  }

  if (!UUID_RE.test(id)) {
    return fail(res, 400, 'VALIDATION_ERROR', 'Request body or query parameters are invalid', [
      { path: 'id', message: 'Indicator id must be a UUID' },
    ]);
  }
  const indicator = indicators.get(id);
  if (!indicator) return fail(res, 404, 'NOT_FOUND', `Indicator '${id}' was not found`);

  if (!sub && req.method === 'GET') return send(res, 200, serialise(indicator));
  if (sub === 'series' && req.method === 'GET') return send(res, 200, series(indicator));

  if (sub === 'observations' && req.method === 'POST') {
    const body = await readJson(req);
    if (
      !body ||
      typeof body.period !== 'string' ||
      typeof body.value !== 'number' ||
      !Number.isFinite(body.value)
    ) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Request body or query parameters are invalid');
    }
    if (indicator.status !== 'draft') {
      return fail(
        res,
        409,
        'ILLEGAL_TRANSITION',
        `Cannot move indicator from '${indicator.status}' to '${indicator.status}': observations can only be added while the indicator is a draft`,
      );
    }
    const period = body.period.trim().toUpperCase();
    if (!PERIOD_RE[indicator.frequency].test(period)) {
      return fail(
        res,
        400,
        'VALIDATION_ERROR',
        `Period '${period}' does not match indicator '${indicator.code}', which is ${indicator.frequency}`,
      );
    }
    const invalid = valueError(indicator.unit, body.value);
    if (invalid) return fail(res, 400, 'VALIDATION_ERROR', invalid);
    if (indicator.observations.has(period)) {
      return fail(
        res,
        409,
        'CONFLICT',
        `Indicator '${indicator.code}' already has an observation for period '${period}'`,
      );
    }
    indicator.observations.set(period, body.value);
    indicator.updatedAt = new Date().toISOString();
    return send(res, 204);
  }

  if (sub === 'status' && req.method === 'PATCH') {
    const body = await readJson(req);
    if (!body || !STATUSES.includes(body.status)) {
      return fail(res, 400, 'VALIDATION_ERROR', 'Request body or query parameters are invalid');
    }
    const from = indicator.status;
    const to = body.status;
    if (!TRANSITIONS[from].includes(to)) {
      return fail(
        res,
        409,
        'ILLEGAL_TRANSITION',
        `Cannot move indicator from '${from}' to '${to}'`,
      );
    }
    if (to === 'published' && indicator.observations.size < 2) {
      return fail(
        res,
        409,
        'ILLEGAL_TRANSITION',
        `Cannot move indicator from '${from}' to '${to}': a series needs at least 2 observations to be published, it has ${indicator.observations.size}`,
      );
    }
    indicator.status = to;
    indicator.updatedAt = new Date().toISOString();
    return send(res, 200, serialise(indicator));
  }

  return fail(res, 404, 'ROUTE_NOT_FOUND', `No route for ${req.method} ${url.pathname}`);
});

server.listen(PORT, () => {
  console.log(`Mock indicators API listening on http://localhost:${PORT}`);
});
