import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy. Já inclui as origens de que o mapa vai
 * precisar (OpenFreeMap para estilos/tiles, blob: para os workers do
 * MapLibre). Os dados das APIs externas passam sempre pelo servidor,
 * por isso o browser só fala com 'self' e com os servidores de tiles.
 * A Mapterhorn dá o relevo da vista 3D dos incêndios (tiles WebP pedidos
 * pelo MapLibre com fetch e descodificados como imagem). Sem
 * 'wasm-unsafe-eval': o three é usado sem descodificadores em WebAssembly.
 */
const RELIEF_ORIGIN = "https://tiles.mapterhorn.com";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: https://tiles.openfreemap.org ${RELIEF_ORIGIN}`,
  "font-src 'self'",
  `connect-src 'self' https://tiles.openfreemap.org ${RELIEF_ORIGIN}`,
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Dois anos, com subdomínios e pronto para a lista de preload dos browsers
  // (hstspreload.org). Sobrepõe-se ao cabeçalho por omissão da Vercel.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  // O site adotou o Cache Components antes do Partial Prefetching: false mantém o
  // prefetch de sempre (o Next 16.4.5 pede que se escolha). Ligá-lo é uma migração
  // à parte (node_modules/next/dist/docs/01-app/02-guides/adopting-partial-prefetching.md).
  partialPrefetching: false,
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
