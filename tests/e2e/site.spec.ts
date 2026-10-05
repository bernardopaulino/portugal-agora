import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Com Cache Components, o Next mantém a página anterior escondida (React <Activity>)
// para o "voltar" ser instantâneo; por isso procuramos o título visível pelo papel.
const pageTitle = (page: Page) => page.getByRole("heading", { level: 1 });

// O seletor existe duas vezes no HTML (cabeçalho em computador, linha própria em
// telemóvel); getByRole só encontra o que está visível.
const picker = (page: Page, name = "Escolher distrito ou região") =>
  page.getByRole("combobox", { name });

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    // O canvas do mapa é complementar; a mesma informação está nas listas.
    .exclude(".maplibregl-canvas")
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
}

test("página inicial mostra o boletim do país", async ({ page }) => {
  await page.goto("/");
  await expect(pageTitle(page)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Todos os distritos" })).toBeVisible();
  await expect(page.getByRole("link", { name: "112" })).toHaveAttribute("href", "tel:112");
  await expectAccessible(page);
});

test("cada tema tem a sua página", async ({ page }) => {
  for (const [path, title] of [
    ["/avisos", "Avisos meteorológicos"],
    ["/incendios", "Incêndios"],
    ["/sismos", "Sismos"],
    ["/risco", "Risco de incêndio e qualidade do ar"],
  ]) {
    await page.goto(path);
    await expect(pageTitle(page)).toHaveText(title);
  }
  await expectAccessible(page);
});

test("o seletor leva à página do distrito", async ({ page }) => {
  await page.goto("/");
  await picker(page).selectOption("porto");
  await expect(page).toHaveURL(/\/porto$/);
  await expect(pageTitle(page)).toContainText("Porto");
  await expect(page.getByRole("heading", { name: "Previsão para Porto" })).toBeVisible();
  await expectAccessible(page);
});

test("o distrito tem uma página por tema e o seletor mantém o tema", async ({ page }) => {
  await page.goto("/lisboa/avisos");
  await expect(pageTitle(page)).toHaveText("Avisos em Lisboa");
  // O menu do cabeçalho passa a ser o do distrito.
  const menu = page.getByRole("navigation", { name: "Temas: Lisboa" });
  await expect(menu.getByRole("link", { name: "Avisos" })).toHaveAttribute("aria-current", "page");
  await expectAccessible(page);

  await picker(page).selectOption("porto");
  await expect(page).toHaveURL(/\/porto\/avisos$/);
  await expect(pageTitle(page)).toHaveText("Avisos no Porto");
});

test("regiões autónomas têm página própria", async ({ page }) => {
  await page.goto("/acores");
  await expect(pageTitle(page)).toContainText("Açores");
  // Sem risco de incêndio do IPMA nas ilhas: a página do risco mostra só ar e UV.
  await page.goto("/acores/risco");
  await expect(pageTitle(page)).toHaveText("Ar e raios UV nos Açores");
});

test("os cinco separadores cabem num telemóvel de 360 px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  for (const path of ["/lisboa/risco", "/en/lisboa/risco"]) {
    await page.goto(path);
    const tabs = page.getByRole("navigation").first().getByRole("link");
    await expect(tabs).toHaveCount(5);
    for (const tab of await tabs.all()) {
      const box = (await tab.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(360);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  }
});

test("'Perto de mim' mostra texto e o distrito cabe ao lado a 360 px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  for (const [path, name] of [
    ["/", "Perto de mim"],
    ["/en", "Near me"],
  ] as const) {
    await page.goto(path);
    const button = page.getByRole("button", { name, exact: true });
    await expect(button).toBeVisible();
    await expect(button).toContainText(name === "Perto de mim" ? "Perto" : name);
    const box = (await button.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(360);
    expect(box.height).toBeGreaterThanOrEqual(44);
    // O seletor ao lado tem espaço para o nome mais comprido.
    const select = picker(page, path === "/" ? undefined : "Choose a district or region");
    await select.selectOption("viana-do-castelo");
    await expect(page).toHaveURL(/viana-do-castelo$/);
    const fits = await picker(
      page,
      path === "/" ? undefined : "Choose a district or region",
    ).evaluate((el) => el.scrollWidth <= el.clientWidth);
    expect(fits).toBe(true);
  }
});

test("nas páginas de tema, o mapa vem antes da lista e pode ser saltado", async ({ page }) => {
  await page.goto("/lisboa/incendios");
  const map = page.locator("#mapa");
  const list = page.locator("#lista");
  const mapTop = (await map.boundingBox())!.y;
  const listTop = (await list.boundingBox())!.y;
  expect(mapTop).toBeLessThan(listTop);
  // O link de saltar o mapa leva o foco para a lista.
  const skip = page.getByRole("link", { name: "Saltar o mapa" });
  await skip.focus();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(list).toBeFocused();
});

test("o mapa mostra só o tema da página", async ({ page }) => {
  // Num tema de distrito: sem botões de camadas, com ligação para o país.
  await page.goto("/lisboa/incendios");
  await expect(page.getByRole("radio", { name: "Risco de incêndio", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Ver os incêndios em todo o país" }).click();
  await expect(page).toHaveURL(/\/incendios$/);

  // Na página do risco, escolhe-se entre risco de incêndio e qualidade do ar.
  await page.goto("/risco");
  const air = page.getByRole("radio", { name: "Qualidade do ar", exact: true });
  await expect(air).toHaveAttribute("aria-checked", "false");
  await air.click();
  await expect(air).toHaveAttribute("aria-checked", "true");
});

test("versão em inglês", async ({ page }) => {
  await page.goto("/en/porto/avisos");
  await expect(page.locator("html")).toHaveAttribute("lang", "en-GB");
  await expect(pageTitle(page)).toHaveText("Warnings in Porto");
  await expectAccessible(page);
  // PT|EN leva à mesma página no outro idioma.
  await page.getByRole("link", { name: "Português" }).click();
  await expect(page).toHaveURL(/\/porto\/avisos$/);
  await expect(pageTitle(page)).toHaveText("Avisos no Porto");
});

test("página de fontes explica os níveis", async ({ page }) => {
  await page.goto("/fontes");
  await expect(page.locator("#niveis")).toBeVisible();
  await expectAccessible(page);
});

test("endereço inexistente devolve 404", async ({ page }) => {
  for (const path of ["/distrito-que-nao-existe", "/distrito-que-nao-existe/avisos"]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Esta página não existe." })).toBeVisible();
  }
});

test("API de estado responde com o formato esperado", async ({ request }) => {
  const response = await request.get("/api/state");
  expect(response.ok()).toBe(true);
  const state = await response.json();
  expect(state).toMatchObject({ headline: expect.any(String), districts: expect.any(Object) });
  expect(Object.keys(state.districts)).toHaveLength(20);
});

test("API de fontes só aceita fontes conhecidas", async ({ request }) => {
  expect((await request.get("/api/sources/ipma-warnings")).ok()).toBe(true);
  for (const id of ["nope", "constructor", "__proto__"]) {
    expect((await request.get(`/api/sources/${id}`)).status()).toBe(404);
  }
});

test("HSTS com subdomínios e preload", async ({ request }) => {
  const response = await request.get("/");
  expect(response.headers()["strict-transport-security"]).toBe(
    "max-age=63072000; includeSubDomains; preload",
  );
});
