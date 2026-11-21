import { defineConfig, devices } from "@playwright/test";

/* The gallery is dev-only — M5's gate is that `gallery.html` never reaches
   `dist/` — so the viewport sweep has to run against `npm run dev` rather than
   a built bundle. */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? "list" : "line",
  use: {
    baseURL: "http://localhost:5173",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Every iPhone browser is WebKit, so every spec runs in it too.
    { name: "webkit", use: { ...devices["iPhone 15"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173/gallery.html",
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
  },
});
