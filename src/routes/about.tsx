import { createFileRoute } from "@tanstack/react-router";
import valle from "@/assets/valle.jpg.asset.json";
import logo from "@/assets/logo.png.asset.json";
import { CONTACTO_EMAIL } from "@/lib/archive";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — APFAA" },
      { name: "description", content: "Qué es APFAA, sus objetivos, territorio, metodología y contacto." },
      { property: "og:title", content: "About — APFAA" },
      { property: "og:description", content: "Iniciativa independiente para preservar testimonios y documentación sobre fenómenos aéreos anómalos en la Patagonia." },
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
  "Búsqueda de fuentes complementarias: prensa, documentos, imágenes, otros testigos.",
  "Contraste con explicaciones convencionales: astronómicas, meteorológicas, aeronáuticas.",
  "Asignación de un estado de investigación y publicación con sus fuentes.",
];

function About() {
  return (
    <>
      <section className="grain relative flex h-[70vh] items-end overflow-hidden">
        <img src={valle.url} alt="Cerro Piltriquitrón visto desde un camino de El Bolsón" className="absolute inset-0 h-full w-full object-cover brightness-[0.55] saturate-[0.5]" />
        <div className="hero-shade absolute inset-0" />
        <div className="relative mx-auto w-full max-w-7xl px-6 pb-14 md:px-10">
          <p className="label-mono !text-celeste">Sección 05</p>
          <h1 className="display-serif mt-4 text-6xl md:text-8xl">About</h1>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-24 md:grid-cols-12 md:px-10">
        <p className="label-mono md:col-span-3">§ Institucional</p>
        <div className="space-y-6 font-serif text-2xl leading-snug md:col-span-8 md:text-3xl">
          <p>APFAA, Archivo Patagónico de Fenómenos Aéreos Anómalos, es una iniciativa independiente orientada a recopilar, preservar y organizar testimonios, registros y documentación histórica sobre fenómenos aéreos anómalos en la Comarca Andina y la Patagonia argentina.</p>
          <p className="text-foreground/70">Su objetivo es construir un archivo regional accesible, fomentar la conservación de testimonios y facilitar el estudio responsable de los casos mediante la documentación de fuentes y evidencias disponibles.</p>
        </div>
      </section>

      <section className="border-y border-border bg-night/40">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-12 md:px-10">
          <div className="md:col-span-3">
            <p className="label-mono">§ Territorio</p>
          </div>
          <p className="text-foreground/80 md:col-span-8">
            El archivo abarca la Comarca Andina del Paralelo 42 —El Bolsón, Lago Puelo, El Hoyo, Epuyén y localidades vecinas—, la zona de Bariloche y, de forma más amplia, la Patagonia argentina.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 md:px-10">
        <p className="label-mono">§ Criterio documental</p>
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
          APFAA no atribuye automáticamente un origen extraterrestre a ningún fenómeno. Un caso “anómalo” es, simplemente, uno que aún no cuenta con una explicación documentada.
        </p>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 border-t border-border px-6 py-24 md:grid-cols-12 md:px-10">
        <div className="md:col-span-4">
          <p className="label-mono">§ Metodología</p>
        </div>
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
        <div className="md:col-span-4">
          <p className="label-mono">§ Contacto</p>
        </div>
        <div className="md:col-span-8">
          <p className="text-foreground/80">Para compartir un testimonio, documentación o consultas sobre el archivo, escriba a:</p>
          <a href={`mailto:${CONTACTO_EMAIL}`} className="mt-4 inline-block font-serif text-3xl hover:text-celeste">{CONTACTO_EMAIL}</a>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center px-6 py-24 text-center">
          <img src={logo.url} alt="Logotipo APFAA" className="h-20 w-20 opacity-90" />
          <span className="mt-8 h-px w-12 bg-silver/40" />
          <p className="label-mono mt-8">Creado por</p>
          <p className="display-serif mt-3 text-4xl italic">Gennaro Montecino</p>
        </div>
      </section>
    </>
  );
}
