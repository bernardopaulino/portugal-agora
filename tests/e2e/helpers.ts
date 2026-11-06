import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** Espera que as entradas animadas acabem (nada anda em loop, por isso acabam sempre). */
export async function settle(page: Page) {
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== "running" && !a.pending),
  );
}

export async function expectAccessible(page: Page) {
  // A meio de uma entrada, o texto ainda está transparente e o contraste baixaria.
  await settle(page);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    // O canvas do mapa é complementar; a mesma informação está nas listas.
    .exclude(".maplibregl-canvas")
    .analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes[0]?.target}`)).toEqual([]);
}
