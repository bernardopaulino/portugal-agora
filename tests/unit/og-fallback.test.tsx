import { ImageResponse } from "next/og";
import { afterEach, describe, expect, it, vi } from "vitest";

const getState = vi.hoisted(() => vi.fn());
vi.mock("@/lib/state/get-state", () => ({ getState }));

const PNG = [0x89, 0x50, 0x4e, 0x47];

async function expectPng(response: Response) {
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("image/png");
  const bytes = new Uint8Array(await response.arrayBuffer());
  expect([...bytes.slice(0, 4)]).toEqual(PNG);
  expect(bytes.length).toBeGreaterThan(5_000);
}

describe("imagens de partilha: nunca dão erro", () => {
  afterEach(() => vi.restoreAllMocks());

  it("se os dados falharem, a rota devolve a imagem genérica em PNG", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    getState.mockRejectedValue(new Error("IPMA sem resposta"));
    const { default: districtImage } = await import("@/app/[lang]/[distrito]/opengraph-image");
    const { default: homeImage } = await import("@/app/[lang]/opengraph-image");

    await expectPng(
      await districtImage({ params: Promise.resolve({ lang: "en", distrito: "acores" }) }),
    );
    await expectPng(await homeImage({ params: Promise.resolve({ lang: "pt" }) }));
    expect(log).toHaveBeenCalledWith(
      "[og] falhou a imagem de partilha; uso a genérica",
      expect.any(Error),
    );
  });

  it("se o desenho falhar (por exemplo, uma letra estragada), também", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { safeOgImage } = await import("@/lib/og/card");
    const broken = () =>
      new ImageResponse(
        <div style={{ display: "flex", fontFamily: "Atkinson Hyperlegible Next" }}>Lisbon</div>,
        {
          width: 1200,
          height: 630,
          fonts: [
            {
              name: "Atkinson Hyperlegible Next",
              data: new ArrayBuffer(16),
              weight: 400,
              style: "normal",
            },
          ],
        },
      );
    await expectPng(await safeOgImage(broken, "en"));
    expect(log).toHaveBeenCalled();
  });

  it("com os dados certos, desenha a imagem do estado sem passar pela genérica", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { safeOgImage, statusCard } = await import("@/lib/og/card");
    const response = await safeOgImage(() =>
      statusCard({
        level: "yellow",
        place: "Lisbon",
        headline: "Yellow warning in Lisbon.",
        generatedAt: "2026-10-05T10:00:00.000Z",
        locale: "en",
        levels: { lisboa: "yellow", acores: "none" },
      }),
    );
    await expectPng(response);
    expect(log).not.toHaveBeenCalled();
  });

  it("se as letras não se lerem, as imagens saem com a letra por omissão", async () => {
    vi.resetModules();
    vi.doMock("node:fs/promises", async (original) => ({
      ...(await original<typeof import("node:fs/promises")>()),
      readFile: vi.fn().mockRejectedValue(new Error("ENOENT")),
    }));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { safeOgImage, statusCard } = await import("@/lib/og/card");
    const response = await safeOgImage(() =>
      statusCard({
        level: "none",
        place: "Azores",
        headline: "No weather warnings in the Azores.",
        generatedAt: "2026-10-05T10:00:00.000Z",
        locale: "en",
        levels: { lisboa: "yellow", acores: "none" },
      }),
    );
    await expectPng(response);
    expect(log).toHaveBeenCalledWith(
      "[og] não foi possível ler as letras; uso a letra por omissão",
      expect.any(Error),
    );
    vi.doUnmock("node:fs/promises");
  });
});
