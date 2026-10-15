import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader, EmptyState, FieldSchema } from "@/components/site/Archive";
import { materiales } from "@/lib/archive";

export const Route = createFileRoute("/imagenes")({
  head: () => ({
    meta: [
      { title: "Imágenes y videos — APFAA" },
      { name: "description", content: "Archivo visual de fotografías, videos y documentos escaneados asociados a los casos de APFAA." },
      { property: "og:title", content: "Imágenes y videos — APFAA" },
      { property: "og:description", content: "Material visual documentado del archivo patagónico." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Imagenes,
});

function Imagenes() {
  const [idx, setIdx] = useState<number | null>(null);
  const visuales = materiales.filter((m) => m.src);
  const pendientes = materiales.filter((m) => !m.src);
  const n = visuales.length;
  useEffect(() => {
    if (idx === null) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIdx(null);
      if (e.key === "ArrowRight") setIdx((i) => (i! + 1) % n);
      if (e.key === "ArrowLeft") setIdx((i) => (i! - 1 + n) % n);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [idx, n]);
  const cur = idx !== null ? visuales[idx] : null;

  return (
    <>
      <PageHeader code="Sección 03" title="Imágenes y videos" lead="Archivo audiovisual de APFAA: fotografías, videos, capturas, registros históricos, documentos y reconstrucciones. Cada pieza consigna su procedencia." />
      <section className="mx-auto max-w-7xl px-6 pb-28 md:px-10">
        {pendientes.length > 0 && (
          <div className="mb-10 grid gap-6 md:grid-cols-2">
            {pendientes.map((m) => (
              <article key={m.id} className="border border-dashed border-border bg-card p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="label-mono !text-celeste">{m.id} · {m.tipo}</span>
                  {m.verificacion && <span className="border border-border px-2 py-1 font-mono text-[0.65rem] text-muted-foreground">{m.verificacion}</span>}
                </div>
                <h2 className="mt-4 font-serif text-2xl">{m.titulo}</h2>
                {m.video ? (
                  <video src={m.video} controls preload="metadata" playsInline className="mt-5 aspect-video w-full border border-border bg-background" />
                ) : (
                  <div className="mt-5 flex aspect-video items-center justify-center border border-border bg-background">
                    <span className="label-mono">Espacio reservado para el video</span>
                  </div>
                )}
                {m.video && (
                  <div className="mt-3 flex flex-wrap gap-4 text-xs">
                    {m.url && <a href={m.url} target="_blank" rel="noreferrer" className="text-celeste underline">Ver fuente oficial ↗</a>}
                    <a href={m.video} target="_blank" rel="noreferrer" className="text-muted-foreground underline">Abrir archivo MP4 ↗</a>
                  </div>
                )}
                <dl className="mt-5 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                  {([["Identificador", m.id], ["Fuente original", m.procedencia], ["Fecha", m.fecha], ["Lugar", m.localidad], ["Descripción", m.descripcion], ["Estado de verificación", m.verificacion]] as [string, string | undefined][]).map(([k, v]) => (
                    <div key={k} className="border-b border-border py-2">
                      <dt className="label-mono">{k}</dt>
                      <dd className="mt-1 text-sm text-muted-foreground">{v || "Pendiente"}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        )}
        {n === 0 && pendientes.length > 0 ? null : n === 0 ? (
          <EmptyState code="Galería · Sin materiales" title="No hay materiales visuales publicados todavía.">
            Solo se incorporarán imágenes con procedencia verificable. APFAA no publica material generado ni lo presenta como evidencia.
          </EmptyState>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
            {visuales.map((m, i) => (
              <button key={m.id} onClick={() => setIdx(i)} className="group mb-4 block w-full break-inside-avoid text-left">
                <img src={m.src} alt={m.titulo} className="w-full grayscale-[30%] transition group-hover:grayscale-0" loading="lazy" />
                <div className="flex justify-between py-2">
                  <span className="text-sm">{m.titulo}</span>
                  <span className="label-mono">{m.fecha}</span>
                </div>
                {m.url && <a href={m.url} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()} className="text-xs text-celeste underline">Ver original ↗</a>}
              </button>
            ))}
          </div>
        )}
        <FieldSchema fields={["Título", "Lugar y fecha", "Descripción", "Procedencia o fuente", "Tipo de material", "Enlace al original"]} />
      </section>

      {cur && (
        <div className="fixed inset-0 z-[2000] flex flex-col bg-background/95 backdrop-blur" role="dialog" aria-modal="true">
          <div className="flex justify-between p-4">
            <span className="label-mono">{idx! + 1} / {n}</span>
            <button onClick={() => setIdx(null)} aria-label="Cerrar"><X /></button>
          </div>
          <div className="flex flex-1 items-center justify-center gap-4 px-4">
            <button onClick={() => setIdx((idx! - 1 + n) % n)} aria-label="Anterior"><ChevronLeft /></button>
            <img src={cur.src} alt={cur.titulo} className="max-h-[70vh] max-w-full object-contain" />
            <button onClick={() => setIdx((idx! + 1) % n)} aria-label="Siguiente"><ChevronRight /></button>
          </div>
          <div className="mx-auto max-w-3xl p-6 text-center">
            <p className="font-serif text-2xl">{cur.titulo}</p>
            <p className="label-mono mt-2">{cur.fecha} · {cur.localidad} · {cur.procedencia}{cur.expediente ? ` · ${cur.expediente}` : ""}</p>
            <p className="mt-3 text-sm text-muted-foreground">{cur.descripcion}</p>
          </div>
        </div>
      )}
    </>
  );
}
