import { expect, test, type Page } from "@playwright/test";

import { expectAccessible, settle } from "./helpers";

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

/** O three minificado ainda traz o nome nas mensagens de erro do WebGLRenderer. */
const isThree = (code: string) => code.includes("THREE.WebGLRenderer");

test("os mapas com vista 3D abrem nela; avisos e qualidade do ar ficam em 2D", async ({ page }) => {
  for (const path of ["/lisboa/sismos", "/sismos", "/incendios", "/risco"]) {
    await page.goto(path);
    await expect(view(page).getByRole("radio", { name: "3D", exact: true })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(view(page).getByRole("radio", { name: "Mapa" })).toHaveAttribute(
      "aria-checked",
      "false",
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

test("sismos em profundidade: entrada, ver no mapa e voltar ao 2D", async ({ page }) => {
  const errors = consoleErrors(page);
  await withTestQuakes(page);
  await page.goto("/sismos");
  const row = page.locator("li", { hasText: "A oeste de Cascais" });
  await expect(row).toBeVisible();
  await expect(page.locator("li", { hasText: "A norte de Loulé" })).toContainText(
    "profundidade não indicada",
  );

  const scene = depthScene(page);
  await expect(scene.locator("canvas")).toBeVisible();
  // A entrada: a câmara desce de cima durante 1,8 s.
  await expect(scene).toHaveAttribute("data-camera-duration", "1800");
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

  // "Mapa" volta ao 2D, com a mesma seleção.
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
  await expect(depthScene(page)).toHaveAttribute("aria-label", /Continente: \d+ sismos?/);
  await expect(page.getByRole("link", { name: "Saltar o mapa" })).toBeAttached();
  expect(errors).toEqual([]);
});

test("incêndios abrem com relevo; o botão Mapa volta ao plano", async ({ page }) => {
  const errors = consoleErrors(page);
  const tile = page.waitForResponse((r) => RELIEF.test(r.url()) && r.ok());
  await page.goto("/incendios");
  await tile;
  await expect(legend(page)).toContainText("Relevo exagerado 2×.");
  await expect(liveMap(page)).toHaveAttribute("data-camera-duration", "1800");
  // Rotação só nesta vista: o compasso aparece.
  await expect(page.getByRole("button", { name: "Repor orientação" })).toBeVisible();

  await choose(page, "Mapa");
  await expect(page.getByRole("button", { name: "Repor orientação" })).toHaveCount(0);
  await expect(legend(page)).not.toContainText("Relevo exagerado");
  await expect(liveMap(page)).toHaveAttribute("data-camera-duration", "600");
  // Nenhum tile de mar pedido (a Mapterhorn responderia 404 e haveria erros aqui).
  expect(errors).toEqual([]);
});

test("o relevo só é pedido onde há vista 3D dele", async ({ page }) => {
  const relief: string[] = [];
  page.on("request", (r) => {
    if (RELIEF.test(r.url())) relief.push(r.url());
  });
  for (const path of ["/", "/avisos", "/sismos", "/risco"]) {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(800);
  }
  expect(relief).toEqual([]);
});

test("risco de incêndio em altura", async ({ page }) => {
  const errors = consoleErrors(page);
  await page.goto("/risco");
  await expect(legend(page)).toContainText("A altura de cada concelho repete a classe de risco");
  await expect(liveMap(page)).toHaveAttribute("data-camera-duration", "1800");
  // Hoje e amanhã continuam a funcionar.
  await page.getByRole("radio", { name: "Amanhã" }).click();
  await expect(legend(page)).toContainText("repete a classe de risco");
  // A qualidade do ar fica só em 2D: o chip desaparece e o mapa volta a ficar plano.
  await page.getByRole("radio", { name: "Qualidade do ar", exact: true }).click();
  await expect(view(page)).toHaveCount(0);
  await expect(legend(page)).not.toContainText("repete a classe");
  expect(errors).toEqual([]);
});

test("boletim em relevo: o 3D toma o lugar do mapa plano e o teclado continua", async ({
  page,
}) => {
  const errors = consoleErrors(page);
  await page.goto("/");
  const stage = page.locator("[data-relief]").first();
  await expect(stage).toHaveAttribute("data-relief", "on");
  await expect(stage.locator("canvas")).toBeVisible();
  // Os links do SVG continuam a ser o caminho do teclado: apontar Lisboa muda a legenda.
  await stage.getByRole("link", { name: /^Lisboa:/ }).focus();
  await expect(page.locator(".lower-third")).toContainText("Lisboa");
  await settle(page);
  await expectAccessible(page);
  expect(errors).toEqual([]);
});

test.describe("com reduzir movimento", () => {
  test.use({ reducedMotion: "reduce" });

  test("tudo aparece no estado final, sem transições", async ({ page }) => {
    await withTestQuakes(page);
    await page.goto("/sismos");
    await expect(depthScene(page)).toHaveAttribute("data-camera-duration", "0");
    await page
      .locator("li", { hasText: "A oeste de Cascais" })
      .getByRole("button", { name: "Ver no mapa" })
      .click();
    await expect(depthScene(page)).toHaveAttribute("data-camera-duration", "0");

    await page.goto("/risco");
    await expect(liveMap(page)).toHaveAttribute("data-camera-duration", "0");

    // Página inicial: o relevo aparece sem entrada e nada fica a animar nem escondido.
    await page.goto("/");
    await expect(page.locator("[data-relief]").first()).toHaveAttribute("data-relief", "on");
    const running = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((a) => a.playState === "running" && Number(a.effect?.getTiming().duration) > 1)
          .length,
    );
    expect(running).toBe(0);
    await page.mouse.wheel(0, 2000);
    await expect(page.locator(".reveal-wait")).toHaveCount(0);
  });
});

test("o three não entra nas páginas sem 3D", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, serviceWorkers: "block" });
  const page = await context.newPage();
  let bodies: Promise<string>[] = [];
  page.on("response", (r) => {
    if (r.request().resourceType() === "script") bodies.push(r.text().catch(() => ""));
  });
  await page.goto("/avisos");
  await expect(liveMap(page)).toBeVisible();
  await page.waitForTimeout(1500);
  expect((await Promise.all(bodies)).some(isThree)).toBe(false);

  // Na página inicial chega depois do primeiro desenho, para o boletim em relevo.
  bodies = [];
  await page.goto("/");
  await expect(page.locator("[data-relief]").first()).toHaveAttribute("data-relief", "on");
  expect((await Promise.all(bodies)).some(isThree)).toBe(true);
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
      await expect(legend(page)).toContainText(/exagerad|repete a classe/);
      if (path === "/sismos") await expect(depthScene(page).locator("canvas")).toBeVisible();
      await expectAccessible(page);
      await choose(page, "Mapa");
      await expect(liveMap(page)).toBeVisible();
      await expectAccessible(page);
    }
  });
}
