import { NextResponse, type NextRequest } from "next/server";

import { isKnownPage } from "@/lib/routes";

/**
 * Ficheiros de public/ e metadados na raiz: seguem sem passar pelas páginas.
 * Qualquer outro endereço com extensão (/wp-login.php, /.env…) é um 404.
 */
const PUBLIC_FILE =
  /^\/(?:(?:geo|icons|maplibre|fontes)\/[\w.-]+|sw\.js|sitemap\.xml|robots\.txt|manifest\.webmanifest|icon\.svg|apple-icon\.png|favicon\.ico)$/;

/**
 * A página 404 de cada idioma é sempre esta (um distrito que não existe):
 * gera-se uma vez e fica em cache, em vez de uma página nova (e uma "ISR
 * write" da Vercel) por cada endereço inventado. Ver isKnownPage.
 */
function notFound(request: NextRequest, locale: "pt" | "en") {
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}/404`;
  url.search = "";
  return NextResponse.rewrite(url);
}

/**
 * Idiomas: o português vive na raiz (/, /lisboa) e o inglês em /en.
 * As páginas estão todas em app/[lang]/, por isso os endereços sem
 * prefixo são reescritos para /pt internamente (o endereço no browser
 * não muda). /pt/... redireciona para o endereço sem prefixo, para cada
 * página ter um só endereço público.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_FILE.test(pathname)) return NextResponse.next();

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return isKnownPage(pathname.slice(3) || "/") ? NextResponse.next() : notFound(request, "en");
  }

  // As imagens de partilha (opengraph-image) são servidas no endereço que o
  // Next lhes dá (/pt/...): um redirecionamento aqui fazia alguns serviços
  // (WhatsApp, Facebook) mostrarem a pré-visualização sem imagem.
  if (pathname.startsWith("/pt/") && pathname.endsWith("/opengraph-image")) {
    return isKnownPage(pathname.slice(3)) ? NextResponse.next() : notFound(request, "pt");
  }

  if (pathname === "/pt" || pathname.startsWith("/pt/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  if (!isKnownPage(pathname)) return notFound(request, "pt");

  const url = request.nextUrl.clone();
  url.pathname = `/pt${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Tudo menos a API e os ficheiros internos do Next. Os endereços com
  // extensão também passam por aqui: sem isso, /wp-login.php chegava às
  // páginas como /[lang] e era gerado e guardado como ISR.
  matcher: ["/((?!api/|_next/).*)"],
};
