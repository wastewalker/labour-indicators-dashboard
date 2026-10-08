import { defineConfig, devices } from '@playwright/test';

const API_PORT = 4010;
const APP_PORT = 3001;
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

/**
 * End-to-end tests run the real Next.js production build against the in-memory
 * mock API (e2e/mock-api/server.mjs), so they need no database and no Docker.
 * The suite resets the mock before each test and runs serially, because the
 * tests share that one backend.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: 'retain-on-failure',
    ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}),
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node e2e/mock-api/server.mjs',
      url: `http://localhost:${API_PORT}/health`,
      env: { MOCK_API_PORT: String(API_PORT) },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run build && npm run start',
      url: `http://localhost:${APP_PORT}`,
      env: { INDICATORS_API_URL: `http://localhost:${API_PORT}` },
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
