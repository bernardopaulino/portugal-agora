/**
 * User-Agent identificável, exigido pelos termos do Fogos.pt e
 * boa prática para o IPMA: nome/versão, URL do projeto e contacto.
 */
export function buildUserAgent(options: { siteUrl: string; contactEmail?: string }): string {
  const contact = options.contactEmail ? `; ${options.contactEmail}` : "";
  return `PortugalAgora/1.0 (+${options.siteUrl}${contact})`;
}
