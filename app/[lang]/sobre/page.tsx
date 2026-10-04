import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProsePage } from "@/components/layout/prose-page";
import { site } from "@/lib/config/site";
import { isLocale } from "@/lib/i18n/locales";
import { alternates } from "@/lib/i18n/metadata";

export async function generateMetadata(props: PageProps<"/[lang]/sobre">): Promise<Metadata> {
  const { lang } = await props.params;
  if (!isLocale(lang)) return {};
  return {
    title: lang === "en" ? "About the project" : "Sobre o projeto",
    alternates: alternates(lang, "/sobre"),
  };
}

export default async function SobrePage(props: PageProps<"/[lang]/sobre">) {
  const { lang } = await props.params;
  if (!isLocale(lang)) notFound();
  return lang === "en" ? <English /> : <Portuguese />;
}

function Portuguese() {
  return (
    <ProsePage
      title="Sobre o projeto"
      intro="Uma resposta rápida à pergunta “está tudo bem no meu distrito?”, com dados oficiais, num site que qualquer pessoa consegue usar."
    >
      <p>
        O Portugal Agora junta num só sítio os avisos meteorológicos e os sismos do IPMA, os
        incêndios ativos do Fogos.pt, o risco de incêndio por concelho e a qualidade do ar. Foi
        desenhado para ser lido com facilidade em qualquer idade: letra grande, linguagem simples e
        níveis que nunca dependem só da cor.
      </p>
      <p>
        É um projeto pessoal, sem fins lucrativos, sem publicidade e sem donativos. O código é
        aberto e está disponível no{" "}
        <a href={site.repo} rel="noopener">
          GitHub
        </a>
        .
      </p>
      <h2>Tecnologia</h2>
      <p>
        Next.js, TypeScript e Tailwind CSS, com mapa em MapLibre. Os dados são obtidos no servidor,
        validados, guardados em cache e atualizados a cada minuto no seu ecrã. Se uma fonte falhar,
        o site continua a funcionar com os últimos dados conhecidos.
      </p>
      <h2>Contacto</h2>
      <p>
        Encontrou um erro ou tem uma sugestão? Abra uma questão no{" "}
        <a href={`${site.repo}/issues`} rel="noopener">
          GitHub
        </a>
        .
      </p>
    </ProsePage>
  );
}

function English() {
  return (
    <ProsePage
      title="About the project"
      intro="A quick answer to the question “is everything all right in my district?”, with official data, on a site anyone can use."
    >
      <p>
        Portugal Agora brings together, in one place, IPMA weather warnings and earthquakes, active
        wildfires from Fogos.pt, wildfire risk by municipality and air quality. It is designed to be
        easy to read at any age: large type, plain language and levels that never rely on colour
        alone.
      </p>
      <p>
        It is a personal, non-profit project, with no ads and no donations. The code is open and
        available on{" "}
        <a href={site.repo} rel="noopener">
          GitHub
        </a>
        .
      </p>
      <h2>Technology</h2>
      <p>
        Next.js, TypeScript and Tailwind CSS, with maps in MapLibre. Data is fetched on the server,
        validated, cached and refreshed on your screen every minute. If a source fails, the site
        keeps working with the last known data.
      </p>
      <h2>Contact</h2>
      <p>
        Found a mistake or have a suggestion? Open an issue on{" "}
        <a href={`${site.repo}/issues`} rel="noopener">
          GitHub
        </a>
        .
      </p>
    </ProsePage>
  );
}
