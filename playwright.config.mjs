import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test/browser',
  // Keep browser tests separate from Vitest's *.test.ts / *.spec.ts files.
  testMatch: '**/*.pw.ts',
  fullyParallel: true,
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: ['light', 'dark'].flatMap(colorScheme => [360, 1100].map(width => ({
    name: `${colorScheme}-${width}`,
    use: { colorScheme, viewport: { width, height: 900 } },
  }))),
  webServer: {
    command: 'npm start -- --host 127.0.0.1 --port 4173 --no-hmr',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
