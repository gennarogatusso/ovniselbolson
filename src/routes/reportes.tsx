import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState, FieldSchema } from "@/components/site/Archive";
import { reportes } from "@/lib/archive";

export const Route = createFileRoute("/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes — APFAA" },
      { name: "description", content: "Publicaciones, análisis de casos y documentos de investigación del Archivo Patagónico de Fenómenos Aéreos Anómalos." },
      { property: "og:title", content: "Reportes — APFAA" },
      { property: "og:description", content: "Hemeroteca digital de informes y análisis de APFAA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Reportes,
});

function Reportes() {
  const sorted = [...reportes].sort((a, b) => b.fecha.localeCompare(a.fecha));
  return (
    <>
      <PageHeader code="Sección 04" title="Reportes" lead="Publicaciones, análisis de casos y documentos de investigación, organizados por fecha, tema, región y expediente relacionado." />
      <section className="mx-auto max-w-7xl px-6 pb-28 md:px-10">
        <div className="hidden grid-cols-12 border-b border-border pb-3 md:grid">
          {["Fecha", "Título", "Tema", "Región", "Exp."].map((h, i) => (
            <span key={h} className={`label-mono ${["col-span-2", "col-span-5", "col-span-2", "col-span-2", "col-span-1"][i]}`}>{h}</span>
          ))}
        </div>
        {sorted.length === 0 ? (
          <div className="mt-8">
            <EmptyState code="Hemeroteca · Vacía" title="Aún no hay reportes publicados.">
              Los informes y análisis se publicarán aquí, con sus referencias documentales y acceso al documento completo.
            </EmptyState>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {sorted.map((r) => (
              <li key={r.id} className="grid gap-2 py-6 md:grid-cols-12">
                <span className="font-mono text-xs text-muted-foreground md:col-span-2">{r.fecha}</span>
                <div className="md:col-span-5">
                  <p className="font-serif text-2xl">{r.titulo}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{r.resumen}</p>
                  {r.pdf && <a href={r.pdf} target="_blank" rel="noreferrer" className="label-mono mt-3 inline-block !text-celeste">Descargar PDF →</a>}
                </div>
                <span className="text-sm md:col-span-2">{r.tema}</span>
                <span className="text-sm md:col-span-2">{r.region}</span>
                <span className="font-mono text-xs text-celeste md:col-span-1">{r.expediente ?? "—"}</span>
              </li>
            ))}
          </ul>
        )}
        <FieldSchema fields={["Título", "Fecha de publicación", "Tema", "Región", "Expediente relacionado", "Resumen", "Documento PDF"]} />
      </section>
    </>
  );
}
