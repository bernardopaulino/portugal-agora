import type { Metadata } from "next";

import { ProsePage } from "@/components/layout/prose-page";
import { site } from "@/lib/config/site";

export const metadata: Metadata = { title: "Sobre o projeto" };

export default function SobrePage() {
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
