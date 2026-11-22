import { expect, test, type Page } from "@playwright/test";

import { expectAccessible } from "./helpers";

// Com Cache Components, o Next mantém a página anterior escondida (React <Activity>)
// para o "voltar" ser instantâneo; por isso procuramos o título visível pelo papel.
const pageTitle = (page: Page) => page.getByRole("heading", { level: 1 });

// O seletor existe duas vezes no HTML (cabeçalho em computador, linha própria em
// telemóvel); getByRole só encontra o que está visível.
// Espera que o seletor já reaja (data-ready): escolher antes disso, com a máquina
// carregada pelos testes em paralelo, podia perder-se.
const picker = (page: Page, name = "Escolher distrito ou região") =>
  page.getByRole("combobox", { name }).and(page.locator("[data-ready]"));

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
  await expect(page.getByRole("heading", { name: "Previsão para o Porto" })).toBeVisible();
  // Durante a view transition da mudança de página (~350 ms) o React tira o <title>
  // antigo e só põe o novo no fim; espera-se pelo título antes da auditoria.
  await expect(page).toHaveTitle(/^Porto/);
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

test("enquanto a página nova não chega, um traço no topo mostra que está a mudar", async ({
  page,
}) => {
  // Uma resposta atrasada imita uma ligação lenta (também a do prefetch, se a
  // lista do histórico mostrar a ligação para o Porto).
  await page.route(
    (url) => url.pathname === "/porto/avisos" && url.searchParams.has("_rsc"),
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.continue();
    },
  );
  await page.goto("/avisos");
  await expect(pageTitle(page)).toHaveText("Avisos meteorológicos");
  const bar = page.locator(".nav-progress");
  await picker(page).selectOption("porto");
  await expect(page.locator("html")).toHaveAttribute("data-navigating", "");
  await expect
    .poll(() => bar.evaluate((el) => Number(getComputedStyle(el).opacity)))
    .toBeGreaterThan(0.5);
  await expect(pageTitle(page)).toHaveText("Avisos no Porto");
  await expect(page.locator("html")).not.toHaveAttribute("data-navigating");
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

test("em ecrãs largos, o logótipo, os separadores e os controlos não se sobrepõem", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Só em computador.");
  type Box = { x: number; y: number; width: number; height: number };
  const overlap = (a: Box, b: Box) =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  for (const width of [1024, 1280, 1366, 1440, 1920]) {
    await page.setViewportSize({ width, height: 800 });
    for (const path of ["/", "/en"]) {
      await page.goto(path);
      const header = page.locator("[data-site-header]");
      const logo = (await header.getByRole("link").first().boundingBox())!;
      const nav = (await header.getByRole("navigation").getByRole("list").boundingBox())!;
      const picker = (await header.getByRole("combobox").boundingBox())!;
      expect(overlap(logo, nav), `${path} a ${width} px: logótipo e separadores`).toBe(false);
      expect(overlap(nav, picker), `${path} a ${width} px: separadores e distrito`).toBe(false);
      // Os separadores cabem sem deslizar.
      const fits = await header
        .getByRole("navigation")
        .getByRole("list")
        .evaluate((el) => el.scrollWidth <= el.clientWidth);
      expect(fits, `${path} a ${width} px: separadores cabem`).toBe(true);
    }
  }
});

test("nas páginas de tema, o mapa vem antes da lista e pode ser saltado", async ({ page }) => {
  await page.goto("/lisboa/incendios");
  const map = page.locator("#mapa");
  const list = page.locator("#lista");
  const mapBox = (await map.boundingBox())!;
  const listBox = (await list.boundingBox())!;
  // Em telemóveis o mapa fica por cima da lista; em ecrãs largos, à esquerda.
  const before = mapBox.y < listBox.y || mapBox.x + mapBox.width <= listBox.x;
  expect(before).toBe(true);
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

test("o mapa só oferece as zonas que têm dados", async ({ page }) => {
  const zones = page.getByRole("radiogroup", { name: "Zona do mapa" });
  // O risco de incêndio do IPMA é só do continente: sem escolha de zona.
  await page.goto("/risco");
  await expect(page.getByRole("radio", { name: "Risco de incêndio", exact: true })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(zones).toHaveCount(0);
  // A qualidade do ar cobre as ilhas.
  await page.getByRole("radio", { name: "Qualidade do ar", exact: true }).click();
  await expect(zones.getByRole("radio")).toHaveText(["Continente", "Açores", "Madeira"]);
  // O Fogos.pt não tem os Açores.
  await page.goto("/incendios");
  await expect(zones.getByRole("radio")).toHaveText(["Continente", "Madeira"]);
});

test("nos Açores, os incêndios dizem que não há dados e para onde ir", async ({ page }) => {
  await page.goto("/acores/incendios");
  await expect(page.getByText("O Fogos.pt não tem dados de incêndios nos Açores.")).toBeVisible();
  await expect(page.getByRole("link", { name: /Proteção Civil \(SRPCBA/ })).toHaveAttribute(
    "href",
    "https://www.prociv.azores.gov.pt",
  );
  await page.goto("/acores");
  // A linha dos incêndios do resumo: sem dados, e porquê (não "nenhum em curso").
  await expect(
    page.getByRole("link", { name: /Incêndios.*Sem dados.*o Fogos\.pt não tem dados nos Açores/ }),
  ).toBeVisible();
});

test("o mapa do risco de incêndio mostra hoje ou amanhã", async ({ page }) => {
  await page.goto("/lisboa/risco");
  const days = page.getByRole("radiogroup", { name: "Dia do risco de incêndio" });
  const today = days.getByRole("radio", { name: "Hoje" });
  const tomorrow = days.getByRole("radio", { name: "Amanhã" });
  await expect(today).toHaveAttribute("aria-checked", "true");
  await tomorrow.click();
  await expect(tomorrow).toHaveAttribute("aria-checked", "true");
  await expect(today).toHaveAttribute("aria-checked", "false");
  // Na qualidade do ar não há dia a escolher.
  await page.getByRole("radio", { name: "Qualidade do ar", exact: true }).click();
  await expect(days).toHaveCount(0);
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

test("as páginas indicam o autor (o LinkedIn mostra-o)", async ({ page }) => {
  for (const path of ["/", "/en/lisboa"]) {
    await page.goto(path);
    await expect(page.locator("meta[name=author]")).toHaveAttribute("content", "Bernardo Paulino");
  }
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

test("feeds RSS dos avisos, incêndios e sismos, do país e de um distrito", async ({
  page,
  request,
}) => {
  for (const path of [
    "/avisos/rss",
    "/en/lisboa/avisos/rss",
    "/incendios/rss",
    "/sismos/rss",
    "/en/porto/sismos/rss",
    "/faro/incendios/rss",
  ]) {
    const response = await request.get(path);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("application/rss+xml");
    const xml = await response.text();
    expect(xml.startsWith("<?xml")).toBe(true);
    expect(xml).toContain("<channel>");
    expect(xml.trimEnd().endsWith("</rss>")).toBe(true);
  }
  expect((await request.get("/nada/avisos/rss")).status()).toBe(404);
  await page.goto("/lisboa/avisos");
  await expect(page.locator(`link[rel="alternate"][type="application/rss+xml"]`)).toHaveAttribute(
    "href",
    /\/lisboa\/avisos\/rss$/,
  );
  await expect(page.getByRole("link", { name: "Subscrever estes avisos por RSS" })).toBeVisible();
});

test("o tick só responde com o segredo", async ({ request }) => {
  expect((await request.get("/api/cron/tick")).status()).toBe(401);
  const wrong = { headers: { authorization: "Bearer errado" } };
  expect((await request.get("/api/cron/tick", wrong)).status()).toBe(401);
});

test("página de um concelho: dados ao abrir, sem dados no HTML", async ({ page, request }) => {
  const html = await (await request.get("/lisboa/sintra")).text();
  // Sem o estado do país no HTML: a página é estática e não conta como ISR write.
  expect(html).not.toContain("generatedAt");
  await page.goto("/lisboa/sintra");
  await expect(page.getByRole("heading", { level: 1, name: "Sintra" })).toBeVisible();
  for (const name of ["No mapa", "Agora", "Avisos meteorológicos", "Risco de incêndio"])
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  // O mapa: os concelhos do distrito, cada um com ligação (Sintra realçado, sem ligação).
  const map = page.getByRole("group", { name: /Mapa dos concelhos de Lisboa/ });
  await expect(map.getByRole("link").first()).toBeVisible();
  // Incêndios: uma caixa quando há algum; senão, uma linha em "Agora" (calmo, ou
  // a fonte indisponível, como no CI, que não tem a chave do Fogos.pt).
  const fires = page.getByRole("heading", { name: /Incêndios no concelho e até 15 km/ });
  const calm = page.getByText(/Sem incêndios em curso no concelho/);
  const down = page.getByText(/Informação sobre incêndios indisponível/);
  await expect(fires.or(calm).or(down).first()).toBeVisible();
  // A tabela do risco compara com os concelhos mais próximos.
  await expect(page.locator("#risco tbody tr")).toHaveCount(5);
  await expectAccessible(page);
  expect((await request.get("/lisboa/nao-existe")).status()).toBe(404);
});

test("a previsão de um concelho é a do concelho, não a da capital", async ({ page, request }) => {
  const forecast = { status: "ok", fetchedAt: new Date().toISOString() };
  const day = (date: string, max: number) => ({
    date,
    min: 10,
    max,
    rainChance: 0,
    weather: "Céu limpo",
    weatherId: 1,
    wind: "Vento fraco de norte",
  });
  const days = (max: number) =>
    [0, 1, 2, 3, 4].map((i) =>
      day(new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10), max + i),
    );
  // As próximas horas: de hora a hora a partir de agora (a faixa mostra de 3 em 3).
  const start = Math.floor(Date.now() / 3_600_000) * 3_600_000;
  const hours = Array.from({ length: 30 }, (_, i) => ({
    time: new Date(start + i * 3_600_000).toISOString(),
    temp: 12 + (i % 5),
    rainChance: i === 3 ? null : 20,
    weather: "Céu limpo",
    weatherId: 1,
    windKmh: 10,
    windDir: "N",
  }));
  const withUv = days(31).map((d) => ({ ...d, uv: { index: 6.4, label: "Elevado" } }));
  await page.route("**/api/forecast/concelho/1111", (route) =>
    route.fulfill({
      json: {
        ...forecast,
        id: "ipma-forecast",
        data: { days: withUv, hours },
        place: "Sintra",
      },
    }),
  );
  await page.goto("/lisboa/sintra");
  await expect(
    page.getByRole("heading", { name: "Previsão para o concelho de Sintra" }),
  ).toBeVisible();
  await expect(page.locator("#previsao-titulo + ol")).toContainText("31°");
  // As próximas horas, de 3 em 3: 8 colunas.
  await expect(page.getByRole("heading", { name: "Próximas horas" })).toBeVisible();
  await expect(page.locator("#horas-titulo + ol > li")).toHaveCount(8);
  // O UV de hoje é o do concelho (6,4), não o da capital.
  await expect(page.locator("#ar")).toContainText("6,4");
  await expect(page.getByText(/capital de distrito/)).toHaveCount(0);

  // Sem a previsão do concelho, a da capital, e diz-se.
  await page.route("**/api/forecast/concelho/1106", (route) =>
    route.fulfill({ json: { ...forecast, id: "ipma-forecast", status: "error", data: null } }),
  );
  await page.goto("/lisboa/lisboa");
  await expect(page.getByRole("heading", { name: "Previsão para Lisboa" })).toBeVisible();
  await expect(page.getByText(/esta é a da capital de distrito, Lisboa/)).toBeVisible();

  // O endpoint: um local por concelho; nas ilhas, o local de previsão mais próximo.
  const ribeiraBrava = await (await request.get("/api/forecast/concelho/3107")).json();
  expect(ribeiraBrava.place).toBe("Lugar de Baixo");
  expect((await request.get("/api/forecast/concelho/9999")).status()).toBe(404);
});

test("o seletor mostra os concelhos do distrito e sai bem de um concelho", async ({ page }) => {
  await page.goto("/lisboa");
  await picker(page).selectOption("lisboa/sintra");
  await expect(page).toHaveURL(/\/lisboa\/sintra$/);
  await expect(picker(page)).toHaveValue("lisboa/sintra");
  // Mudar de distrito numa página de concelho leva ao resumo do distrito.
  await picker(page).selectOption("porto");
  await expect(page).toHaveURL(/\/porto$/);
});

test("o distrito liga aos seus concelhos", async ({ page }) => {
  await page.goto("/lisboa");
  const list = page.getByRole("region", { name: "Concelhos" });
  await list.getByRole("link", { name: "Sintra" }).click();
  await expect(page).toHaveURL(/\/lisboa\/sintra$/);
});

test("HSTS com subdomínios e preload", async ({ request }) => {
  const response = await request.get("/");
  expect(response.headers()["strict-transport-security"]).toBe(
    "max-age=63072000; includeSubDomains; preload",
  );
});

test("cada idioma partilha a sua imagem", async ({ page, request }) => {
  const pages = {
    pt: ["/", "/lisboa", "/avisos", "/porto/risco"],
    en: ["/en", "/en/lisboa", "/en/avisos", "/en/porto/risco"],
  };
  for (const [lang, paths] of Object.entries(pages)) {
    for (const path of paths) {
      await page.goto(path);
      const content = await page.locator('meta[property="og:image"]').getAttribute("content");
      const image = new URL(content!).pathname;
      expect(image, path).toMatch(new RegExp(`^/${lang}(/[a-z-]+)?/opengraph-image$`));
      const response = await request.get(image);
      expect(response.status(), image).toBe(200);
      expect(response.headers()["content-type"]).toBe("image/png");
    }
  }
});

test("emergência: a página, a ligação na barra e o destaque num dia mau", async ({ page }) => {
  await page.goto("/emergencia");
  await expect(
    page.getByRole("heading", { level: 1, name: "Em caso de emergência" }),
  ).toBeVisible();
  await expect(page.locator("main a[href='tel:112']").first()).toBeVisible();
  for (const name of ["Incêndio rural", "Tempo quente", "Sismo"])
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await expectAccessible(page);

  // A barra do 112, em todas as páginas, leva lá.
  await page.goto("/fontes");
  await page.getByRole("link", { name: "O que fazer" }).click();
  await expect(page).toHaveURL(/\/emergencia$/);
});

test.describe("num dia mau", () => {
  // O service worker serve o /api/state, e o Playwright não interceta o que ele trata.
  test.use({ serviceWorkers: "block" });

  test("a barra do 112 fica em destaque e diz porquê", async ({ page }) => {
    await page.route("**/api/state", async (route) => {
      const state = await (await route.fetch()).json();
      await route.fulfill({ json: { ...state, levelKnown: true, level: "red" } });
    });
    await page.goto("/");
    await expect(page.getByText("Hoje há aviso vermelho ou um incêndio importante.")).toBeVisible();
  });
});

test("o concelho do “Perto de mim” fica como atalho na página inicial", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("pa:distrito", "lisboa");
    localStorage.setItem("pa:concelho", "lisboa/sintra");
  });
  await page.goto("/");
  await expect(page.getByText("O seu concelho:")).toBeVisible();
  await page.getByRole("link", { name: "Sintra" }).first().click();
  await expect(page).toHaveURL(/\/lisboa\/sintra$/);
});

test("o último ano dos avisos: calendário no distrito e tabela no país", async ({ page }) => {
  const order = [
    "aveiro",
    "beja",
    "braga",
    "braganca",
    "castelo-branco",
    "coimbra",
    "evora",
    "faro",
    "guarda",
    "leiria",
    "lisboa",
    "portalegre",
    "porto",
    "santarem",
    "setubal",
    "viana-do-castelo",
    "vila-real",
    "viseu",
    "acores",
    "madeira",
  ];
  await page.route("**/api/history/days", async (route) => {
    const real = await (await route.fetch()).json();
    const levels = (lisboa: string) =>
      real.order.map((slug: string) => (slug === "lisboa" ? lisboa : "n")).join("");
    const days = ["o", "y", "y", "n"].map((l, i) => ({
      d: new Date(Date.now() - (4 - i) * 86_400_000).toISOString().slice(0, 10),
      l: levels(l),
      f: 0,
    }));
    await route.fulfill({ json: { order: real.order ?? order, days } });
  });
  await page.goto("/lisboa/avisos");
  await expect(page.getByRole("heading", { name: "Último ano" })).toBeVisible();
  await expect(page.getByText("Dias com aviso: 2 amarelos, 1 laranja, 0 vermelhos.")).toBeVisible();
  await expect(page.locator("#ano li[title]")).toHaveCount(4);
  await page.goto("/avisos");
  const row = page.locator("#ano tr", { hasText: "Lisboa" });
  await expect(row.locator("td")).toHaveText(["2", "1", "0"]);
});

test.describe("Perto de mim em Oeiras", () => {
  test.use({ permissions: ["geolocation"] });

  test("com GPS, vai direto para Oeiras", async ({ page, context }) => {
    await context.setGeolocation({ latitude: 38.6915, longitude: -9.3105, accuracy: 20 });
    await page.goto("/");
    await page.getByRole("button", { name: "Perto de mim" }).click();
    await expect(page).toHaveURL(/\/lisboa\/oeiras$/);
  });

  test("com a posição aproximada, pergunta o concelho em vez de adivinhar", async ({
    page,
    context,
  }) => {
    // O browser de um computador: posição pelo Wi-Fi ou IP, com quilómetros de erro.
    await context.setGeolocation({ latitude: 38.6915, longitude: -9.3105, accuracy: 8000 });
    await page.goto("/");
    await page.getByRole("button", { name: "Perto de mim" }).click();
    await expect(page.getByText(/só sabe a localização aproximada/)).toBeVisible();
    const choices = page.getByRole("status").getByRole("button");
    await expect(choices.first()).toHaveText("Oeiras");
    await expect(page.getByRole("status").getByRole("button", { name: "Sintra" })).toBeVisible();
    await choices.first().click();
    await expect(page).toHaveURL(/\/lisboa\/oeiras$/);
  });
});
