import { createFileRoute } from "@tanstack/react-router";
import { Route40AwkaCinematic } from "@/components/game/Route40AwkaCinematic";

export const Route = createFileRoute("/la-senal-ruta-40-awka")({
  head: () => ({
    meta: [
      { title: "La Señal en la Ruta 40 — AWKA" },
      { name: "description", content: "Segunda cinemática de La Señal en la Ruta 40: una noche en AWKA." },
      { property: "og:title", content: "La Señal en la Ruta 40 — AWKA" },
      { property: "og:description", content: "La noche en AWKA toma un giro inesperado." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Route40AwkaCinematic,
});
