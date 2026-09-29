import { defineConfig, devices } from "@playwright/test";

/**
 * Testes end-to-end sobre o build de produção (npm run build antes).
 * Verificam que as páginas principais abrem, funcionam em telemóvel
 * e passam a auditoria de acessibilidade WCAG 2.2 AA (axe).
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3100",
    locale: "pt-PT",
    timezoneId: "Europe/Lisbon",
  },
  projects: [
    { name: "computador", use: { ...devices["Desktop Chrome"] } },
    { name: "telemóvel", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run start -- -p 3100",
    url: "http://localhost:3100/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
