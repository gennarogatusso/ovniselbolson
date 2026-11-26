import { createFileRoute } from "@tanstack/react-router";
import { Route40Opening } from "@/components/game/Route40Opening";

export const Route = createFileRoute("/la-senal-ruta-40")({
  head: () => ({
    meta: [
      { title: "La Señal en la Ruta 40 — Gennaro Montecino" },
      { name: "description", content: "Primera cinemática de La Señal en la Ruta 40, una historia de terror y misterio en El Bolsón." },
      { property: "og:title", content: "La Señal en la Ruta 40 — Gennaro Montecino" },
      { property: "og:description", content: "Una travesía por la Ruta 40. El Piltriquitrón observa desde el horizonte." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Route40Opening,
});
