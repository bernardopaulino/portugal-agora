import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Com Cache Components, o Next mantém a página anterior escondida (React <Activity>)
// para o "voltar" ser instantâneo; por isso procuramos o título visível pelo papel.
const pageTitle = (page: Page) => page.getByRole("heading", { level: 1 });

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    // O canvas do mapa é complementar; a mesma informação está nas listas.
    .exclude(".maplibregl-canvas")
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
}

test("página inicial mostra o estado do país", async ({ page }) => {
  await page.goto("/");
  await expect(pageTitle(page)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Avisos meteorológicos" })).toBeVisible();
  await expect(page.getByRole("link", { name: "112" })).toHaveAttribute("href", "tel:112");
  await expectAccessible(page);
});

test("o seletor leva à página do distrito", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Escolher distrito ou região").selectOption("porto");
  await expect(page).toHaveURL(/\/porto$/);
  await expect(pageTitle(page)).toContainText("Porto");
  await expect(page.getByRole("heading", { name: "Previsão para Porto" })).toBeVisible();
  await expectAccessible(page);
});

test("regiões autónomas têm página própria", async ({ page }) => {
  await page.goto("/acores");
  await expect(pageTitle(page)).toContainText("Açores");
});

test("camadas do mapa podem ser ligadas e desligadas", async ({ page }) => {
  await page.goto("/");
  const risk = page.getByRole("button", { name: "Risco de incêndio", exact: true });
  await expect(risk).toHaveAttribute("aria-pressed", "false");
  await risk.click();
  await expect(risk).toHaveAttribute("aria-pressed", "true");
});

test("página de fontes explica os níveis", async ({ page }) => {
  await page.goto("/fontes");
  await expect(page.locator("#niveis")).toBeVisible();
  await expectAccessible(page);
});

test("endereço inexistente devolve 404", async ({ page }) => {
  const response = await page.goto("/distrito-que-nao-existe");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Esta página não existe." })).toBeVisible();
});

test("API de estado responde com o formato esperado", async ({ request }) => {
  const response = await request.get("/api/state");
  expect(response.ok()).toBe(true);
  const state = await response.json();
  expect(state).toMatchObject({ headline: expect.any(String), districts: expect.any(Object) });
  expect(Object.keys(state.districts)).toHaveLength(20);
});
