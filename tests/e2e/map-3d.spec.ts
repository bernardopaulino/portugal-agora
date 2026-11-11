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
const pageTitleOf = (page: Page) => page.getByRole("heading", { level: 1 });

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

test("mudar de distrito no mesmo tema volta a inclinar o mapa 3D", async ({ page }) => {
  // O Next reaproveitava o mapa do distrito anterior (ou reconstruía-o ao voltar
  // a uma página já vista): o mapa ficava plano, sem a entrada, e com os
  // contornos do distrito antigo. Cada distrito tem agora a sua vista.
  const pick = async (district: string) => {
    await page.locator("select:visible").selectOption(district);
    await expect(page).toHaveURL(new RegExp(`/${district}/risco$`));
  };
  await page.goto("/lisboa/risco");
  await expect(liveMap(page)).toHaveAttribute("data-pitch", "55", { timeout: 20_000 });
  for (const district of ["porto", "lisboa"]) {
    await pick(district);
    await expect(liveMap(page)).toHaveAttribute("data-pitch", "55", { timeout: 20_000 });
  }
});

test("voltar a um distrito já visitado repete a entrada da câmara", async ({ page }) => {
  // O Next guarda escondidas as páginas já visitadas e volta a mostrá-las:
  // a cena 3D é a mesma, mas a entrada tem de acontecer outra vez.
  // Cada movimento fica com a página em que aconteceu.
  await page.addInitScript(() => {
    const w = window as unknown as { __moves: [string, string][] };
    w.__moves = [];
    new MutationObserver((records) => {
      for (const r of records)
        w.__moves.push([location.pathname, (r.target as HTMLElement).dataset.cameraDuration ?? ""]);
    }).observe(document, {
      attributes: true,
      subtree: true,
      attributeFilter: ["data-camera-duration"],
    });
  });
  const moves = () =>
    page.evaluate(() => (window as unknown as { __moves: [string, string][] }).__moves);
  const pick = async (district: string) => {
    await page.locator("select:visible").selectOption(district);
    await expect(page).toHaveURL(new RegExp(`/${district}/sismos$`));
  };
  await page.goto("/acores/sismos");
  await expect.poll(moves).toContainEqual(["/acores/sismos", "1800"]);
  await pick("braga");
  await expect.poll(moves).toContainEqual(["/braga/sismos", "1800"]);
  await pick("acores");
  // Os movimentos depois do regresso aos Açores: o primeiro é a entrada longa.
  await expect
    .poll(async () => {
      const all = await moves();
      const back = all.slice(all.findLastIndex(([path]) => path === "/braga/sismos") + 1);
      return back.find(([path]) => path === "/acores/sismos")?.[1] ?? null;
    })
    .toBe("1800");
});

test("dados novos não repetem a entrada da câmara dos sismos", async ({ page }) => {
  // O primeiro estado faz a entrada da câmara; a renovação seguinte traz um
  // sismo mais fundo: o bloco cresce e a câmara ajusta-se com uma viagem
  // curta, sem voltar ao topo.
  let calls = 0;
  await page.route("**/api/state", async (route) => {
    calls += 1;
    if (calls === 1) return route.continue();
    const state = await (await route.fetch()).json();
    // Um sismo mais fundo do que qualquer um real, dentro do bloco do continente.
    state.earthquakes.data = [
      ...(state.earthquakes.data ?? []),
      {
        kind: "earthquake",
        id: "sismo-teste-fundo",
        title: "Sismo de teste",
        severity: "none",
        magnitude: 2.5,
        depthKm: 150,
        felt: false,
        occurredAt: state.generatedAt,
        coordinates: [-9.6, 38.65],
        place: { district: "lisboa", region: "continente", label: "a oeste de Cascais" },
      },
    ];
    await route.fulfill({ json: state });
  });
  await page.goto("/sismos");
  await expect(depthScene(page)).toHaveAttribute("data-camera-duration", "1800");
  // O SWR volta a pedir o estado quando a janela ganha o foco (no máximo de 5 em 5 s).
  await page.waitForTimeout(5500);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(depthScene(page)).toHaveAttribute("data-camera-duration", "600", {
    timeout: 10_000,
  });
});

test("sismos em 3D numa página de distrito", async ({ page }) => {
  const errors = consoleErrors(page);
  await withTestQuakes(page);
  await page.goto("/lisboa/sismos");
  // O bloco é o do distrito, não o do continente inteiro.
  await expect(depthScene(page)).toHaveAttribute("aria-label", /Lisboa: \d+ sismos?/);
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

  // Voltar ao 3D: a segunda entrada usa a curva por omissão. Já houve um erro
  // aqui que parava o desenho do mapa (ficava plano e sem se mexer).
  await choose(page, "3D");
  await expect(legend(page)).toContainText("Relevo exagerado 2×.");
  await page.waitForTimeout(1000);
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

const sceneLayer = (page: Page) => page.locator("[data-scene-ready]").first();

test("página inicial imersiva: o país em 3D atrás do boletim, um painel por tema", async ({
  page,
}) => {
  const errors = consoleErrors(page);
  await page.goto("/");
  await expect(pageTitleOf(page)).toBeVisible();
  await expect(sceneLayer(page)).toHaveAttribute("data-scene-ready", "on");
  await expect(sceneLayer(page).locator("canvas")).toBeAttached();
  // Um painel por tema, cada um com a ligação para a sua página.
  for (const name of ["Abrir os avisos", "Abrir os incêndios", "Abrir os sismos"]) {
    await expect(page.getByRole("link", { name })).toBeAttached();
  }
  // Os painéis ficam por cima da cena: as ligações continuam a funcionar.
  const quakes = page.getByRole("link", { name: "Abrir os sismos" });
  await quakes.scrollIntoViewIfNeeded();
  await settle(page);
  await quakes.click();
  await expect(page).toHaveURL(/\/sismos$/);
  expect(errors).toEqual([]);
});

const sceneFrames = (page: Page) => page.locator("[data-scene-frame]");

test("no telemóvel, o país fica entre o cabeçalho e cada painel", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Só em ecrãs estreitos os painéis ocupam a largura toda.");
  await page.goto("/");
  await expect(sceneLayer(page)).toHaveAttribute("data-scene-ready", "on");
  // O espaço do país vem antes do painel do boletim, e o título aparece no primeiro ecrã.
  const frame = (await sceneFrames(page).first().boundingBox())!;
  const title = (await pageTitleOf(page).boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(frame.height).toBeGreaterThan(100);
  expect(frame.y + frame.height).toBeLessThan(title.y);
  expect(title.y + 40).toBeLessThan(viewport.height);
  // Cada tema e o índice dos distritos têm o seu espaço por cima do painel.
  for (const id of ["avisos", "incendios", "sismos", "risco", "distritos"]) {
    await expect(page.locator(`[data-scene="${id}"] [data-scene-frame]`)).toHaveCount(1);
  }
});

test("num telemóvel baixo, o título vem antes do país", async ({ page, isMobile }) => {
  test.skip(!isMobile, "Só em ecrãs estreitos.");
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await expect(sceneFrames(page).first()).toBeHidden();
  const title = (await pageTitleOf(page).boundingBox())!;
  expect(title.y + 80).toBeLessThan(568);
});

test("sem WebGL, o telemóvel mostra o mapa plano e os painéis seguidos", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Em ecrãs largos o mapa plano fica ao lado do painel.");
  // Um browser sem WebGL2.
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      value(this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        return type === "webgl2" ? null : Reflect.apply(original, this, [type, ...rest]);
      },
    });
  });
  await page.goto("/");
  await expect(pageTitleOf(page)).toBeVisible();
  await expect(
    sceneFrames(page).getByRole("group", { name: /Mapa de Portugal com o nível de aviso/ }),
  ).toBeVisible();
  await expect(page.locator("[data-scene-ready]")).toHaveCount(0);
  // Sem a cena, os temas não guardam espaço vazio para ela.
  await expect(page.locator("[data-scene='avisos'] [data-scene-frame]")).toHaveCount(0);
});

test("com o dedo, o primeiro toque mostra o distrito e a etiqueta abre-o", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Toque.");
  await page.goto("/");
  await expect(sceneLayer(page)).toHaveAttribute("data-scene-ready", "on");
  const frame = (await sceneFrames(page).first().boundingBox())!;
  const label = sceneLayer(page).locator("[data-slug]");
  // Um ponto no continente; enquanto a câmara acaba a entrada, pode calhar no mar.
  await expect(async () => {
    await page.touchscreen.tap(frame.x + frame.width * 0.66, frame.y + frame.height * 0.62);
    await expect(label).toBeVisible({ timeout: 500 });
  }).toPass({ timeout: 15_000 });
  const slug = await label.getAttribute("data-slug");
  // O primeiro toque não sai da página; a etiqueta diz como abrir.
  await expect(page).toHaveURL(/\/$/);
  await expect(label).toContainText("Abrir");
  // A etiqueta vai para cima do distrito no desenho seguinte da cena.
  await expect.poll(async () => ((await label.boundingBox())?.y ?? 0) > frame.y - 120).toBe(true);
  const box = (await label.boundingBox())!;
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height - 12);
  await expect(page).toHaveURL(new RegExp(`/${slug}$`));
});

test("o índice dos distritos é o caminho do teclado para cada distrito", async ({ page }) => {
  await page.goto("/");
  const lisboa = page
    .getByRole("region", { name: "Todos os distritos" })
    .getByRole("link", { name: /Lisboa$/ });
  await lisboa.focus();
  await expect(lisboa).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/lisboa$/);
  await expect(page.locator("[data-scene-ready]").first()).toHaveAttribute(
    "data-scene-ready",
    "on",
  );
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

    // Página inicial: a cena aparece sem entrada e nada fica a animar nem escondido.
    await page.goto("/");
    await expect(sceneLayer(page)).toHaveAttribute("data-scene-ready", "on");
    const running = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((a) => a.playState === "running" && Number(a.effect?.getTiming().duration) > 1)
          .length,
    );
    expect(running).toBe(0);
    await page.mouse.wheel(0, 3000);
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

  // Na página inicial chega depois do primeiro desenho, para a cena.
  bodies = [];
  await page.goto("/");
  await expect(sceneLayer(page)).toHaveAttribute("data-scene-ready", "on");
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

test("o tema da casa é o escuro, mesmo com o sistema em claro", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

for (const theme of ["dark", "light"] as const) {
  test(`acessibilidade nas páginas com 3D, tema ${theme === "light" ? "claro" : "escuro"}`, async ({
    page,
  }) => {
    await page.addInitScript((t) => localStorage.setItem("pa:tema", t), theme);
    await withTestQuakes(page);
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(sceneLayer(page)).toHaveAttribute("data-scene-ready", "on");
    await expectAccessible(page);
    for (const path of ["/sismos", "/incendios", "/risco"]) {
      await page.goto(path);
      await expect(legend(page)).toContainText(/exagerad|repete a classe/);
      if (path === "/sismos") await expect(depthScene(page).locator("canvas")).toBeVisible();
      await expectAccessible(page);
      await choose(page, "Mapa");
      await expect(liveMap(page)).toBeVisible();
      await expectAccessible(page);
    }
  });
}
