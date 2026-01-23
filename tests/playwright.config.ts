import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";

// Load env vars for tests (supports .env.local then .env)
dotenv.config({ path: ".env.local" });
dotenv.config();

const isMock = process.env.MOCK_API === "1";

export default defineConfig({
  // testDir is resolved relative to this config file (tests/)
  testDir: "./e2e",
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  outputDir: "test-results/artifacts",
  use: {
    baseURL: "http://localhost:5000",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: isMock ? "PORT=5000 MOCK_API=1 npm run dev" : "PORT=5000 npm run dev",
    url: "http://localhost:5000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
