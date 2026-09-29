import type { Metadata } from "next";

import { ProsePage } from "@/components/layout/prose-page";
import { SeverityBadge } from "@/components/status/severity";

export const metadata: Metadata = {
  title: "Fontes e como lemos os dados",
  description:
    "De onde vêm os dados do Portugal Agora, de quanto em quanto tempo são atualizados e como são classificados.",
};

export default function FontesPage() {
  return (
    <ProsePage
      title="Fontes e como lemos os dados"
      intro="O Portugal Agora não produz informação: reúne dados públicos de entidades oficiais e mostra-os num só sítio, sempre com a fonte e a hora da última atualização."
    >
      <h2 id="niveis">O nível de aviso</h2>
      <p>
        A cor no topo de cada página segue o <strong>aviso meteorológico mais alto do IPMA</strong>{" "}
        em vigor ou previsto para os próximos três dias. Usamos a mesma escala do IPMA:
      </p>
      <ul className="!ml-0 [&>li]:!ml-0 [&>li]:!list-none">
        <li className="flex flex-wrap items-center gap-3">
          <SeverityBadge level="none" /> Sem avisos: não se prevê tempo perigoso.
        </li>
        <li className="flex flex-wrap items-center gap-3">
          <SeverityBadge level="yellow" /> Situação de risco para algumas atividades dependentes do
          tempo.
        </li>
        <li className="flex flex-wrap items-center gap-3">
          <SeverityBadge level="orange" /> Tempo perigoso, com risco moderado a elevado.
        </li>
        <li className="flex flex-wrap items-center gap-3">
          <SeverityBadge level="red" /> Tempo extremamente perigoso, com risco elevado.
        </li>
        <li className="flex flex-wrap items-center gap-3">
          <SeverityBadge level="unknown" /> Não conseguimos obter os dados do IPMA neste momento.
        </li>
      </ul>
      <p>
        Para incêndios, sismos e qualidade do ar usamos as mesmas cores para facilitar a leitura,
        mas a classificação é nossa, explicada abaixo. Não são avisos oficiais.
      </p>

      <h2>Avisos meteorológicos, sismos, risco de incêndio, UV e previsão</h2>
      <p>
        Fonte:{" "}
        <a href="https://www.ipma.pt" rel="noopener">
          IPMA, Instituto Português do Mar e da Atmosfera
        </a>
        , através da sua{" "}
        <a href="https://api.ipma.pt" rel="noopener">
          API de dados abertos
        </a>
        .
      </p>
      <ul>
        <li>
          Avisos: consultados a cada 5 minutos. As horas do IPMA são UTC e mostramo-las na hora
          local (nos Açores, na hora dos Açores).
        </li>
        <li>
          Sismos: consultados a cada 5 minutos. Listamos os dos últimos 7 dias com magnitude 2 ou
          superior, e todos os que foram sentidos.
        </li>
        <li>
          Risco de incêndio rural por concelho (hoje e amanhã), índice UV e previsão a 5 dias:
          consultados de hora a hora.
        </li>
      </ul>
      <h3>Como classificamos os sismos</h3>
      <p>
        Magnitude 5,5 ou mais: vermelho. De 4,5 a 5,4: laranja. De 3,5 a 4,4, ou qualquer sismo
        sentido: amarelo. Abaixo disso: sem destaque.
      </p>

      <h2>Incêndios</h2>
      <p>
        Fonte:{" "}
        <a href="https://fogos.pt" rel="noopener">
          Fogos.pt
        </a>
        , que reúne as ocorrências da ANEPC. Consultado a cada 2 minutos.
      </p>
      <h3>Como classificamos os incêndios</h3>
      <p>
        Em despacho, em curso ou com chegada dos meios ao local: laranja. Em resolução: amarelo. Em
        conclusão ou vigilância: sem destaque. Ocorrências que a ANEPC assinala como importantes:
        vermelho.
      </p>

      <h2>Qualidade do ar</h2>
      <p>
        Fonte:{" "}
        <a href="https://open-meteo.com" rel="noopener">
          Open-Meteo
        </a>
        , com dados do serviço europeu{" "}
        <a href="https://atmosphere.copernicus.eu" rel="noopener">
          Copernicus CAMS
        </a>{" "}
        (licença CC BY 4.0). Consultado a cada 10 minutos.
      </p>
      <p>
        É uma <strong>estimativa de modelo</strong> para a capital de cada distrito, não uma medição
        de estação. Usamos o Índice Europeu de Qualidade do Ar: boa ou razoável, sem destaque;
        moderada, amarelo; fraca, laranja; muito fraca ou pior, vermelho.
      </p>

      <h2>Mapa e limites administrativos</h2>
      <p>
        Mapa base:{" "}
        <a href="https://openfreemap.org" rel="noopener">
          OpenFreeMap
        </a>
        , com dados ©{" "}
        <a href="https://www.openstreetmap.org/copyright" rel="noopener">
          OpenStreetMap
        </a>{" "}
        e OpenMapTiles. Limites de distritos e concelhos: Carta Administrativa Oficial de Portugal
        (CAOP 2025), da{" "}
        <a href="https://www.dgterritorio.gov.pt" rel="noopener">
          Direção-Geral do Território
        </a>
        , licença CC BY.
      </p>

      <h2>Quando uma fonte falha</h2>
      <p>
        Se uma fonte deixar de responder, continuamos a mostrar os últimos dados obtidos,
        assinalados como desatualizados e com a hora a que foram recolhidos. Se não houver dados
        guardados, dizemo-lo claramente e indicamos onde consultar a informação.
      </p>

      <h2>Limites deste site</h2>
      <p>
        Os dados podem ter atrasos ou erros das próprias fontes. Este site não deve ser usado como
        fonte única em situações de emergência. <strong>Em emergência, ligue 112</strong> e siga as
        indicações da{" "}
        <a href="https://prociv.gov.pt" rel="noopener">
          Proteção Civil
        </a>
        .
      </p>
    </ProsePage>
  );
}
