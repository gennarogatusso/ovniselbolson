import { createFileRoute, Link, notFound } from "@tanstack/react-router";
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
  const rows: [string, string][] = [
    ["Fecha", e.fecha],
    ["Localidad", e.localidad],
    ["Región", e.region],
    ["Tipo de fenómeno", e.tipo],
    ["Estado", e.estado],
  ];
  return (
    <article className="mx-auto max-w-5xl px-6 pb-28 pt-36 md:px-10">
      <Link to="/casos" className="label-mono hover:text-celeste">← Archivo de Casos</Link>
      <p className="label-mono mt-10 !text-celeste">{e.codigo}</p>
      <h1 className="display-serif mt-4 text-5xl">{e.titulo}</h1>
      <dl className="mt-10 grid grid-cols-2 border-t border-border md:grid-cols-5">
        {rows.map(([k, v]) => (
          <div key={k} className="border-b border-border py-4 pr-4">
            <dt className="label-mono">{k}</dt>
            <dd className="mt-1 text-sm">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-10 max-w-3xl font-serif text-xl leading-relaxed">{e.descripcion}</p>
      <h2 className="label-mono mt-14">Fuentes y documentación</h2>
      <ul className="mt-4 divide-y divide-border border-y border-border">
        {e.fuentes.map((f, i) => (
          <li key={i} className="flex justify-between py-3 text-sm">
            <span>{f.url ? <a href={f.url} target="_blank" rel="noreferrer" className="hover:text-celeste">{f.titulo}</a> : f.titulo}</span>
            <span className="label-mono">{f.tipo}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
