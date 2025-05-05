import { defineConfig, devices } from '@playwright/test';
import dotEnv from "dotenv";

dotEnv.config()

const environments = {
  dev: [
    {
      name: 'Google Chrome - Desktop',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1920, height: 1080 } },
    }
  ],
  ci: [
    {
      name: 'chrome:latest:MacOS Ventura@lambdatest',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        fullyParallel: true,
      }
    }
  ],
};

export default defineConfig({
  timeout: 4 * 60 * 1000, // 4 min
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 0 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: process.env.NODE_ENV === 'development' ? "https://new-car.qac24svc.dev/" : "https://www.cars24.com/",
    trace: 'on-first-retry',
    viewport: null
  },
  /* Configure projects for major browsers */ 
  projects: [
    ...process.env.CI ? environments.ci : environments.dev
  ],
  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/new-cars',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000
  },
}); 