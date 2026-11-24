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
        <div className="relative mx-auto grid w-full max-w-7xl items-end gap-12 px-6 pb-16 pt-28 md:grid-cols-12 md:px-10 md:pb-20">
          <div className="md:col-span-8">
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

          <aside className="relative mx-auto w-full max-w-[360px] pb-1 md:col-span-4 md:mb-7" aria-label="Ilustración del videojuego: un OVNI abduce a un gato">
            <div className="absolute inset-6 rounded-full bg-cyan-300/15 blur-3xl" />
            <div className="relative overflow-hidden border border-cyan-100/25 bg-[#07131e]/80 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.45),0_0_45px_rgba(54,190,220,0.13)] backdrop-blur-md">
              <div className="flex items-center justify-between gap-3 border-b border-cyan-100/15 pb-4">
                <span className="label-mono !text-cyan-100/75">Registro de abducción</span>
                <span className="flex items-center gap-2 label-mono !text-emerald-200/80">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]" />
                  En juego
                </span>
              </div>

              <div className="relative mx-auto my-5 aspect-square w-full max-w-[285px]">
                <div className="absolute inset-5 rounded-full bg-cyan-300/10 blur-2xl" />
                <div className="absolute inset-3 rounded-full border border-cyan-100/15" />
                <div className="absolute inset-8 rounded-full border border-dashed border-cyan-100/20" />
                <div className="absolute inset-[4.25rem] rounded-full border border-cyan-100/15" />
                <svg viewBox="0 0 320 280" className="relative h-full w-full drop-shadow-[0_0_18px_rgba(103,232,249,0.20)]" role="img" aria-labelledby="ufo-cat-title ufo-cat-desc">
                  <title id="ufo-cat-title">Un OVNI abduce a un gato atigrado</title>
                  <desc id="ufo-cat-desc">Un platillo volador ilumina con un rayo celeste a un gato que asciende desde el bosque patagónico.</desc>
                  <defs>
                    <linearGradient id="abduction-beam" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a5f3fc" stopOpacity=".58" />
                      <stop offset="100%" stopColor="#67e8f9" stopOpacity=".02" />
                    </linearGradient>
                    <linearGradient id="ufo-hull" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#d8f4f5" />
                      <stop offset="52%" stopColor="#557985" />
                      <stop offset="100%" stopColor="#1a3444" />
                    </linearGradient>
                    <radialGradient id="ufo-core">
                      <stop offset="0%" stopColor="#ecfeff" stopOpacity=".95" />
                      <stop offset="100%" stopColor="#67e8f9" stopOpacity=".04" />
                    </radialGradient>
                  </defs>

                  <path d="M111 81 L209 81 L267 253 L53 253 Z" fill="url(#abduction-beam)" />
                  <path d="M120 83 L200 83 L231 247 L89 247 Z" fill="#67e8f9" opacity=".07" />
                  <ellipse cx="160" cy="234" rx="98" ry="13" fill="#67e8f9" opacity=".08" />
                  <path d="M32 244 L60 209 L76 232 L99 194 L123 235 L146 215 L169 244 L195 210 L222 241 L245 203 L273 245 L294 226 L310 250 L10 250 Z" fill="#0b2634" opacity=".88" />
                  <path d="M28 251 H292" stroke="#86dce9" strokeOpacity=".28" strokeWidth="1.2" />

                  <g opacity=".38" fill="#9feaf2">
                    <circle cx="42" cy="137" r="1.8" />
                    <circle cx="270" cy="121" r="1.5" />
                    <circle cx="244" cy="176" r="1.2" />
                    <circle cx="69" cy="177" r="1.2" />
                  </g>

                  <g>
                    <path d="M93 73 Q160 41 227 73 Q221 95 160 101 Q99 95 93 73Z" fill="url(#ufo-hull)" stroke="#c7f8fb" strokeOpacity=".86" strokeWidth="2" />
                    <ellipse cx="160" cy="73" rx="67" ry="18" fill="#142c3b" stroke="#b8edf3" strokeWidth="2" />
                    <path d="M126 68 Q160 36 194 68" fill="#79a8b7" stroke="#d5fbff" strokeOpacity=".75" strokeWidth="2" />
                    <path d="M140 63 Q160 47 180 63" fill="none" stroke="#e0fbff" strokeOpacity=".42" strokeWidth="2" />
                    <ellipse cx="160" cy="86" rx="43" ry="7" fill="#67e8f9" opacity=".25" />
                    <ellipse cx="160" cy="89" rx="19" ry="4" fill="url(#ufo-core)" />
                    <g fill="#b9f7ff">
                      <circle cx="111" cy="79" r="3.2" />
                      <circle cx="135" cy="91" r="2.5" />
                      <circle cx="185" cy="91" r="2.5" />
                      <circle cx="209" cy="79" r="3.2" />
                    </g>
                  </g>

                  <g transform="rotate(-9 160 174)" stroke="#d8f7f5" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M130 170 C113 171 107 158 112 148 C116 139 126 143 128 151" fill="none" stroke="#a5f3fc" strokeWidth="4" />
                    <path d="M133 165 C126 153 132 140 146 137 C158 133 175 139 181 150 C190 168 174 183 155 182 C145 182 137 176 133 165Z" fill="#8fa9a8" />
                    <path d="M165 145 C164 132 171 122 184 122 C198 122 207 133 204 145 C201 158 187 163 176 157Z" fill="#c4d5d1" />
                    <path d="M173 132 L174 116 L185 126 L195 116 L198 135" fill="#b7c9c5" />
                    <path d="M140 175 L132 190 L139 193 L149 179" fill="#8fa9a8" />
                    <path d="M160 179 L157 195 L165 196 L171 179" fill="#8fa9a8" />
                    <path d="M187 155 L198 168 L206 165 L198 149" fill="#a6bbb7" />
                    <path d="M177 153 L183 169 L192 166 L189 151" fill="#a6bbb7" />
                    <path d="M203 146 Q216 141 221 151 Q224 160 215 163" fill="none" stroke="#b7e9e5" strokeWidth="3" />
                    <path d="M178 145 Q183 148 188 145" fill="none" stroke="#456b70" strokeWidth="2" />
                    <circle cx="185" cy="141" r="2" fill="#173c49" stroke="none" />
                    <circle cx="198" cy="141" r="2" fill="#173c49" stroke="none" />
                    <path d="M190 148 Q193 151 196 148" fill="none" stroke="#54747a" strokeWidth="1.5" />
                  </g>

                  <path d="M113 102 L102 119 M207 102 L218 119" stroke="#a5f3fc" strokeOpacity=".35" strokeDasharray="3 5" />
                  <circle cx="160" cy="112" r="3" fill="#ecfeff" />
                </svg>
                <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-100 shadow-[0_0_22px_8px_rgba(103,232,249,0.20)]" />
              </div>

              <div className="text-center">
                <p className="label-mono !text-cyan-100/60">Fenómeno registrado</p>
                <p className="mt-2 font-mono text-xl font-semibold tracking-[0.12em] text-white">ABDUCCIÓN</p>
                <p className="label-mono mt-2 !text-cyan-100/55">El Bolsón · Río Negro · Patagonia</p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-cyan-100/15 pt-4">
                <span className="label-mono !text-emerald-200/70">Objetivo: rescatar al gato</span>
                <span className="label-mono !text-white/40">OVNIS / 001</span>
              </div>
            </div>
          </aside>
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
