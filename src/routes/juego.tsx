import { createFileRoute } from "@tanstack/react-router";
import { UfoGame } from "@/components/game/UfoGame";

export const Route = createFileRoute("/juego")({
  head: () => ({
    meta: [
      { title: "OVNIS EN EL BOLSÓN — Juego test · APFAA" },
      { name: "description", content: "Un OVNI aparece sobre El Bolsón y se lleva a tu gato. Juego 2D gratuito en la web de APFAA." },
      { property: "og:title", content: "OVNIS EN EL BOLSÓN — Juego test · APFAA" },
      { property: "og:description", content: "Perseguí al platillo volador y recuperá a tu gato en la Comarca Andina." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <div className="h-[100svh] w-full pt-16 md:pt-20">
      <UfoGame />
    </div>
  ),
});
