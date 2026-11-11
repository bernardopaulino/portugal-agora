# Arquitetura

Como o Portugal Agora está organizado por dentro. Para começar a desenvolver, ver o [README](../README.md#desenvolvimento); para pôr em produção, [OPERACAO.md](OPERACAO.md).

## Stack

Next.js 16 (App Router, Cache Components, Turbopack), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Zod 4, SWR, MapLibre GL 6, three e @react-three/fiber 9 (cena da página inicial e dos distritos, carregada depois do primeiro desenho, e vista 3D dos sismos; sem descodificadores em WebAssembly), letras Geist e Atkinson Hyperlegible Next, Upstash Redis, Vitest, Playwright + axe-core. Alojamento na Vercel (região `cdg1`, Paris).

## Fluxo dos dados

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

- **As páginas são estáticas e não levam dados** (inicial, 4 temas, 3 páginas de texto, as 5 páginas de cada distrito e as dos concelhos, em cada idioma): são geradas no deploy e nunca renovadas. O browser vai buscar o estado ao `/api/state` (`useLiveState`, null até chegar; os mapas ficam a cinzento com `PENDING_STATE`) e renova-o a cada minuto. As imagens de partilha são geradas a pedido e ficam 15 min na CDN. Ver "ISR writes" em [OPERACAO.md](OPERACAO.md).
- **As APIs externas nunca são chamadas pelo browser.** O servidor agrega tudo, o que respeita os limites de cada fonte (uma chamada por período de cache, não uma por visitante).
- **As horas do IPMA são UTC sem sufixo** (confirmado no código do próprio site do IPMA) e são mostradas na hora local de cada região.

## Idiomas

Todas as páginas vivem em `app/[lang]/`, com um layout raiz por idioma. O `proxy.ts` reescreve os endereços sem prefixo para `/pt` (sem mudar o endereço no browser) e redireciona `/pt/...` para o endereço sem prefixo, para cada página ter um só endereço público.

- Todo o texto do site está em `lib/i18n/dictionaries.ts` (português e inglês); as frases com números são funções.
- `lib/i18n/terms.ts` traduz o vocabulário fixo que vem das fontes.
- O botão PT | EN é um `<a>` e não um `<Link>`: mudar de layout raiz obriga a carregar a página de novo.

## Estrutura

```
app/                    rotas de API, sitemap, robots, manifest, ícones
  [lang]/               todas as páginas, em pt e en
    avisos/ incendios/ sismos/ risco/    páginas nacionais de cada tema
    [distrito]/         resumo do distrito (generateStaticParams)
      avisos/ incendios/ sismos/ risco/  páginas do tema no distrito
    fontes/ privacidade/ sobre/
  api/state/            estado agregado do país
  api/sources/[id]/     dados normalizados de uma fonte (transparência/depuração)
  api/health/           estado do serviço (sempre 200 se o servidor responde)
  api/health/sources/   frescura de cada fonte: 200 ou 503, para a monitorização
proxy.ts                idioma na raiz (pt) ou em /en
components/
  boletim/              boletim nacional e do distrito, mapa SVG, previsão, cabeçalho das páginas
  cards/                listas de avisos, incêndios, sismos, risco, ar e UV
  map/                  mapa MapLibre e controlos
  status/               secções, severidade, atribuição de fontes, hora relativa
  layout/               cabeçalho e menu, seletor, logótipo, rodapé, tema, "perto de mim", offline
  topic-views.tsx       páginas nacionais de cada tema
  district-topic-views.tsx  páginas de cada tema num distrito
data/                   distritos, concelhos (DICO), tipos de tempo, formas do mapa do boletim
lib/
  sources/              um adaptador por fonte + loaders com cache + registry
  state/                agregação e frases ("no Porto e em Viana do Castelo")
  i18n/                 idiomas, dicionários, tradução de termos, metadados
  routes.ts             distrito e tema a partir do endereço
  og/                   imagens de partilha (opengraph-image)
  cache/                snapshots no Redis e verificação do Redis para o /api/health
  geo/ time/ http/      geometria, datas em pt-PT e en-GB, fetch robusto
assets/fonts/           letras das imagens de partilha (Barlow Semi Condensed, Atkinson Hyperlegible Next; OFL)
public/geo/             limites simplificados da CAOP 2025 (GeoJSON)
public/icons/           ícones da app
tests/unit/             testes com respostas reais das APIs (tests/fixtures)
tests/e2e/              Playwright + auditoria de acessibilidade, em computador e telemóvel
scripts/                worker do MapLibre (postinstall), formas do mapa do boletim e índice do relevo
```

## Acrescentar ou mudar texto

Todo o texto do site está em `lib/i18n/dictionaries.ts`. Ao acrescentar uma frase, acrescenta-a nos dois idiomas: o tipo do dicionário inglês é o do português, por isso o TypeScript avisa se faltar alguma.

## Regenerar os limites administrativos

Os ficheiros em `public/geo/` foram gerados a partir dos GeoPackages oficiais da CAOP 2025 (DGT), simplificados com `geopandas` (tolerância de 400 m para os distritos, 150 m para as ilhas e 250 m para os concelhos). Quando sair uma nova CAOP, basta repetir o processo com os ficheiros novos e depois correr `node scripts/build-map-shapes.mjs`, que gera as formas do mapa do boletim e do logótipo (`data/map-shapes.ts`). Nos Açores, o script aproxima os três grupos de ilhas (encolhe o mar entre eles) para as ilhas caberem maiores na caixa; a mesma conversão é usada para pôr os sismos no sítio certo.

## Regenerar o índice do relevo

A Mapterhorn responde 404 aos tiles só de mar, e o browser mostra cada 404 como um erro na consola. Por isso o mapa só pede os tiles que existem, segundo `public/geo/relief-tiles.json` (os tiles com relevo à volta de Portugal, ao zoom 12, gerados a partir do índice de cobertura público da Mapterhorn), e usa um tile plano para o resto. Quando a Mapterhorn acrescentar fontes:

```bash
npm install --no-save pmtiles && node scripts/build-relief-index.mjs
```
