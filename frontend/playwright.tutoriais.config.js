import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tutoriais',
  testMatch: '**/*.roteiro.js',
  outputDir: './test-results-e2e/tutoriais',
  timeout: 300_000,
  workers: 1,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 15_000,
    deviceScaleFactor: 2,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    launchOptions: { env: { ...process.env, LANGUAGE: 'pt_BR' } },
    channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
