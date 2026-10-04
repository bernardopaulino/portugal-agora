import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProsePage } from "@/components/layout/prose-page";
import { SeverityBadge } from "@/components/status/severity";
import { isLocale } from "@/lib/i18n/locales";
import { alternates } from "@/lib/i18n/metadata";

export async function generateMetadata(props: PageProps<"/[lang]/fontes">): Promise<Metadata> {
  const { lang } = await props.params;
  if (!isLocale(lang)) return {};
  return {
    ...(lang === "en"
      ? {
          title: "Sources and how we read the data",
          description:
            "Where Portugal Agora gets its data, how often it is updated and how it is classified.",
        }
      : {
          title: "Fontes e como lemos os dados",
          description:
            "De onde vêm os dados do Portugal Agora, de quanto em quanto tempo são atualizados e como são classificados.",
        }),
    alternates: alternates(lang, "/fontes"),
  };
}

export default async function FontesPage(props: PageProps<"/[lang]/fontes">) {
  const { lang } = await props.params;
  if (!isLocale(lang)) notFound();
  return lang === "en" ? <English /> : <Portuguese />;
}

function Portuguese() {
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

function English() {
  return (
    <ProsePage
      title="Sources and how we read the data"
      intro="Portugal Agora doesn't produce information: it gathers public data from official bodies and shows it in one place, always with the source and the time of the last update."
    >
      <h2 id="niveis">The warning level</h2>
      <p>
        The colour at the top of each page follows the <strong>highest IPMA weather warning</strong>{" "}
        in force or forecast for the next three days. We use the same scale as IPMA:
      </p>
      <ul className="!ml-0 [&>li]:!ml-0 [&>li]:!list-none">
        <li className="flex flex-wrap items-center gap-3">
          <SeverityBadge level="none" /> No warnings: no dangerous weather is expected.
        </li>
        <li className="flex flex-wrap items-center gap-3">
          <SeverityBadge level="yellow" /> A risk for some weather-dependent activities.
        </li>
        <li className="flex flex-wrap items-center gap-3">
          <SeverityBadge level="orange" /> Dangerous weather, with moderate to high risk.
        </li>
        <li className="flex flex-wrap items-center gap-3">
          <SeverityBadge level="red" /> Extremely dangerous weather, with high risk.
        </li>
        <li className="flex flex-wrap items-center gap-3">
          <SeverityBadge level="unknown" /> We can&apos;t get IPMA&apos;s data right now.
        </li>
      </ul>
      <p>
        For wildfires, earthquakes and air quality we use the same colours to make reading easier,
        but the classification is ours, explained below. They are not official warnings.
      </p>

      <h2>Language</h2>
      <p>
        The English version translates everything the site writes. Texts that come from the sources
        (IPMA warning descriptions, place names, earthquake locations) are shown as published, in
        Portuguese, except for a fixed vocabulary we translate (warning types, wildfire status, air
        quality classes).
      </p>

      <h2>Weather warnings, earthquakes, wildfire risk, UV and forecast</h2>
      <p>
        Source:{" "}
        <a href="https://www.ipma.pt" rel="noopener">
          IPMA, the Portuguese Institute for Sea and Atmosphere
        </a>
        , through its{" "}
        <a href="https://api.ipma.pt" rel="noopener">
          open data API
        </a>
        .
      </p>
      <ul>
        <li>
          Warnings: checked every 5 minutes. IPMA times are in UTC and we show them in local time
          (Azores time in the Azores).
        </li>
        <li>
          Earthquakes: checked every 5 minutes. We list those from the last 7 days with magnitude 2
          or more, and every one that was felt.
        </li>
        <li>
          Rural wildfire risk by municipality (today and tomorrow), UV index and 5-day forecast:
          checked every hour.
        </li>
      </ul>
      <h3>How we classify earthquakes</h3>
      <p>
        Magnitude 5.5 or more: red. 4.5 to 5.4: orange. 3.5 to 4.4, or any felt earthquake: yellow.
        Below that: not highlighted.
      </p>

      <h2>Wildfires</h2>
      <p>
        Source:{" "}
        <a href="https://fogos.pt" rel="noopener">
          Fogos.pt
        </a>
        , which gathers incidents from ANEPC (Civil Protection). Checked every 2 minutes.
      </p>
      <h3>How we classify wildfires</h3>
      <p>
        Dispatched, in progress or with crews on site: orange. Being resolved: yellow. Concluding or
        under watch: not highlighted. Incidents that ANEPC flags as important: red.
      </p>

      <h2>Air quality</h2>
      <p>
        Source:{" "}
        <a href="https://open-meteo.com" rel="noopener">
          Open-Meteo
        </a>
        , with data from the European{" "}
        <a href="https://atmosphere.copernicus.eu" rel="noopener">
          Copernicus CAMS
        </a>{" "}
        service (CC BY 4.0 licence). Checked every 10 minutes.
      </p>
      <p>
        It is a <strong>model estimate</strong> for each district capital, not a station
        measurement. We use the European Air Quality Index: good or fair, not highlighted; moderate,
        yellow; poor, orange; very poor or worse, red.
      </p>

      <h2>Map and administrative boundaries</h2>
      <p>
        Base map:{" "}
        <a href="https://openfreemap.org" rel="noopener">
          OpenFreeMap
        </a>
        , with data ©{" "}
        <a href="https://www.openstreetmap.org/copyright" rel="noopener">
          OpenStreetMap
        </a>{" "}
        and OpenMapTiles. District and municipality boundaries: Official Administrative Map of
        Portugal (CAOP 2025), from the{" "}
        <a href="https://www.dgterritorio.gov.pt" rel="noopener">
          Directorate-General for Territory
        </a>
        , CC BY licence.
      </p>

      <h2>When a source fails</h2>
      <p>
        If a source stops responding, we keep showing the last data we got, marked as out of date
        and with the time it was collected. If there is no saved data, we say so clearly and point
        to where you can find the information.
      </p>

      <h2>Limits of this site</h2>
      <p>
        Data may carry delays or errors from the sources themselves. This site should not be your
        only source in an emergency. <strong>In an emergency, call 112</strong> and follow the
        instructions of{" "}
        <a href="https://prociv.gov.pt" rel="noopener">
          Civil Protection
        </a>
        .
      </p>
    </ProsePage>
  );
}
