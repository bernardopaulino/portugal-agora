import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProsePage } from "@/components/layout/prose-page";
import { isLocale } from "@/lib/i18n/locales";
import { alternates } from "@/lib/i18n/metadata";

export async function generateMetadata(props: PageProps<"/[lang]/privacidade">): Promise<Metadata> {
  const { lang } = await props.params;
  if (!isLocale(lang)) return {};
  return {
    title: lang === "en" ? "Privacy" : "Privacidade",
    alternates: alternates(lang, "/privacidade"),
  };
}

export default async function PrivacidadePage(props: PageProps<"/[lang]/privacidade">) {
  const { lang } = await props.params;
  if (!isLocale(lang)) notFound();
  return lang === "en" ? <English /> : <Portuguese />;
}

function Portuguese() {
  return (
    <ProsePage title="Privacidade" intro="Não recolhemos dados pessoais.">
      <ul>
        <li>Não há contas, formulários, publicidade nem cookies.</li>
        <li>Não usamos serviços de estatística de terceiros.</li>
        <li>
          O botão “Perto de mim” pede a localização ao seu dispositivo e calcula o distrito no
          próprio dispositivo. A localização nunca é enviada para o nosso servidor. Guardamos apenas
          o nome do distrito no seu navegador, para o mostrar da próxima vez; pode apagá-lo limpando
          os dados do site.
        </li>
        <li>
          A escolha de aspeto (claro, escuro ou automático) também fica guardada apenas no seu
          navegador.
        </li>
        <li>
          Os mapas são carregados do OpenFreeMap, que, como qualquer servidor, recebe o endereço IP
          do seu dispositivo para lhe enviar as imagens do mapa.
        </li>
      </ul>
    </ProsePage>
  );
}

function English() {
  return (
    <ProsePage title="Privacy" intro="We do not collect personal data.">
      <ul>
        <li>There are no accounts, forms, ads or cookies.</li>
        <li>We do not use third-party analytics.</li>
        <li>
          The “Near me” button asks your device for its location and works out the district on the
          device itself. Your location is never sent to our server. We only keep the district name
          in your browser, to show it next time; you can delete it by clearing the site&apos;s data.
        </li>
        <li>Your theme choice (light, dark or automatic) is also kept only in your browser.</li>
        <li>
          Maps are loaded from OpenFreeMap which, like any server, receives your device&apos;s IP
          address in order to send it the map images.
        </li>
      </ul>
    </ProsePage>
  );
}
