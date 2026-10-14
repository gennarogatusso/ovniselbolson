import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { X } from "lucide-react";
import { expedientes } from "@/lib/archive";

export const Route = createFileRoute("/casos/$codigo")({
  loader: ({ params }) => {
    const exp = expedientes.find((e) => e.codigo === params.codigo);
    if (!exp) throw notFound();
    return exp;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.codigo} · ${loaderData.titulo} — APFAA` },
          { name: "description", content: loaderData.descripcion },
          { property: "og:title", content: `${loaderData.codigo} · ${loaderData.titulo}` },
          { property: "og:description", content: loaderData.descripcion },
          { property: "og:type", content: "article" },
          { name: "twitter:card", content: "summary" },
        ]
      : [{ title: "Expediente no encontrado — APFAA" }, { name: "robots", content: "noindex" }],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-6 pb-28 pt-40 text-center">
      <p className="label-mono">Expediente inexistente</p>
      <h1 className="display-serif mt-4 text-5xl">Sin registro en el archivo</h1>
      <Link to="/casos" className="mt-8 inline-block border border-border px-5 py-2.5 text-sm hover:border-celeste">Volver al catálogo</Link>
    </div>
  ),
  component: Ficha,
});

function Ficha() {
  const e = Route.useLoaderData();
  const [zoom, setZoom] = useState<string | null>(null);
  const rows: [string, string][] = [
    ["Fecha", e.fechaDetalle ?? e.fecha],
    ["Ubicación", e.region],
    ["Clasificación", e.tipo],
    ["Estado", e.estado],
  ];
  return (
    <article className="mx-auto max-w-5xl px-6 pb-28 pt-36 md:px-10">
      <Link to="/casos" className="label-mono hover:text-celeste">← Archivo de Casos</Link>
      <p className="label-mono mt-10 !text-celeste">{e.codigo}</p>
      <h1 className="display-serif mt-4 text-5xl">{e.titulo}</h1>
      <dl className="mt-10 grid grid-cols-2 border-t border-border md:grid-cols-4">
        {rows.map(([k, v]) => (
          <div key={k} className="border-b border-border py-4 pr-4">
            <dt className="label-mono">{k}</dt>
            <dd className="mt-1 text-sm">{v}</dd>
          </div>
        ))}
      </dl>
      {e.protagonista && <p className="mt-6 text-sm text-muted-foreground"><span className="label-mono mr-3">Protagonista</span>{e.protagonista}</p>}
      {e.imagenes && e.imagenes.length > 0 && (
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {e.imagenes.map((im) => (
            <figure key={im.src} className="border border-border bg-card">
              <button onClick={() => setZoom(im.src)} className="block w-full" aria-label="Ampliar imagen">
                <img src={im.src} alt={im.pie} className="aspect-[4/3] w-full object-cover transition hover:opacity-90" loading="lazy" />
              </button>
              <figcaption className="p-4">
                <p className="text-sm">{im.pie}</p>
                <p className="label-mono mt-2">Fuente: {im.fuente}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      {e.lead && <p className="mt-10 max-w-3xl font-serif text-2xl font-medium leading-snug">{e.lead}</p>}
      <p className="mt-8 max-w-3xl whitespace-pre-line font-serif text-xl leading-relaxed">{e.descripcion}</p>
      {e.cierre && <p className="mt-8 max-w-3xl border-l-2 border-celeste pl-5 font-serif text-xl font-medium leading-relaxed">{e.cierre}</p>}
      {zoom && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-background/95 p-4 backdrop-blur" role="dialog" aria-modal="true" onClick={() => setZoom(null)}>
          <button className="absolute right-4 top-4" aria-label="Cerrar"><X /></button>
          <img src={zoom} alt="" className="max-h-[90vh] max-w-full object-contain" />
        </div>
      )}
      {e.audio && (
        <section className="mt-14 border border-celeste/40 bg-graphite/20 p-6">
          <h2 className="label-mono !text-celeste">Audio original de la comunicación con Prefectura</h2>
          <audio controls preload="none" src={e.audio} className="mt-5 w-full">Tu navegador no admite audio HTML5.</audio>
          <a href={e.audio} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm underline underline-offset-4 hover:text-celeste">Abrir o descargar el audio original ↗</a>
        </section>
      )}
      <h2 className="label-mono mt-14">Fuentes y documentación</h2>
      <ul className="mt-4 divide-y divide-border border-y border-border">
        {e.fuentes.map((f, i) => (
          <li key={i} className="flex justify-between py-3 text-sm">
            <span>{f.url ? <a href={f.url} target="_blank" rel="noreferrer" className="text-celeste underline underline-offset-4 hover:text-foreground">{f.titulo} ↗</a> : f.titulo}</span>
            <span className="label-mono">{f.tipo}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
