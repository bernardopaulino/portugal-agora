# Portugal Agora

**Está tudo bem no meu distrito?** O Portugal Agora responde em segundos, com dados oficiais: avisos meteorológicos e sismos do IPMA, incêndios ativos do Fogos.pt, risco de incêndio por concelho, qualidade do ar e índice UV. Tudo num só sítio, atualizado a cada minuto, e pensado para ser lido por pessoas de qualquer idade.

🌐 [portugalagora.pt](https://portugalagora.pt)

## Regra do projeto

Projeto **sem fins lucrativos**: sem publicidade, sem donativos, sem monetização de qualquer tipo. Esta é uma condição dos termos de utilização do Fogos.pt e do IPMA, e não deve ser alterada.

## Funcionalidades

- **Faixa de estado:** uma frase em português simples ("Aviso amarelo em 12 distritos.") numa faixa com a cor do aviso mais alto do IPMA.
- **Mapa** (MapLibre + OpenFreeMap) com 5 camadas: avisos por distrito, incêndios, sismos, risco de incêndio por concelho e qualidade do ar. Nomes das localidades em português. Liga-se às listas: "Ver no mapa" enquadra o evento, e um clique no mapa mostra o detalhe.
- **Páginas por distrito** (18 distritos + Açores + Madeira): previsão a 5 dias, avisos, incêndios, sismos, risco de incêndio por concelho (hoje e amanhã), qualidade do ar e UV.
- **Perto de mim:** a localização é convertida em distrito **no próprio dispositivo** (ponto-em-polígono com os limites da CAOP). Nada é enviado ao servidor.
- **Resiliência:** se uma fonte falhar, o site mostra os últimos dados obtidos, assinalados como desatualizados. Nunca fica em branco.
- **Funciona sem rede** (PWA com service worker): mostra os últimos dados guardados.
- **Imagens de partilha dinâmicas:** ao partilhar um link no WhatsApp ou no LinkedIn, a pré-visualização mostra o estado atual.
- **Acessibilidade:** WCAG 2.2 AA verificado com axe. Letra Atkinson Hyperlegible Next (desenhada para baixa visão), base de 18 px, níveis que nunca dependem só da cor (cor + ícone + palavra), alvos de toque de 44 px, tema claro/escuro e respeito por "reduzir movimento".

## Fontes de dados

| Dados                                  | Fonte                                                             | Atualização |
| -------------------------------------- | ----------------------------------------------------------------- | ----------- |
| Avisos meteorológicos                  | [IPMA](https://api.ipma.pt)                                       | 5 min       |
| Sismos (continente, Madeira, Açores)   | IPMA                                                              | 5 min       |
| Risco de incêndio rural por concelho   | IPMA                                                              | 1 h         |
| Índice UV e previsão a 5 dias          | IPMA                                                              | 1 h         |
| Incêndios ativos                       | [Fogos.pt](https://fogos.pt) (dados ANEPC), requer chave          | 2 min       |
| Qualidade do ar (estimativa de modelo) | [Open-Meteo](https://open-meteo.com) / Copernicus CAMS, CC BY 4.0 | 10 min      |
| Mapa base                              | [OpenFreeMap](https://openfreemap.org), © OpenStreetMap           | —           |
| Limites de distritos e concelhos       | CAOP 2025, [DGT](https://www.dgterritorio.gov.pt), CC BY          | estático    |

A página `/fontes` explica cada fonte e como classificamos incêndios, sismos e qualidade do ar. O nível principal segue sempre a escala oficial do IPMA.

## Stack

Next.js 16 (App Router, Cache Components, Turbopack), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Zod 4, SWR, MapLibre GL 6, Upstash Redis, Vitest, Playwright + axe-core. Alojamento na Vercel (região `cdg1`, Paris).

## Arquitetura

```
Browser ──(SWR, a cada 60 s)──▶ /api/state ──▶ getState()   "use cache", 60 s
                                                   │
                        ┌──────────────┬───────────┼────────────┬─────────────┐
                        ▼              ▼           ▼            ▼             ▼
                 loadWarnings  loadEarthquakes  loadFires  loadFireRisk  loadAirQuality …
                 "use cache" com duração própria por fonte (2 min a 1 h)
                        │
                        ├─ fetchJson: timeout de 3 s, User-Agent identificável, erros tipados
                        ├─ validação Zod da resposta
                        ├─ normalização para um modelo comum (Event, Severity)
                        └─ snapshot no Redis ("último resultado bom")

Se uma fonte falhar → registry.ts devolve o snapshot marcado "stale", ou "unavailable".
```

- **As páginas são pré-renderizadas** (a inicial e os 20 distritos) e revalidadas a cada minuto: carregam como estáticas e o browser atualiza os dados sozinho.
- **As APIs externas nunca são chamadas pelo browser.** O servidor agrega tudo, o que respeita os limites de cada fonte (uma chamada por período de cache, não uma por visitante).
- **As horas do IPMA são UTC sem sufixo** (confirmado no código do próprio site do IPMA) e são mostradas na hora local de cada região.

### Estrutura

```
app/                  páginas, rotas de API, OG images, sitemap, manifest
  [distrito]/         páginas por distrito (generateStaticParams)
  api/state/          estado agregado do país
  api/sources/[id]/   dados normalizados de uma fonte (transparência/depuração)
  api/health/         estado do serviço
components/
  status/             faixa de estado, severidade, atribuição de fontes
  cards/              listas de avisos, incêndios, sismos, previsão, risco
  map/                mapa MapLibre e controlos
  layout/             cabeçalho, rodapé, tema, "perto de mim", offline
data/                 distritos, concelhos (DICO), tipos de tempo
lib/
  sources/            um adaptador por fonte + loaders com cache + registry
  state/              agregação e frases ("no Porto e em Viana do Castelo")
  geo/ time/ http/    geometria, datas em pt-PT, fetch robusto
public/geo/           limites simplificados da CAOP 2025 (GeoJSON)
tests/unit/           testes com respostas reais das APIs (tests/fixtures)
tests/e2e/            Playwright + auditoria de acessibilidade
scripts/              cópia do worker do MapLibre (postinstall)
```

## Desenvolvimento

Requisitos: Node.js 22 (ver `.nvmrc`).

```bash
npm install                  # também copia o worker do MapLibre para public/maplibre
cp .env.example .env.local   # preencher CONTACT_EMAIL (e FOGOS_API_KEY quando existir)
npm run dev                  # http://localhost:3000
```

Sem `FOGOS_API_KEY` a secção de incêndios mostra "indisponível" e remete para o fogos.pt. Sem Redis, os snapshots ficam em memória.

| Comando                             | O que faz                                       |
| ----------------------------------- | ----------------------------------------------- |
| `npm run dev`                       | servidor de desenvolvimento                     |
| `npm run check`                     | lint + tipos + formatação + testes unitários    |
| `npm test`                          | testes unitários (Vitest)                       |
| `npm run build && npm run test:e2e` | testes end-to-end e acessibilidade (Playwright) |
| `npm run format`                    | formata o código (Prettier)                     |

Na primeira vez que correres os testes e2e: `npx playwright install chromium`.

### Regenerar os limites administrativos

Os ficheiros em `public/geo/` foram gerados a partir dos GeoPackages oficiais da CAOP 2025 (DGT), simplificados com `geopandas` (tolerância de 400 m para os distritos, 150 m para as ilhas e 250 m para os concelhos). Quando sair uma nova CAOP, basta repetir o processo com os ficheiros novos.

## Deploy (Vercel)

1. Importar o repositório na Vercel (deteta Next.js automaticamente).
2. Adicionar **Upstash Redis** a partir do Vercel Marketplace (cria `KV_REST_API_URL` e `KV_REST_API_TOKEN`).
3. Variáveis de ambiente: `NEXT_PUBLIC_SITE_URL=https://portugalagora.pt`, `CONTACT_EMAIL` e, quando chegar, `FOGOS_API_KEY`.
4. Em _Settings → Domains_, adicionar `portugalagora.pt` e seguir as instruções de DNS no registo do domínio.
5. Confirmar em `https://portugalagora.pt/api/health`.

## Licença

Código: MIT. Os dados pertencem às respetivas fontes e seguem os seus termos de utilização.
