import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import hero from "@/assets/hero.jpg.asset.json";
import logo from "@/assets/logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "APFAA — Archivo Patagónico de Fenómenos Aéreos Anómalos" },
      { name: "description", content: "Archivo independiente que documenta testimonios, registros y fenómenos aéreos anómalos de la Comarca Andina y la Patagonia argentina." },
      { property: "og:title", content: "APFAA — Archivo Patagónico de Fenómenos Aéreos Anómalos" },
      { property: "og:description", content: "Años de archivos de fenómenos anómalos en la Comarca." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const SIGLA = [
  ["A", "Archivo"],
  ["P", "Patagónico"],
  ["F", "Fenómenos"],
  ["A", "Aéreos"],
  ["A", "Anómalos"],
];

const SECCIONES = [
  { to: "/casos", n: "01", t: "Casos", d: "Catálogo de expedientes con fuentes y estado de investigación." },
  { to: "/mapa", n: "02", t: "Mapa de Casos", d: "Cartografía interactiva de la Comarca Andina y la Patagonia." },
  { to: "/imagenes", n: "03", t: "Imágenes y videos", d: "Fotografías, videos y documentos escaneados asociados." },
  { to: "/reportes", n: "04", t: "Reportes", d: "Publicaciones, análisis y documentos de investigación." },
] as const;

function Index() {
  return (
    <>
      <section className="grain relative flex min-h-[100svh] items-end overflow-hidden">
        <img
          src={hero.url}
          alt="Cerro Piltriquitrón bajo el cielo nocturno, El Bolsón, Patagonia argentina"
          className="slowzoom absolute inset-0 h-full w-full object-cover object-[50%_70%] brightness-[0.8] contrast-[1.05] saturate-[0.8]"
        />
        <div className="hero-shade absolute inset-0" />

        <div className="relative mx-auto w-full max-w-7xl px-6 pb-16 pt-32 md:px-10 md:pb-24">
          <div className="rise flex items-center gap-4">
            <span className="label-mono !text-celeste">Exp. 000 · Portada</span>
            <span className="h-px w-16 bg-silver/40" />
            <span className="label-mono">Cerro Piltriquitrón · 2.284 m</span>
          </div>

          <div className="mt-8 flex items-center gap-6 md:gap-10">
            <img src={logo.url} alt="Logotipo APFAA" className="rise h-20 w-20 md:h-36 md:w-36" style={{ animationDelay: "100ms" }} />
            <div>
              <h1 className="rise display-serif text-7xl md:text-[10rem]" style={{ animationDelay: "160ms" }}>APFAA</h1>
              <p className="rise label-mono mt-3 !text-foreground/80 md:!text-sm" style={{ animationDelay: "240ms" }}>
                Archivo Patagónico de Fenómenos Aéreos Anómalos
              </p>
            </div>
          </div>

          <div className="mt-12 grid gap-10 border-t border-silver/25 pt-8 md:grid-cols-12">
            <p className="rise font-serif text-3xl italic leading-tight md:col-span-6 md:text-4xl" style={{ animationDelay: "320ms" }}>
              “Años de archivos de fenómenos anómalos en la Comarca.”
            </p>
            <div className="rise md:col-span-5 md:col-start-8" style={{ animationDelay: "400ms" }}>
              <p className="leading-relaxed text-foreground/80">
                Un archivo independiente dedicado a documentar testimonios, registros y fenómenos aéreos anómalos de la Comarca Andina y la Patagonia argentina.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/casos" className="group inline-flex items-center gap-2 bg-foreground px-5 py-3 text-sm text-background transition-colors hover:bg-celeste">
                  Ver casos <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <Link to="/mapa" className="inline-flex items-center gap-2 border border-silver/40 px-5 py-3 text-sm backdrop-blur-sm transition-colors hover:border-celeste hover:text-celeste">
                  Explorar el mapa
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="label-mono">§ 1 — La sigla</p>
            <h2 className="display-serif mt-4 text-4xl md:text-5xl">Qué significa APFAA</h2>
          </div>
          <div className="md:col-span-8">
            <ul className="divide-y divide-border border-y border-border">
              {SIGLA.map(([l, w], i) => (
                <li key={i} className="flex items-baseline gap-6 py-4">
                  <span className="label-mono w-8">0{i + 1}</span>
                  <span className="font-serif text-4xl text-celeste">{l}</span>
                  <span className="font-serif text-2xl text-foreground/85">{w}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 max-w-2xl leading-relaxed text-muted-foreground">
              APFAA reúne, preserva y ordena testimonios y documentación sobre fenómenos aéreos anómalos en la región. Cada registro se cataloga con sus fuentes y su estado de investigación, distinguiendo con cuidado entre testimonio, hipótesis y evidencia corroborada.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-night/40">
        <div className="mx-auto grid max-w-7xl md:grid-cols-4">
          {SECCIONES.map((s) => (
            <Link key={s.to} to={s.to} className="group border-b border-border px-6 py-12 transition-colors hover:bg-graphite/40 md:border-b-0 md:border-r md:px-8 last:md:border-r-0">
              <span className="label-mono">{s.n}</span>
              <h3 className="display-serif mt-6 text-3xl group-hover:text-celeste">{s.t}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{s.d}</p>
              <ArrowRight size={16} className="mt-8 text-silver transition-transform group-hover:translate-x-1 group-hover:text-celeste" />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
