import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Star } from "lucide-react";
import hero from "@/assets/hero.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gennaro Montecino — Videojuegos e investigaciones" },
      { name: "description", content: "Página dedicada a la publicación de mis videojuegos y casos ufológicos de la zona." },
      { property: "og:title", content: "Gennaro Montecino — Videojuegos e investigaciones" },
      { property: "og:description", content: "Videojuegos independientes e investigaciones ufológicas de la Patagonia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const SECCIONES = [
  { to: "/casos", n: "01", t: "Casos", d: "Casos ufológicos de la zona, organizados con fechas, fuentes y estado de investigación." },
  { to: "/mapa", n: "02", t: "Mapa de casos", d: "Ubicaciones y registros reunidos en un mapa interactivo." },
  { to: "/imagenes", n: "03", t: "Imágenes y videos", d: "Fotografías, videos y documentos relacionados con los casos." },
  { to: "/reportes", n: "04", t: "Publicaciones", d: "Artículos, avances, notas y análisis de distintos proyectos." },
] as const;

function Index() {
  return (
    <>
      <section id="videojuego-destacado" className="grain relative flex min-h-[92svh] items-end overflow-hidden">
        <img
          src={hero.url}
          alt="Cerro Piltriquitrón bajo el cielo nocturno, El Bolsón, Patagonia argentina"
          className="slowzoom absolute inset-0 h-full w-full object-cover object-[50%_70%] brightness-[0.58] contrast-[1.08] saturate-[0.78]"
        />
        <div className="hero-shade absolute inset-0" />
        <div className="relative mx-auto w-full max-w-7xl px-6 pb-16 pt-32 md:px-10 md:pb-24">
          <div className="rise inline-flex items-center gap-3 border border-amber-300/45 bg-amber-300/10 px-4 py-2.5 text-amber-200 shadow-[0_0_28px_rgba(251,191,36,0.12)] backdrop-blur-sm">
            <Star size={15} fill="currentColor" strokeWidth={1.5} />
            <span className="label-mono !text-amber-200">Proyecto destacado</span>
            <span className="h-4 w-px bg-amber-200/35" />
            <span className="label-mono !text-amber-100/75">Videojuego</span>
          </div>
          <div className="mt-8 max-w-5xl">
            <p className="rise label-mono !text-celeste" style={{ animationDelay: "100ms" }}>Una aventura independiente en la Patagonia</p>
            <h1 className="rise display-serif mt-4 max-w-5xl text-6xl leading-[0.92] md:text-[7.5rem]" style={{ animationDelay: "160ms" }}>
              OVNIS: <span className="text-amber-200">EL BOLSÓN</span>
            </h1>
            <p className="rise mt-7 max-w-2xl text-lg leading-relaxed text-foreground/85 md:text-xl" style={{ animationDelay: "240ms" }}>
              Una noche tranquila en la Patagonia. Un OVNI aparece sobre El Bolsón y se lleva a tu gato. Ahora depende de vos perseguirlo.
            </p>
            <div className="rise mt-9 flex flex-wrap items-center gap-5" style={{ animationDelay: "320ms" }}>
              <Link to="/juego" className="group inline-flex items-center gap-3 bg-foreground px-7 py-4 font-mono text-sm font-semibold tracking-[0.14em] text-background shadow-[0_8px_30px_rgba(0,0,0,0.24)] transition-all hover:-translate-y-0.5 hover:bg-amber-200">
                JUGAR AHORA <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <span className="label-mono text-foreground/65">Un videojuego de Gennaro Montecino</span>
            </div>
          </div>
          <div className="mt-14 flex items-center gap-3 text-foreground/55">
            <span className="h-px w-10 bg-silver/40" />
            <span className="label-mono">Desarrollado en El Bolsón · Patagonia argentina</span>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-background">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-16 md:grid-cols-12 md:px-10 md:py-20">
          <div className="flex justify-center md:col-span-3 md:justify-start">
            <img src="/imagens/logo%20gennaro.png.png" alt="Logo de Gennaro Montecino: un alien gris sosteniendo un gato atigrado" className="h-40 w-52 rounded-sm bg-black object-contain md:h-48 md:w-60" loading="eager" />
          </div>
          <div className="md:col-span-6">
            <p className="label-mono !text-celeste">Videojuegos · Ufología · Investigaciones</p>
            <h2 className="display-serif mt-3 text-5xl md:text-6xl">Gennaro Montecino</h2>
            <p className="mt-5 max-w-2xl leading-relaxed text-foreground/75">
              Página dedicada a la publicación de mis videojuegos y casos ufológicos de la zona.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:col-span-3 md:flex-col md:items-start">
            <Link to="/casos" className="group inline-flex items-center gap-2 border border-border px-5 py-3 text-sm transition-colors hover:border-celeste hover:text-celeste">
              Ver casos <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link to="/mapa" className="group inline-flex items-center gap-2 border border-border px-5 py-3 text-sm transition-colors hover:border-celeste hover:text-celeste">
              Explorar el mapa <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-20">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="label-mono !text-celeste">Explorar</p>
              <h2 className="display-serif mt-3 text-4xl md:text-5xl">Proyectos y publicaciones</h2>
            </div>
            <span className="label-mono text-muted-foreground">Archivo personal · Patagonia</span>
          </div>
          <div className="grid border-l border-t border-border md:grid-cols-4">
            {SECCIONES.map((s) => (
              <Link key={s.to} to={s.to} className="group border-b border-r border-border px-6 py-9 transition-colors hover:bg-graphite/40 md:px-7 md:py-11">
                <span className="label-mono">{s.n}</span>
                <h3 className="display-serif mt-6 text-2xl group-hover:text-celeste md:text-3xl">{s.t}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
                <ArrowRight size={16} className="mt-8 text-silver transition-transform group-hover:translate-x-1 group-hover:text-celeste" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
