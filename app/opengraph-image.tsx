import { statusCard } from "@/lib/og/card";
import { getState } from "@/lib/state/get-state";

export const alt = "Estado atual de Portugal: avisos, incêndios e sismos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const state = await getState();
  return statusCard({
    level: state.levelKnown ? state.level : "unknown",
    place: "Todo o país",
    headline: state.headline,
  });
}
