import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // test-results/ ficou owned pelo root (execução antiga via Docker); usar outra pasta
  outputDir: './test-results-e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    // Playwright não tem builds de Chromium para Ubuntu 26.04; usa o Chrome do sistema
    channel: 'chrome',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
