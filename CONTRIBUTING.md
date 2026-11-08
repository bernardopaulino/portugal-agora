# Contribuir

Obrigado por querer ajudar. O Portugal Agora é um projeto pequeno e sem fins lucrativos; issues e pull requests são bem-vindos.

## Antes de começar

- **Sem monetização.** Nada de publicidade, donativos, afiliados ou rastreio: é uma condição dos termos do Fogos.pt e do IPMA.
- **Dados oficiais.** O nível principal segue sempre a escala do IPMA, e cada número mostra de onde vem e de quando é.
- **Para toda a gente.** Cada mudança na interface tem de manter o WCAG 2.2 AA, funcionar de 320 px a 1920 px, respeitar "reduzir movimento" e não depender só da cor.
- **Português de Portugal** no código, nos commits e na documentação. Todo o texto do site está em `lib/i18n/dictionaries.ts` e cada frase nova vai nos dois idiomas (o TypeScript avisa se faltar).

## Como

1. Siga a secção [Desenvolvimento](README.md#desenvolvimento) do README para pôr o site a correr.
2. Faça a mudança num ramo e acrescente testes quando fizer sentido (`tests/unit` com Vitest, `tests/e2e` com Playwright).
3. Antes de abrir o pull request, corra:

   ```bash
   npm run check
   npm run build && npm run test:e2e
   ```

4. Descreva no pull request o que muda para quem usa o site e, se mexer na interface, junte uma captura no telemóvel e no computador.

A organização do código está em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).
