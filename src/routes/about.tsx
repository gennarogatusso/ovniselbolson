import { createFileRoute } from "@tanstack/react-router";
import valle from "@/assets/valle.jpg.asset.json";
import { CONTACTO_EMAIL } from "@/lib/archive";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Sobre mí — Gennaro Montecino" },
      { name: "description", content: "Videojuegos, investigaciones y casos ufológicos de la zona." },
      { property: "og:title", content: "Sobre mí — Gennaro Montecino" },
      { property: "og:description", content: "Un espacio personal dedicado a proyectos de videojuegos y a documentar casos ufológicos de la Patagonia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: About,
});

const NIVELES = [
  ["Testimonio", "Relato de una persona sobre lo que percibió. Se registra con respeto y se preserva, pero por sí solo no confirma la naturaleza del fenómeno."],
  ["Hipótesis", "Explicación posible que se propone para un caso. Debe contrastarse con datos y puede ser descartada."],
  ["Evidencia corroborada", "Información verificada por fuentes independientes o registros técnicos que respaldan un hecho concreto."],
];

const METODO = [
  "Recepción y registro del testimonio con datos de fecha, lugar y circunstancias.",
  "Búsqueda de fuentes complementarias: prensa, documentos, imágenes y otros testigos.",
  "Contraste con explicaciones convencionales: astronómicas, meteorológicas y aeronáuticas.",
  "Asignación de un estado de investigación y publicación con sus fuentes.",
];

function About() {
  return (
    <>
      <section className="grain relative flex h-[70vh] items-end overflow-hidden">
        <img src={valle.url} alt="Cerro Piltriquitrón visto desde un camino de El Bolsón" className="absolute inset-0 h-full w-full object-cover brightness-[0.55] saturate-[0.5]" />
        <div className="hero-shade absolute inset-0" />
        <div className="relative mx-auto w-full max-w-7xl px-6 pb-14 md:px-10">
          <p className="label-mono !text-celeste">Página personal</p>
          <h1 className="display-serif mt-4 text-6xl md:text-8xl">Sobre mí</h1>
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-24 md:grid-cols-12 md:px-10">
        <p className="label-mono md:col-span-3">Gennaro Montecino</p>
        <div className="space-y-6 font-serif text-2xl leading-snug md:col-span-8 md:text-3xl">
          <p>Este es mi espacio personal para publicar mis videojuegos y casos ufológicos de la zona, compartir avances de desarrollo y organizar material relacionado con mis investigaciones.</p>
          <p className="text-foreground/70">Acá conviven proyectos creativos, registros, fotografías, videos y publicaciones sobre fenómenos que despiertan mi curiosidad.</p>
        </div>
      </section>
      <section className="border-y border-border bg-night/40">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10">
          <p className="label-mono">Qué vas a encontrar</p>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            <div className="border-t border-border pt-5">
              <p className="font-serif text-2xl text-celeste">Videojuegos</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Proyectos independientes, juegos publicados y avances de desarrollo.</p>
            </div>
            <div className="border-t border-border pt-5">
              <p className="font-serif text-2xl text-celeste">Casos ufológicos</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Testimonios, documentos, fotografías y registros de la zona.</p>
            </div>
            <div className="border-t border-border pt-5">
              <p className="font-serif text-2xl text-celeste">Mapa</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Una vista geográfica para explorar los lugares asociados a los casos.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <p className="label-mono">Criterio de investigación</p>
        <h2 className="display-serif mt-4 max-w-3xl text-4xl md:text-5xl">Un testimonio, una hipótesis y una evidencia no son lo mismo.</h2>
        <div className="mt-12 grid border-t border-border md:grid-cols-3">
          {NIVELES.map(([t, d], i) => (
            <div key={t} className="border-b border-border py-8 md:border-b-0 md:border-r md:px-8 first:md:pl-0 last:md:border-r-0">
              <span className="label-mono">Nivel {i + 1}</span>
              <p className="mt-3 font-serif text-2xl text-celeste">{t}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 max-w-2xl text-sm text-muted-foreground">
          Un caso no se considera extraterrestre por el solo hecho de ser inexplicado. La información disponible, las fuentes y las hipótesis deben distinguirse con claridad.
        </p>
      </section>
      <section className="mx-auto grid max-w-7xl gap-12 border-t border-border px-6 py-24 md:grid-cols-12 md:px-10">
        <div className="md:col-span-4"><p className="label-mono">Cómo organizo los casos</p></div>
        <ol className="space-y-6 md:col-span-8">
          {METODO.map((m, i) => (
            <li key={i} className="flex gap-6 border-b border-border pb-6">
              <span className="font-mono text-sm text-celeste">0{i + 1}</span>
              <span className="text-foreground/85">{m}</span>
            </li>
          ))}
        </ol>
      </section>
      <section className="mx-auto grid max-w-7xl gap-12 border-t border-border px-6 py-24 md:grid-cols-12 md:px-10">
        <div className="md:col-span-4"><p className="label-mono">Contacto</p></div>
        <div className="md:col-span-8">
          <p className="text-foreground/80">Para consultas, colaboraciones o para compartir información sobre algún caso, podés escribirme a:</p>
          <a href={`mailto:${CONTACTO_EMAIL}`} className="mt-4 inline-block font-serif text-3xl hover:text-celeste">{CONTACTO_EMAIL}</a>
        </div>
      </section>
    </>
  );
}
