import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Eye, Gamepad2, Radio, Star } from "lucide-react";
import hero from "@/assets/hero.jpg.asset.json";
import valle from "@/assets/valle.jpg.asset.json";

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


      <section
        id="proximo-lanzamiento"
        aria-labelledby="proximo-lanzamiento-titulo"
        className="grain relative isolate overflow-hidden border-y border-cyan-100/10 bg-[#07101a]"
      >
        <img
          src={valle.url}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 h-full w-full object-cover object-center opacity-35 saturate-[0.55]"
        />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(4,9,16,0.98)_0%,rgba(4,10,18,0.93)_48%,rgba(4,10,18,0.72)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_82%_45%,rgba(73,190,220,0.20),transparent_34%)]" />

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 md:grid-cols-12 md:px-10 md:py-24">
          <div className="md:col-span-8">
            <div className="rise inline-flex flex-wrap items-center gap-3 border border-cyan-200/30 bg-cyan-200/[0.08] px-4 py-2.5 text-cyan-100 shadow-[0_0_30px_rgba(74,211,235,0.10)] backdrop-blur-sm">
              <Star size={15} fill="currentColor" strokeWidth={1.5} />
              <span className="label-mono !text-cyan-100">Próximamente</span>
              <span className="h-4 w-px bg-cyan-100/30" />
              <span className="label-mono !text-cyan-100/70">Nuevo videojuego</span>
            </div>

            <p className="label-mono mt-8 !text-cyan-200/75">Proyecto 02 · En desarrollo</p>
            <h2
              id="proximo-lanzamiento-titulo"
              className="display-serif mt-4 max-w-4xl text-5xl leading-[0.98] text-white md:text-7xl"
            >
              LA SEÑAL
              <span className="mt-2 block text-cyan-200">EN LA RUTA 40</span>
            </h2>
            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-white/80 md:text-xl">
              Algo oculto se esconde en el Cerro de La Cruz. Explora el pueblo y sus secretos.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-2 border border-white/15 bg-black/25 px-4 py-3 text-sm text-white/90 backdrop-blur-sm">
                <Gamepad2 size={17} className="text-cyan-200" />
                Videojuego 3D
              </span>
              <span className="inline-flex items-center gap-2 border border-white/15 bg-black/25 px-4 py-3 text-sm text-white/90 backdrop-blur-sm">
                <Eye size={17} className="text-cyan-200" />
                Primera persona
              </span>
              <span className="inline-flex items-center gap-2 border border-white/15 bg-black/25 px-4 py-3 text-sm text-white/90 backdrop-blur-sm">
                <Radio size={17} className="text-cyan-200" />
                Terror y misterio
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm md:col-span-4">
            <div className="absolute inset-5 rounded-full bg-cyan-300/15 blur-3xl" />
            <div className="relative overflow-hidden border border-cyan-100/25 bg-[#07131e]/75 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.40),0_0_45px_rgba(54,190,220,0.10)] backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-cyan-100/15 pb-4">
                <span className="label-mono !text-cyan-100/75">Registro de campo</span>
                <span className="flex items-center gap-2 label-mono !text-cyan-100/65">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.9)]" />
                  En desarrollo
                </span>
              </div>

              <div className="relative flex flex-col items-center py-9 text-center">
                <div className="absolute inset-x-8 top-8 h-40 rounded-full bg-cyan-300/10 blur-2xl" />
                <div className="relative flex h-40 w-40 items-center justify-center rounded-full border border-cyan-200/35 bg-cyan-100/[0.04] shadow-[0_0_45px_rgba(103,232,249,0.12)]">
                  <div className="absolute inset-3 rounded-full border border-dashed border-cyan-100/20" />
                  <div className="absolute inset-7 rounded-full border border-cyan-100/15" />
                  <Radio size={62} strokeWidth={1.1} className="text-cyan-100 drop-shadow-[0_0_16px_rgba(103,232,249,0.65)]" />
                  <span className="absolute right-7 top-7 h-2 w-2 rounded-full bg-cyan-200 shadow-[0_0_14px_rgba(103,232,249,1)]" />
                </div>
                <p className="label-mono mt-7 !text-cyan-100/60">Ruta Nacional</p>
                <p className="mt-1 font-mono text-6xl font-semibold tracking-[-0.08em] text-white">40</p>
                <p className="label-mono mt-2 !text-cyan-100/55">Cerro de La Cruz · Patagonia</p>
              </div>

              <div className="border-t border-cyan-100/15 pt-4 text-center">
                <p className="font-mono text-lg font-semibold tracking-[0.18em] text-cyan-100">PRÓXIMAMENTE</p>
                <p className="label-mono mt-2 !text-white/45">Videojuego 3D en primera persona</p>
              </div>
            </div>
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
