export type LayerId = "warnings" | "fires" | "quakes" | "risk" | "air";

/** Ordem dos botões das camadas (os nomes estão no dicionário, em map.layers). */
export const layerOptions: LayerId[] = ["warnings", "fires", "quakes", "risk", "air"];

export const defaultLayers: LayerId[] = ["warnings", "fires", "quakes"];
