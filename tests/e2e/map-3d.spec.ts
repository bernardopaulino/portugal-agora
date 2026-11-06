import { expect, test, type Page } from "@playwright/test";

import { expectAccessible } from "./helpers";

/*
 * A vista 3D opcional dos mapas de tema: sismos (three), incêndios
 * (relevo no MapLibre) e risco de incêndio (extrusão no MapLibre).
 */

// O service worker do PWA responderia a /api/state antes do page.route dos sismos de teste.
test.use({ serviceWorkers: "block" });

const RELIEF = /^https:\/\/tiles\.mapterhorn\.com\//;

/**
 * Junta dois sismos conhecidos ao estado que o browser pede (/api/state):
 * um sentido a 24 km de profundidade junto a Cascais e outro sem
 * profundidade indicada junto a Loulé. Assim o teste não depende de
 * haver sismos reais esta semana.
 */
async function withTestQuakes(page: Page) {
  await page.route("**/api/state", async (route) => {
    const response = await route.fetch();
    const state = await response.json();
    const occurredAt = new Date(Date.parse(state.generatedAt) - 3_600_000).toISOString();
    const quake = (props: Record<string, unknown>) => ({
      kind: "earthquake",
      title: "Sismo de teste",
      felt: false,
      occurredAt,
      ...props,
    });
    const quakes = [
      quake({
        id: "sismo-teste-cascais",
        severity: "yellow",
        magnitude: 3.8,
        depthKm: 24,
        felt: true,
        coordinates: [-9.6, 38.65],
        place: { district: "lisboa", region: "continente", label: "a oeste de Cascais" },
      }),
      quake({
        id: "sismo-teste-loule",
        severity: "none",
        magnitude: 2.1,
        depthKm: null,
        coordinates: [-8.02, 37.2],
        place: { district: "faro", region: "continente", label: "a norte de Loulé" },
      }),
    ];
    state.earthquakes = {
      ...state.earthquakes,
      data: [...quakes, ...(state.earthquakes.data ?? [])],
    };
    await route.fulfill({ response, json: state });
  });
}

/** Erros na consola e erros de página durante o teste. */
function consoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

const view = (page: Page) => page.getByRole("radiogroup", { name: "Vista do mapa" });
const choose = (page: Page, name: "Mapa" | "3D") =>
  view(page).getByRole("radio", { name, exact: true }).click();
const depthScene = (page: Page) => page.getByRole("img", { name: /Vista 3D dos sismos/ });
const liveMap = (page: Page) => page.getByRole("region", { name: /Mapa interativo/ });
const legend = (page: Page) => page.getByTestId("map-legend");

test("o chip 3D só aparece nos sismos, incêndios e risco de incêndio", async ({ page }) => {
  for (const path of ["/lisboa/sismos", "/sismos", "/incendios", "/risco"]) {
    await page.goto(path);
    await expect(view(page).getByRole("radio", { name: "3D", exact: true })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    await expect(view(page).getByRole("radio", { name: "Mapa" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  }
  // Na qualidade do ar, só 2D.
  await page.getByRole("radio", { name: "Qualidade do ar", exact: true }).click();
  await expect(view(page)).toHaveCount(0);

  for (const path of ["/avisos", "/lisboa/avisos"]) {
    await page.goto(path);
    await expect(page.locator("#mapa")).toBeVisible();
    await expect(view(page)).toHaveCount(0);
  }
});

test("sismos em profundidade: escolher, ver no mapa e voltar ao 2D", async ({ page }) => {
  const errors = consoleErrors(page);
  await withTestQuakes(page);
  await page.goto("/sismos");
  const row = page.locator("li", { hasText: "A oeste de Cascais" });
  await expect(row).toBeVisible();
  await expect(page.locator("li", { hasText: "A norte de Loulé" })).toContainText(
    "profundidade não indicada",
  );

  await choose(page, "3D");
  const scene = depthScene(page);
  await expect(scene).toBeVisible();
  await expect(scene.locator("canvas")).toBeVisible();
  await expect(scene).toHaveAttribute("aria-label", /\d+ sismos?; o mais profundo a \d+ km\./);
  await expect(legend(page)).toContainText("Profundidade exagerada 3×.");
  await expect(legend(page)).toContainText("ficam à superfície, com contorno tracejado");
  await expect(page.getByText("Nível do mar", { exact: true })).toBeAttached();
  await expect(liveMap(page)).toHaveCount(0);

  // "Ver no mapa" seleciona o sismo na vista 3D: a câmara vai até ele e abre o painel.
  await row.getByRole("button", { name: "Ver no mapa" }).click();
  await expect(row.getByRole("button", { name: "Ver no mapa" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const panel = page.locator("#mapa").getByText("a 24 km de profundidade");
  await expect(panel).toBeVisible();
  await expect(scene).toHaveAttribute("data-camera-duration", "600");

  // O teclado roda e aproxima, sem sair da página.
  await scene.focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("+");
  await page.getByRole("button", { name: "Repor vista" }).click();

  // Voltar ao "Mapa" repõe o 2D, com a mesma seleção.
  await choose(page, "Mapa");
  await expect(depthScene(page)).toHaveCount(0);
  await expect(liveMap(page)).toBeVisible();
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(panel).toBeVisible();
  await expect(legend(page)).not.toContainText("exagerada");

  expect(errors).toEqual([]);
});

test("sismos em 3D numa página de distrito", async ({ page }) => {
  const errors = consoleErrors(page);
  await withTestQuakes(page);
  await page.goto("/lisboa/sismos");
  await choose(page, "3D");
  await expect(depthScene(page)).toHaveAttribute("aria-label", /Continente: \d+ sismos?/);
  await expect(page.getByRole("link", { name: "Saltar o mapa" })).toBeAttached();
  expect(errors).toEqual([]);
});

test("incêndios com relevo: terreno pedido só na vista 3D", async ({ page }) => {
  const errors = consoleErrors(page);
  const relief: string[] = [];
  page.on("request", (r) => {
    if (RELIEF.test(r.url())) relief.push(r.url());
  });
  await page.goto("/incendios");
  await expect(liveMap(page)).toBeVisible();
  await page.waitForTimeout(1000);
  expect(relief).toEqual([]);

  const tile = page.waitForResponse((r) => RELIEF.test(r.url()) && r.ok());
  await choose(page, "3D");
  await tile;
  await expect(legend(page)).toContainText("Relevo exagerado 2×.");
  await expect(liveMap(page)).toHaveAttribute("data-camera-duration", "600");
  // Rotação só nesta vista: o compasso aparece.
  await expect(page.getByRole("button", { name: "Repor orientação" })).toBeVisible();

  await choose(page, "Mapa");
  await expect(page.getByRole("button", { name: "Repor orientação" })).toHaveCount(0);
  await expect(legend(page)).not.toContainText("Relevo exagerado");
  // Nenhum tile de mar pedido (a Mapterhorn responderia 404 e haveria erros aqui).
  expect(errors).toEqual([]);
});

test("risco de incêndio em altura", async ({ page }) => {
  const errors = consoleErrors(page);
  await page.goto("/risco");
  await choose(page, "3D");
  await expect(legend(page)).toContainText("A altura de cada concelho repete a classe de risco");
  await expect(liveMap(page)).toHaveAttribute("data-camera-duration", "600");
  // Hoje e amanhã continuam a funcionar.
  await page.getByRole("radio", { name: "Amanhã" }).click();
  await expect(legend(page)).toContainText("repete a classe de risco");
  // A qualidade do ar fica só em 2D: o chip desaparece e o mapa volta a ficar plano.
  await page.getByRole("radio", { name: "Qualidade do ar", exact: true }).click();
  await expect(view(page)).toHaveCount(0);
  await expect(legend(page)).not.toContainText("repete a classe");
  expect(errors).toEqual([]);
});

test.describe("com 'reduzir movimento'", () => {
  test.use({ reducedMotion: "reduce" });

  test("a câmara salta, sem transições", async ({ page }) => {
    await withTestQuakes(page);
    await page.goto("/sismos");
    await choose(page, "3D");
    await page
      .locator("li", { hasText: "A oeste de Cascais" })
      .getByRole("button", { name: "Ver no mapa" })
      .click();
    await expect(depthScene(page)).toHaveAttribute("data-camera-duration", "0");

    await page.goto("/risco");
    await choose(page, "3D");
    await expect(liveMap(page)).toHaveAttribute("data-camera-duration", "0");
  });
});

test("o three só é pedido quando se escolhe a vista 3D dos sismos", async ({
  page,
  browser,
  baseURL,
}) => {
  const scripts = new Set<string>();
  page.on("request", (r) => {
    if (r.resourceType() === "script") scripts.add(r.url());
  });
  await page.goto("/sismos");
  await expect(liveMap(page)).toBeVisible();
  await page.waitForTimeout(1500);
  const before = new Set(scripts);
  await choose(page, "3D");
  await expect(depthScene(page).locator("canvas")).toBeVisible();
  const threeChunks = [...scripts].filter((url) => !before.has(url));
  expect(threeChunks.length).toBeGreaterThan(0);

  // Num contexto novo (sem cache), a página inicial e os avisos não pedem esses ficheiros.
  const context = await browser.newContext({ baseURL, serviceWorkers: "block" });
  const other = await context.newPage();
  const requested: string[] = [];
  other.on("request", (r) => {
    if (r.resourceType() === "script") requested.push(r.url());
  });
  await other.goto("/");
  await expect(other.getByRole("heading", { name: "Todos os distritos" })).toBeVisible();
  await other.waitForTimeout(1500);
  await other.goto("/avisos");
  await expect(liveMap(other)).toBeVisible();
  await other.waitForTimeout(1500);
  expect(requested.length).toBeGreaterThan(0);
  expect(requested.filter((url) => threeChunks.includes(url))).toEqual([]);
  await context.close();
});

test("a CSP inclui a origem do relevo", async ({ request }) => {
  const csp = (await request.get("/incendios")).headers()["content-security-policy"]!;
  for (const directive of ["img-src", "connect-src"]) {
    const value = csp.split(";").find((d) => d.trim().startsWith(directive));
    expect(value, directive).toContain("https://tiles.mapterhorn.com");
  }
  expect(csp).not.toContain("wasm-unsafe-eval");
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`acessibilidade nas duas vistas, tema ${colorScheme === "light" ? "claro" : "escuro"}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await withTestQuakes(page);
    for (const path of ["/sismos", "/incendios", "/risco"]) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("data-theme", colorScheme);
      await expect(liveMap(page)).toBeVisible();
      await expectAccessible(page);
      await choose(page, "3D");
      await expect(legend(page)).toContainText(/exagerad|repete a classe/);
      if (path === "/sismos") await expect(depthScene(page).locator("canvas")).toBeVisible();
      await expectAccessible(page);
    }
  });
}
