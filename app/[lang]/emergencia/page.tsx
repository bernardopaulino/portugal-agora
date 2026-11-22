import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProsePage } from "@/components/layout/prose-page";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { isLocale } from "@/lib/i18n/locales";
import { inheritedOgImage, pageMetadata } from "@/lib/i18n/metadata";

/*
 * "Em caso de emergência": os contactos e o que fazer em cada perigo, para os
 * dias maus (aviso vermelho, incêndio grande, sismo sentido). Página
 * estática: sem dados, nada a renovar. Os conselhos seguem as recomendações
 * gerais da Proteção Civil e da DGS, em linguagem simples; as autoridades
 * têm sempre a última palavra.
 */

export async function generateMetadata(props: PageProps<"/[lang]/emergencia">): Promise<Metadata> {
  const { lang } = await props.params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang);
  return pageMetadata({
    locale: lang,
    path: "/emergencia",
    title: t.meta.emergencyTitle,
    description: t.meta.emergencyDescription,
    image: inheritedOgImage(lang, t.site.ogAlt),
  });
}

export default async function EmergenciaPage(props: PageProps<"/[lang]/emergencia">) {
  const { lang } = await props.params;
  if (!isLocale(lang)) notFound();
  return lang === "en" ? <English /> : <Portuguese />;
}

const tel = (number: string) => `tel:${number.replace(/\s/g, "")}`;

function Contacts({ en }: { en: boolean }) {
  return (
    <ul>
      <li>
        <strong>
          <a href={tel("112")}>112</a>
        </strong>
        {en
          ? ": emergencies (fire service, ambulance, police). Free, even without credit."
          : ": emergência (bombeiros, emergência médica, polícia). Gratuito, mesmo sem saldo."}
      </li>
      <li>
        <strong>
          <a href={tel("808 24 24 24")}>SNS 24: 808 24 24 24</a>
        </strong>
        {en
          ? ": health advice (National Health Service), at any time."
          : ": aconselhamento de saúde, a qualquer hora."}
      </li>
      <li>
        <strong>
          <a href={tel("800 250 250")}>
            {en ? "Poison Information Centre" : "Centro de Informação Antivenenos"}: 800 250 250
          </a>
        </strong>
        {en
          ? ": poisoning, including smoke or carbon monoxide."
          : ": intoxicações, incluindo por fumo ou monóxido de carbono."}
      </li>
      <li>
        {en ? "Civil Protection: " : "Proteção Civil: "}
        <a href="https://www.prociv.gov.pt" rel="noopener">
          prociv.gov.pt
        </a>{" "}
        ({en ? "mainland" : "continente"}),{" "}
        <a href="https://www.prociv.azores.gov.pt" rel="noopener">
          {en ? "Azores" : "Açores"}
        </a>{" "}
        {en ? "and" : "e"}{" "}
        <a href="https://www.procivmadeira.pt" rel="noopener">
          Madeira
        </a>
        . {en ? "Weather warnings: " : "Avisos do tempo: "}
        <a href="https://www.ipma.pt" rel="noopener">
          ipma.pt
        </a>
        .
      </li>
    </ul>
  );
}

function Portuguese() {
  return (
    <ProsePage
      title="Em caso de emergência"
      intro="Os contactos e o que fazer em cada perigo. Em caso de dúvida, siga sempre as indicações da Proteção Civil e das autoridades no local."
    >
      <h2 id="contactos">Contactos</h2>
      <Contacts en={false} />

      <h2 id="preparar">Antes</h2>
      <ul>
        <li>
          Telemóvel carregado, lanterna, rádio a pilhas, água, medicamentos e documentos à mão.
        </li>
        <li>Saiba como desligar a água, o gás e a eletricidade de casa.</li>
        <li>
          Combine com vizinhos e família quem dá uma ajuda a quem vive só ou tem pouca mobilidade.
        </li>
      </ul>

      <h2 id="incendio">Incêndio rural</h2>
      <ul>
        <li>Viu fumo ou chamas? Ligue 112. Não vá ver de perto.</li>
        <li>
          Se as autoridades mandarem sair, saia cedo e pelo caminho indicado. Não espere pelo fumo.
        </li>
        <li>
          Se já não for seguro sair, fique dentro de casa: feche portas e janelas, tape as frinchas
          com panos molhados e afaste-se das janelas. Nunca fuja a pé pelo mato nem de carro por
          estradas no meio do fumo.
        </li>
        <li>Com fumo, use máscara ou um pano húmido e evite esforços.</li>
      </ul>

      <h2 id="calor">Tempo quente</h2>
      <ul>
        <li>Beba água várias vezes ao dia, mesmo sem sede. Evite álcool e refeições pesadas.</li>
        <li>Evite o sol e o esforço entre as 11h e as 17h. Procure sítios frescos.</li>
        <li>
          Atenção a idosos, crianças, grávidas e pessoas com doenças crónicas. Nunca deixe ninguém,
          nem animais, num carro fechado.
        </li>
      </ul>

      <h2 id="chuva">Chuva forte e inundações</h2>
      <ul>
        <li>Não atravesse ruas ou estradas inundadas, nem a pé nem de carro.</li>
        <li>
          Afaste-se de ribeiras, rios e encostas instáveis. Evite caves e garagens subterrâneas.
        </li>
        <li>Limpe sarjetas, algerozes e escoamentos à volta de casa antes da chuva.</li>
      </ul>

      <h2 id="vento">Vento forte e trovoada</h2>
      <ul>
        <li>Prenda ou recolha vasos, toldos e outros objetos soltos.</li>
        <li>Afaste-se de árvores, andaimes, estruturas frágeis e cabos elétricos caídos.</li>
        <li>
          Com trovoada, abrigue-se num edifício ou num carro fechado. Evite sítios altos, árvores
          isoladas e a água.
        </li>
      </ul>

      <h2 id="mar">Agitação marítima</h2>
      <ul>
        <li>Afaste-se dos molhes, paredões, arribas e da linha de rebentação.</li>
        <li>Não pesque nem passeie nesses sítios enquanto durar o aviso.</li>
      </ul>

      <h2 id="frio">Tempo frio e neve</h2>
      <ul>
        <li>Vista várias camadas de roupa e proteja as mãos, os pés e a cabeça.</li>
        <li>
          Braseiras, salamandras e aquecedores a gás só com o espaço arejado: o monóxido de carbono
          não se vê nem se cheira.
        </li>
        <li>Antes de viajar, informe-se sobre as estradas cortadas.</li>
      </ul>

      <h2 id="sismo">Sismo</h2>
      <ul>
        <li>
          Durante: baixe-se, proteja a cabeça debaixo de uma mesa resistente e aguarde que pare.
          Afaste-se de janelas e móveis altos. Na rua, afaste-se de edifícios, postes e muros.
        </li>
        <li>Depois: conte com réplicas. Não use elevadores. Se cheirar a gás, não acenda luzes.</li>
        <li>
          Na costa, se o sismo foi forte ou longo, ou se o mar recuar de repente, vá logo para um
          sítio alto, longe da praia: pode vir um tsunami.
        </li>
      </ul>

      <p className="text-base text-ink-2">
        O Portugal Agora é informativo e não substitui a Proteção Civil nem as autoridades.
      </p>
    </ProsePage>
  );
}

function English() {
  return (
    <ProsePage
      title="In an emergency"
      intro="Who to call and what to do for each hazard. When in doubt, always follow Civil Protection and the authorities on the ground."
    >
      <h2 id="contactos">Contacts</h2>
      <Contacts en />

      <h2 id="preparar">Before</h2>
      <ul>
        <li>Keep a charged phone, torch, battery radio, water, medicines and documents to hand.</li>
        <li>Know how to turn off the water, gas and electricity at home.</li>
        <li>
          Agree with neighbours and family who checks on people living alone or with limited
          mobility.
        </li>
      </ul>

      <h2 id="incendio">Wildfire</h2>
      <ul>
        <li>Seen smoke or flames? Call 112. Do not go and look.</li>
        <li>
          If the authorities tell you to leave, leave early and by the route they give. Do not wait
          for the smoke.
        </li>
        <li>
          If it is no longer safe to leave, stay indoors: close doors and windows, block gaps with
          wet cloths and keep away from windows. Never flee on foot through scrub or by car along
          roads full of smoke.
        </li>
        <li>In smoke, wear a mask or a damp cloth and avoid exertion.</li>
      </ul>

      <h2 id="calor">Hot weather</h2>
      <ul>
        <li>
          Drink water several times a day, even if you are not thirsty. Avoid alcohol and heavy
          meals.
        </li>
        <li>Avoid the sun and exertion between 11:00 and 17:00. Find cool places.</li>
        <li>
          Watch out for older people, children, pregnant women and people with chronic illness.
          Never leave anyone, or any animal, in a closed car.
        </li>
      </ul>

      <h2 id="chuva">Heavy rain and floods</h2>
      <ul>
        <li>Do not cross flooded streets or roads, on foot or by car.</li>
        <li>
          Keep away from streams, rivers and unstable slopes. Avoid basements and underground car
          parks.
        </li>
        <li>Clear drains, gutters and outlets around the house before the rain.</li>
      </ul>

      <h2 id="vento">Strong wind and thunderstorms</h2>
      <ul>
        <li>Tie down or bring in pots, awnings and other loose objects.</li>
        <li>Keep away from trees, scaffolding, flimsy structures and fallen power lines.</li>
        <li>
          In a thunderstorm, shelter in a building or a closed car. Avoid high ground, isolated
          trees and water.
        </li>
      </ul>

      <h2 id="mar">Rough seas</h2>
      <ul>
        <li>Keep away from piers, sea walls, cliffs and the surf line.</li>
        <li>Do not fish or walk there while the warning lasts.</li>
      </ul>

      <h2 id="frio">Cold weather and snow</h2>
      <ul>
        <li>Wear several layers and protect your hands, feet and head.</li>
        <li>
          Use braziers, stoves and gas heaters only in ventilated rooms: carbon monoxide cannot be
          seen or smelt.
        </li>
        <li>Before travelling, check for closed roads.</li>
      </ul>

      <h2 id="sismo">Earthquake</h2>
      <ul>
        <li>
          During: drop, cover your head under a sturdy table and hold on until it stops. Keep away
          from windows and tall furniture. Outdoors, move away from buildings, poles and walls.
        </li>
        <li>
          After: expect aftershocks. Do not use lifts. If you smell gas, do not switch on lights.
        </li>
        <li>
          On the coast, if the earthquake was strong or long, or the sea suddenly pulls back, go to
          high ground away from the beach at once: a tsunami may follow.
        </li>
      </ul>

      <p className="text-base text-ink-2">
        Portugal Agora is for information only and does not replace Civil Protection or the
        authorities.
      </p>
    </ProsePage>
  );
}
