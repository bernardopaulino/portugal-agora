# Operação

Pôr o site em produção na Vercel e as tarefas que o mantêm vivo.

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

**ISR writes (limite do plano Hobby).** A Vercel conta as renovações das páginas em unidades de 8 KB. Por isso: `/api/state`, `/api/weather` e os feeds RSS são gerados a pedido e guardados na CDN (não contam); as páginas renovam-se no máximo de 15 em 15 min e só quando alguém as visita; o tempo observado e o mar não vão no HTML das páginas; cada página de tema só leva os dados do seu tema; o cabeçalho tira o nível do país no browser, para as páginas sem dados (fontes, sobre, concelhos) serem estáticas.

O repositório é público, por isso os workflows agendados não têm custo. Os cron da Vercel no plano Hobby só correm uma vez por dia.

- **Tick** (histórico e notificações, `lib/cron/tick.ts`): corre no próprio site, depois de responder a `/api/state` (que o browser pede de minuto a minuto), no máximo uma vez a cada 9 min (cadeado no Redis). Os agendamentos do GitHub não são fiáveis (atrasam ou nem correm), por isso `.github/workflows/tick.yml` (de 10 em 10 min, com o `CRON_SECRET` e `TICK_ENABLED=true`) fica só como reforço para quando ninguém tem o site aberto.
- **Vigiar as fontes** (`.github/workflows/sources.yml`, de 15 em 15 min): se `/api/health/sources` falhar em duas verificações seguidas, abre uma issue com a etiqueta `fonte-em-baixo` (email para o dono do repositório); quando tudo volta ao normal, fecha-a.
- **Aquecer a cache** (`.github/workflows/warm-cache.yml`, só à mão): visita as páginas do sitemap e as imagens de partilha para a CDN deixar de servir versões antigas. Não corre sozinha porque cada passagem custa ~300 renovações ISR.
