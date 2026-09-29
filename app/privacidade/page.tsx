import type { Metadata } from "next";

import { ProsePage } from "@/components/layout/prose-page";

export const metadata: Metadata = { title: "Privacidade" };

export default function PrivacidadePage() {
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
