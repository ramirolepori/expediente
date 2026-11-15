import { defineConfig, devices } from "@playwright/test";

const PUERTO = 3100;

/**
 * Tests de punta a punta: levantan la app con salas en memoria y un modelo falso,
 * así no gastan cuota de Gemini ni tocan Supabase.
 */
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: process.env.CI ? `npx next build && npx next start -p ${PUERTO}` : `npx next dev -p ${PUERTO}`,
    url: `http://localhost:${PUERTO}/api/casos`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      LLM_FALSO: "1",
      NEXT_DIST_DIR: ".next-e2e",
      // vacías a propósito: fuerzan salas en memoria y tiempo real por SSE
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      SUPABASE_SECRET_KEY: "",
    },
  },
});
