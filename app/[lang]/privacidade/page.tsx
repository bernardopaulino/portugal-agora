import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProsePage } from "@/components/layout/prose-page";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { inheritedOgImage, pageMetadata } from "@/lib/i18n/metadata";

export async function generateMetadata(props: PageProps<"/[lang]/privacidade">): Promise<Metadata> {
  const { lang } = await props.params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang);
  return pageMetadata({
    locale: lang,
    path: "/privacidade",
    title: t.meta.privacyTitle,
    description: t.meta.privacyDescription,
    image: inheritedOgImage(lang, t.site.ogAlt),
  });
}

export default async function PrivacidadePage(props: PageProps<"/[lang]/privacidade">) {
  const { lang } = await props.params;
  if (!isLocale(lang)) notFound();
  return lang === "en" ? <English /> : <Portuguese />;
}

function Portuguese() {
  return (
    <ProsePage
      title="Privacidade"
      intro="Não recolhemos dados pessoais. A única coisa guardada no servidor, e só se a pedir, é o endereço técnico das notificações."
    >
      <ul>
        <li>Não há contas, formulários, publicidade nem cookies.</li>
        <li>Não usamos serviços de estatística de terceiros.</li>
        <li>
          O botão “Perto de mim” pede a localização ao seu dispositivo e calcula o concelho e o
          distrito no próprio dispositivo. A localização nunca é enviada para o nosso servidor.
          Guardamos apenas o nome do distrito no seu navegador, para o mostrar da próxima vez; pode
          apagá-lo limpando os dados do site.
        </li>
        <li>
          A escolha de aspeto (claro, escuro ou automático) também fica guardada apenas no seu
          navegador.
        </li>
        <li>
          As notificações de avisos são opcionais. Se as ativar, o seu navegador cria um endereço
          técnico de notificação (do serviço de push do Google, da Mozilla ou da Apple, consoante o
          navegador) e guardamos esse endereço, os distritos e o nível que escolheu, só para lhe
          enviar os avisos. Não fica associado a nome, email nem localização. Ao desativar as
          notificações, apagamos esse registo; o mesmo acontece quando o serviço de push nos diz que
          o endereço deixou de existir.
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
    <ProsePage
      title="Privacy"
      intro="We do not collect personal data. The only thing stored on the server, and only if you ask for it, is the technical address for notifications."
    >
      <ul>
        <li>There are no accounts, forms, ads or cookies.</li>
        <li>We do not use third-party analytics.</li>
        <li>
          The “Near me” button asks your device for its location and works out the municipality and
          district on the device itself. Your location is never sent to our server. We only keep the
          district name in your browser, to show it next time; you can delete it by clearing the
          site&apos;s data.
        </li>
        <li>Your theme choice (light, dark or automatic) is also kept only in your browser.</li>
        <li>
          Warning notifications are optional. If you turn them on, your browser creates a technical
          notification address (from Google&apos;s, Mozilla&apos;s or Apple&apos;s push service,
          depending on the browser) and we store that address, the districts and the level you
          chose, only to send you the warnings. It is not linked to a name, email or location.
          Turning notifications off deletes that record; so does the push service telling us the
          address no longer exists.
        </li>
        <li>
          Maps are loaded from OpenFreeMap which, like any server, receives your device&apos;s IP
          address in order to send it the map images.
        </li>
      </ul>
    </ProsePage>
  );
}
