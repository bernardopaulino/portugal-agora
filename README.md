# Portugal Agora

**Está tudo bem no meu distrito?** O Portugal Agora responde em segundos, com dados oficiais: avisos meteorológicos e sismos do IPMA, incêndios ativos do Fogos.pt, risco de incêndio por concelho, qualidade do ar e índice UV. Tudo num só sítio, atualizado a cada minuto, e pensado para ser lido por pessoas de qualquer idade. Em português e em inglês.

🌐 [portugalagora.pt](https://portugalagora.pt)

## Regra do projeto

Projeto **sem fins lucrativos**: sem publicidade, sem donativos, sem monetização de qualquer tipo. Esta é uma condição dos termos de utilização do Fogos.pt e do IPMA, e não deve ser alterada.

## Funcionalidades

- **Página inicial imersiva:** Portugal em 3D, sozinho no escuro, com cada distrito na cor e na altura do seu nível de aviso; por cima, um painel de vidro com o título em português simples ("Aviso amarelo em 6 distritos."), a hora e uma linha por tema. Ao descer, a câmara viaja até cada tema: os avisos, os incêndios (colunas de luz), os sismos (anéis) e o risco de incêndio (os distritos mudam de cor e de altura). Apontar um distrito levanta-o e mostra o seu resumo; no fim, todos os distritos. Os Açores e a Madeira têm a sua caixa no mar. Sem WebGL, fica o mapa plano.
- **Uma página por tema**, para não ter tudo numa só página: `/avisos`, `/incendios`, `/sismos` e `/risco` (risco de incêndio e qualidade do ar). Cada uma abre com um mapa detalhado só com esse tema e, por baixo, a lista; em ecrãs largos, mapa e lista ficam lado a lado, com o mapa sempre à vista.
- **Páginas por distrito** (18 distritos + Açores + Madeira), com a mesma divisão:
  - `/lisboa`: o boletim do distrito e a previsão a 5 dias.
  - `/lisboa/avisos`, `/lisboa/incendios`, `/lisboa/sismos` e `/lisboa/risco` (risco de incêndio por concelho, hoje e amanhã, qualidade do ar e UV), com o mapa enquadrado no distrito.
  - O menu do cabeçalho acompanha o distrito, e o seletor mantém o tema ao mudar de sítio (de `/lisboa/avisos` para `/porto/avisos`).
- **Mapa detalhado** (MapLibre + OpenFreeMap) com 5 camadas: avisos por distrito, incêndios, sismos, risco de incêndio por concelho e qualidade do ar. Cada página mostra só a camada do seu tema (na página do risco escolhe-se entre risco de incêndio e qualidade do ar), com a legenda dessa camada. Nas páginas de distrito, o mapa mostra só o que é do distrito, esbate o resto do país e tem uma ligação para o mesmo tema em todo o país. No risco de incêndio, escolhe-se hoje ou amanhã. Liga-se às listas: "Ver no mapa" enquadra o evento, um clique no mapa mostra o detalhe e um segundo clique no mesmo sítio tira a seleção e volta à vista geral.
- **Design "mission control":** fundo escuro (o tema da casa; há um tema claro "Dia" no cabeçalho), painéis de vidro, letra Geist na interface, Geist Mono nas horas e etiquetas e Atkinson Hyperlegible Next no texto. Motion design 3D: cada página entra uma vez e depois fica quieta; a câmara só se move com o scroll, o rato ou uma escolha. As páginas passam umas às outras em profundidade e os itens das listas entram ao chegar ao ecrã. Nada anda em loop; com "reduzir movimento", tudo aparece no estado final.
- **Mapas dos temas em 3D** (sismos, incêndios e risco de incêndio), que abrem já nessa vista, com uma entrada de câmara; o botão "Mapa" volta ao 2D:
  - **Sismos, "Profundidade":** um bloco de crosta da região, com o nível do mar translúcido, os distritos e cada sismo à sua profundidade, por baixo do epicentro (profundidade exagerada 3×). Feito com three e @react-three/fiber. Na entrada, a câmara desce de cima e cada sismo afunda até à sua profundidade. Roda-se com o rato, o dedo (na horizontal), os botões ou as setas; aproxima-se com Ctrl/⌘ e a roda, dois dedos ou + e −.
  - **Incêndios, "Relevo 3D":** o relevo da Mapterhorn (exagerado 2×) com sombreado, o mapa inclinado e os incêndios assentes no terreno.
  - **Risco, "Risco em altura":** cada concelho com uma altura que repete a classe de risco.
  - Cada legenda diz o que exagera. A seleção, "Ver no mapa" e o painel de detalhe funcionam como no 2D. Sem WebGL, o botão 3D fica desativado e o mapa 2D continua; depois da entrada, a câmara só se move quando a pessoa a move ou escolhe um evento (e salta, sem animação, com "reduzir movimento").
- **Português e inglês:** o português fica na raiz (`/`, `/lisboa`) e o inglês em `/en` (`/en`, `/en/lisboa`). O botão PT | EN leva à mesma página no outro idioma. Os textos que vêm das fontes (descrições dos avisos, nomes de locais) ficam em português, como publicados; o vocabulário fixo (tipos de aviso, estado dos incêndios, classes de qualidade do ar) é traduzido.
- **Perto de mim:** a localização é convertida em distrito **no próprio dispositivo** (ponto-em-polígono com os limites da CAOP). Nada é enviado ao servidor.
- **Resiliência:** se uma fonte falhar, o site mostra os últimos dados obtidos, assinalados como desatualizados. Nunca fica em branco.
- **Histórico dos últimos 7 dias:** na página dos avisos, uma faixa por distrito com o nível ao longo de 24 h ou 7 dias e o tempo em cada nível por extenso; na página dos incêndios, o número de incêndios ativos. Registado de 10 em 10 min no Redis pelo tick (ver "Tarefas agendadas").
- **Notificações de avisos** (web push) na página de avisos de cada distrito: a pessoa escolhe o nível a partir do qual quer ser avisada e recebe uma notificação quando o nível do distrito sobe até lá. Guarda-se só o endereço técnico de notificação, os distritos e o nível (ver /privacidade).
- **RSS dos avisos:** `/avisos/rss` e `/lisboa/avisos/rss` (e `/en/...`), um item por aviso e janela de tempo, com horas absolutas.
- **Funciona sem rede** (PWA com service worker): mostra os últimos dados guardados.
- **Imagens de partilha dinâmicas**, em cada idioma: ao partilhar um link no WhatsApp ou no LinkedIn, a pré-visualização mostra o estado atual e a hora dos dados, com o logótipo e as letras do site (TTF em `assets/fonts`, licença OFL).
- **Qualquer ecrã:** testado de 320 px (telemóveis pequenos) a 1920 px, incluindo telemóvel na horizontal e tablet.
- **Acessibilidade:** WCAG 2.2 AA verificado com axe. Letra Atkinson Hyperlegible Next (desenhada para baixa visão), base de 18 px, níveis que nunca dependem só da cor (cor + ícone + palavra), alvos de toque de 44 px, tema claro/escuro/automático no cabeçalho e respeito por "reduzir movimento".
- **SEO:** cada página tem título e descrição próprios e indica a sua versão no outro idioma (`hreflang`); o sitemap inclui as duas línguas e a página inicial declara o site com dados estruturados (schema.org).

## Fontes de dados

| Dados                                  | Fonte                                                              | Atualização |
| -------------------------------------- | ------------------------------------------------------------------ | ----------- |
| Avisos meteorológicos                  | [IPMA](https://api.ipma.pt)                                        | 5 min       |
| Sismos (continente, Madeira, Açores)   | IPMA                                                               | 5 min       |
| Risco de incêndio rural por concelho   | IPMA (só continente)                                               | 1 h         |
| Índice UV e previsão a 5 dias          | IPMA                                                               | 1 h         |
| Incêndios ativos                       | [Fogos.pt](https://fogos.pt) (dados ANEPC), requer chave           | 2 min       |
| Qualidade do ar (estimativa de modelo) | [Open-Meteo](https://open-meteo.com) / Copernicus CAMS, CC BY 4.0  | 10 min      |
| Mapa base                              | [OpenFreeMap](https://openfreemap.org), © OpenStreetMap            | —           |
| Relevo (vista 3D dos incêndios)        | [Mapterhorn](https://mapterhorn.com) (DGT, IGP, Copernicus GLO-30) | —           |
| Limites de distritos e concelhos       | CAOP 2025, [DGT](https://www.dgterritorio.gov.pt), CC BY           | estático    |

A página `/fontes` explica cada fonte e como classificamos incêndios, sismos e qualidade do ar. O nível principal segue sempre a escala oficial do IPMA.

A página `/privacidade` descreve o que (não) é recolhido e `/sobre` explica o projeto. As três existem também em inglês (`/en/fontes`…).

## Stack

Next.js 16 (App Router, Cache Components, Turbopack), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Zod 4, SWR, MapLibre GL 6, three e @react-three/fiber 9 (cena da página inicial e dos distritos, carregada depois do primeiro desenho, e vista 3D dos sismos; sem descodificadores em WebAssembly), letras Geist e Atkinson Hyperlegible Next, Upstash Redis, Vitest, Playwright + axe-core. Alojamento na Vercel (região `cdg1`, Paris).

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

- **As páginas são pré-renderizadas** (inicial, 4 temas, 3 páginas de texto e as 5 páginas de cada um dos 20 distritos, em cada idioma) e revalidadas a cada minuto: carregam como estáticas e o browser atualiza os dados sozinho.
- **As APIs externas nunca são chamadas pelo browser.** O servidor agrega tudo, o que respeita os limites de cada fonte (uma chamada por período de cache, não uma por visitante).
- **As horas do IPMA são UTC sem sufixo** (confirmado no código do próprio site do IPMA) e são mostradas na hora local de cada região.

### Idiomas

Todas as páginas vivem em `app/[lang]/`, com um layout raiz por idioma. O `proxy.ts` reescreve os endereços sem prefixo para `/pt` (sem mudar o endereço no browser) e redireciona `/pt/...` para o endereço sem prefixo, para cada página ter um só endereço público.

- Todo o texto do site está em `lib/i18n/dictionaries.ts` (português e inglês); as frases com números são funções.
- `lib/i18n/terms.ts` traduz o vocabulário fixo que vem das fontes.
- O botão PT | EN é um `<a>` e não um `<Link>`: mudar de layout raiz obriga a carregar a página de novo.

### Estrutura

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

## Desenvolvimento

Requisitos: Node.js 22 (ver `.nvmrc`).

```bash
npm install                  # também copia o worker do MapLibre para public/maplibre
cp .env.example .env.local   # preencher CONTACT_EMAIL (e FOGOS_API_KEY quando existir)
npm run dev                  # http://localhost:3000 (inglês em /en)
```

Sem `FOGOS_API_KEY` a secção de incêndios mostra "indisponível" e remete para o fogos.pt. Sem Redis, os snapshots ficam em memória. O Redis aceita `KV_REST_API_URL`/`KV_REST_API_TOKEN` (criadas pela integração da Vercel) ou, em alternativa, `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`.

| Comando                             | O que faz                                       |
| ----------------------------------- | ----------------------------------------------- |
| `npm run dev`                       | servidor de desenvolvimento                     |
| `npm run check`                     | lint + tipos + formatação + testes unitários    |
| `npm test`                          | testes unitários (Vitest)                       |
| `npm run build && npm run test:e2e` | testes end-to-end e acessibilidade (Playwright) |
| `npm run format`                    | formata o código (Prettier)                     |

Na primeira vez que correres os testes e2e: `npx playwright install chromium`.

O CI (GitHub Actions) corre `npm run check`, o build e os testes e2e em cada push para `main` e em cada pull request. O Dependabot propõe atualizações das dependências todas as semanas (`.github/dependabot.yml`).

### Acrescentar ou mudar texto

Todo o texto do site está em `lib/i18n/dictionaries.ts`. Ao acrescentar uma frase, acrescenta-a nos dois idiomas: o tipo do dicionário inglês é o do português, por isso o TypeScript avisa se faltar alguma.

### Regenerar os limites administrativos

Os ficheiros em `public/geo/` foram gerados a partir dos GeoPackages oficiais da CAOP 2025 (DGT), simplificados com `geopandas` (tolerância de 400 m para os distritos, 150 m para as ilhas e 250 m para os concelhos). Quando sair uma nova CAOP, basta repetir o processo com os ficheiros novos e depois correr `node scripts/build-map-shapes.mjs`, que gera as formas do mapa do boletim e do logótipo (`data/map-shapes.ts`). Nos Açores, o script aproxima os três grupos de ilhas (encolhe o mar entre eles) para as ilhas caberem maiores na caixa; a mesma conversão é usada para pôr os sismos no sítio certo.

### Regenerar o índice do relevo

A Mapterhorn responde 404 aos tiles só de mar, e o browser mostra cada 404 como um erro na consola. Por isso o mapa só pede os tiles que existem, segundo `public/geo/relief-tiles.json` (os tiles com relevo à volta de Portugal, ao zoom 12, gerados a partir do índice de cobertura público da Mapterhorn), e usa um tile plano para o resto. Quando a Mapterhorn acrescentar fontes:

```bash
npm install --no-save pmtiles && node scripts/build-relief-index.mjs
```

## Deploy (Vercel)

1. Importar o repositório na Vercel (deteta Next.js automaticamente).
2. Adicionar **Upstash Redis** a partir do Vercel Marketplace (cria `KV_REST_API_URL` e `KV_REST_API_TOKEN`).
3. Variáveis de ambiente: `NEXT_PUBLIC_SITE_URL`, `CONTACT_EMAIL` e, quando chegar, `FOGOS_API_KEY`.
4. Em _Settings → Domains_, adicionar `portugalagora.pt` e `www.portugalagora.pt` e seguir as instruções de DNS no registo do domínio. Escolher um como principal (o outro redireciona) e usar **esse mesmo endereço** em `NEXT_PUBLIC_SITE_URL`: é o que aparece nos endereços canónicos, no sitemap e no `robots.txt`.
5. Confirmar em `https://portugalagora.pt/api/health` e `https://portugalagora.pt/api/health/sources`.
6. Notificações e histórico: gerar as chaves com `npx web-push generate-vapid-keys` e um segredo longo; na Vercel, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e `CRON_SECRET` (produção) e um novo deploy; no GitHub, o secret `CRON_SECRET` (o mesmo valor) e a variável `TICK_ENABLED=true`.
7. As fontes são vigiadas pelo GitHub Actions (ver abaixo). Em alternativa, um monitor externo pode consultar `/api/health/sources`, que responde 503 quando uma fonte está em baixo ou com dados mais antigos do que o seu limite (`lib/state/health.ts`).
8. No [Google Search Console](https://search.google.com/search-console), validar o domínio e submeter o `sitemap.xml`.

## Tarefas agendadas (GitHub Actions)

O repositório é público, por isso os workflows agendados não têm custo. Os cron da Vercel no plano Hobby só correm uma vez por dia.

- **Tick** (`.github/workflows/tick.yml`, de 10 em 10 min): chama `/api/cron/tick` com o `CRON_SECRET`. Guarda um ponto do histórico e envia as notificações quando o nível de um distrito sobe. Só corre com a variável `TICK_ENABLED=true`.
- **Vigiar as fontes** (`.github/workflows/sources.yml`, de 15 em 15 min): se `/api/health/sources` falhar em duas verificações seguidas, abre uma issue com a etiqueta `fonte-em-baixo` (email para o dono do repositório); quando tudo volta ao normal, fecha-a.
- **Aquecer a cache** (`.github/workflows/warm-cache.yml`, depois de cada deploy de produção): visita as páginas do sitemap e as imagens de partilha, para a CDN não entregar o HTML do build com os dados da hora do deploy.

## Licença

Código: MIT. Os dados pertencem às respetivas fontes e seguem os seus termos de utilização.
