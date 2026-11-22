import { concelhoForDico, type Concelho } from "@/data/concelhos";

import { distanceKm, pointInFeature, type ConcelhoFeature } from "./geometry";

/*
 * Do "Perto de mim" ao concelho. Com GPS, a posição tem uns metros de erro e
 * o concelho é o que contém o ponto. Num computador, o browser estima a
 * posição pelo Wi-Fi ou pelo IP, com centenas de metros ou quilómetros de
 * erro: aí o ponto pode cair no concelho do lado (Oeiras → Sintra), e o
 * melhor é mostrar os concelhos possíveis e deixar a pessoa escolher.
 */

/** Acima deste erro (em metros), pergunta-se. */
export const ACCURATE_ENOUGH_M = 1000;
/** O círculo de erro conta até este raio (km): mais do que isso é "Portugal inteiro". */
const MAX_RADIUS_KM = 15;
const MAX_CHOICES = 6;

/** Um ponto a `km` de distância na direção `angle` (radianos, 0 = norte). */
function offset([lon, lat]: [number, number], km: number, angle: number): [number, number] {
  const dLat = (km * Math.cos(angle)) / 111.32;
  const dLon = (km * Math.sin(angle)) / (111.32 * Math.cos((lat * Math.PI) / 180));
  return [lon + dLon, lat + dLat];
}

/**
 * Os concelhos onde a pessoa pode estar: o que contém o ponto primeiro e
 * depois os que o círculo de erro toca, do mais perto ao mais longe.
 */
export function concelhoCandidates(
  point: [number, number],
  accuracyM: number,
  features: ConcelhoFeature[],
): Concelho[] {
  const at = (p: [number, number]) => features.find((f) => pointInFeature(p, f))?.properties.dico;
  const centre = at(point);
  const radius = Math.min(accuracyM / 1000, MAX_RADIUS_KM);
  const samples: [number, number][] = [];
  if (accuracyM > ACCURATE_ENOUGH_M)
    // Três anéis de 18 pontos: apanham também os concelhos pequenos (Amadora, Odivelas).
    for (const fraction of [1 / 3, 2 / 3, 1])
      for (let i = 0; i < 18; i++)
        samples.push(offset(point, radius * fraction, (i * Math.PI) / 9));
  const others = new Set(samples.map(at).filter((d): d is string => d !== undefined));
  if (centre) others.delete(centre);
  const near = [...others]
    .map((dico) => concelhoForDico(dico))
    .filter((c): c is Concelho => c !== undefined)
    .sort((a, b) => distanceKm(a.point, point) - distanceKm(b.point, point));
  const first = centre ? concelhoForDico(centre) : undefined;
  return [...(first ? [first] : []), ...near].slice(0, MAX_CHOICES);
}
