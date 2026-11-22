import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProsePage } from "@/components/layout/prose-page";
import { site } from "@/lib/config/site";
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
          Guardamos apenas o nome do concelho e do distrito no seu navegador, para os mostrar da
          próxima vez na página inicial; pode apagá-los limpando os dados do site.
        </li>
        <li>
          A escolha de aspeto (claro, escuro ou automático) também fica guardada apenas no seu
          navegador.
        </li>
        <li>
          As notificações de avisos são opcionais. Se as ativar, o seu navegador cria um endereço
          técnico de notificação (do serviço de push do Google, da Mozilla ou da Apple, consoante o
          navegador) e guardamos esse endereço, os distritos e o nível que escolheu, e se quer
          também incêndios importantes e sismos sentidos, só para lhe enviar essas notificações. Não
          fica associado a nome, email nem localização. A mesma escolha fica também no seu
          navegador, para a página saber se as notificações estão ativas. Ao desativar as
          notificações, apagamos esse registo; o mesmo acontece quando o serviço de push nos diz que
          o endereço deixou de existir.
        </li>
        <li>
          Os mapas são carregados do OpenFreeMap e, na vista 3D dos incêndios, o relevo vem da
          Mapterhorn. Como qualquer servidor, ambos recebem o endereço IP do seu dispositivo para
          lhe enviar as imagens do mapa.
        </li>
      </ul>
      <h2>Responsável e contacto</h2>
      <p>
        O site é mantido por {site.author}, a título pessoal. Para dúvidas sobre privacidade ou para
        exercer os seus direitos (acesso, retificação, apagamento), abra uma questão no{" "}
        <a href={`${site.repo}/issues`} rel="noopener">
          GitHub
        </a>
        . Também pode apresentar reclamação à Comissão Nacional de Proteção de Dados (
        <a href="https://www.cnpd.pt" rel="noopener">
          CNPD
        </a>
        ).
      </p>
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
          municipality and district names in your browser, to show them on the home page next time;
          you can delete them by clearing the site&apos;s data.
        </li>
        <li>Your theme choice (light, dark or automatic) is also kept only in your browser.</li>
        <li>
          Warning notifications are optional. If you turn them on, your browser creates a technical
          notification address (from Google&apos;s, Mozilla&apos;s or Apple&apos;s push service,
          depending on the browser) and we store that address, the districts and the level you
          chose, and whether you also want major wildfires and felt earthquakes, only to send you
          those notifications. It is not linked to a name, email or location. The same choice is
          also kept in your browser, so the page knows whether notifications are on. Turning
          notifications off deletes that record; so does the push service telling us the address no
          longer exists.
        </li>
        <li>
          Maps are loaded from OpenFreeMap and, in the 3D wildfire view, the terrain comes from
          Mapterhorn. Like any server, both receive your device&apos;s IP address in order to send
          it the map images.
        </li>
      </ul>
      <h2>Controller and contact</h2>
      <p>
        The site is run by {site.author} in a personal capacity. For privacy questions or to
        exercise your rights (access, correction, erasure), open an issue on{" "}
        <a href={`${site.repo}/issues`} rel="noopener">
          GitHub
        </a>
        . You can also lodge a complaint with the Portuguese data protection authority (
        <a href="https://www.cnpd.pt/en/" rel="noopener">
          CNPD
        </a>
        ).
      </p>
    </ProsePage>
  );
}
