export type LayerId = "warnings" | "fires" | "quakes" | "risk" | "air";

export const layerOptions: { id: LayerId; label: string }[] = [
  { id: "warnings", label: "Avisos" },
  { id: "fires", label: "Incêndios" },
  { id: "quakes", label: "Sismos" },
  { id: "risk", label: "Risco de incêndio" },
  { id: "air", label: "Qualidade do ar" },
];

export const defaultLayers: LayerId[] = ["warnings", "fires", "quakes"];
