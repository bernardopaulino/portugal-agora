import { NextResponse, type NextRequest } from "next/server";

/**
 * Idiomas: o português vive na raiz (/, /lisboa) e o inglês em /en.
 * As páginas estão todas em app/[lang]/, por isso os endereços sem
 * prefixo são reescritos para /pt internamente (o endereço no browser
 * não muda). /pt/... redireciona para o endereço sem prefixo, para cada
 * página ter um só endereço público.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/en" || pathname.startsWith("/en/")) return NextResponse.next();

  if (pathname === "/pt" || pathname.startsWith("/pt/")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.redirect(url, 308);
  }

  const url = request.nextUrl.clone();
  url.pathname = `/pt${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Tudo menos a API, os ficheiros internos do Next, os metadados na raiz
  // (sitemap, robots, manifesto, ícones) e qualquer ficheiro com extensão.
  matcher: [
    "/((?!api/|_next/|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|icon|apple-icon|favicon\\.ico|.*\\..*).*)",
  ],
};
