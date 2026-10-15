import { createFileRoute, Link, ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { expedientes, localidades, tiposFenomeno, type Expediente } from "@/lib/archive";
import { inputCls } from "@/components/site/Archive";
import { Select } from "./casos.index";

const CaseMap = lazy(() => import("@/components/site/CaseMap"));

export const Route = createFileRoute("/mapa")({
  head: () => ({
    meta: [
      { title: "Mapa de Casos — APFAA" },
      { name: "description", content: "Mapa interactivo de fenómenos aéreos anómalos en la Comarca Andina: El Bolsón, Lago Puelo, El Hoyo, Epuyén y Bariloche." },
      { property: "og:title", content: "Mapa de Casos — APFAA" },
      { property: "og:description", content: "Explore geográficamente los registros del archivo patagónico." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Mapa,
});

function Mapa() {
  const [loc, setLoc] = useState("");
  const [tipo, setTipo] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [sel, setSel] = useState<Expediente | null>(null);
  const [open, setOpen] = useState(false);
  const onSelect = useCallback((e: Expediente) => setSel(e), []);

  const cases = useMemo(
    () =>
      expedientes.filter(
        (e) =>
          e.coordenadas &&
          (!loc || e.localidad === loc) &&
          (!tipo || e.tipo === tipo) &&
          (!desde || e.fecha >= desde) &&
          (!hasta || e.fecha <= hasta),
      ),
    [loc, tipo, desde, hasta],
  );

  return (
    <section className="relative h-[100svh] pt-16 md:pt-20">
      <div className="relative h-full w-full">
        <ClientOnly fallback={<div className="h-full w-full bg-card" />}>
          <Suspense fallback={<div className="h-full w-full bg-card" />}>
            <CaseMap cases={cases} onSelect={onSelect} />
          </Suspense>
        </ClientOnly>
        <div className="absolute left-3 top-3 z-[1000] w-[min(20rem,calc(100%-4.5rem))] border border-border bg-background/85 backdrop-blur md:left-14">
          <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3 text-left">
            <span>
              <span className="label-mono !text-celeste">Sección 02 · Mapa de casos</span>
              <span className="mt-1 block font-mono text-xs text-muted-foreground">{String(cases.length).padStart(3, "0")} registros · {open ? "Ocultar filtros" : "Filtros"}</span>
            </span>
            <span className="font-mono text-celeste">{open ? "−" : "+"}</span>
          </button>
          {open && (
            <div className="space-y-3 border-t border-border p-4">
              <Select label="Localidad" value={loc} onChange={setLoc} options={localidades} />
              <Select label="Categoría" value={tipo} onChange={setTipo} options={tiposFenomeno} />
              <div className="grid grid-cols-2 gap-2">
                <label><span className="label-mono">Desde</span><input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={`${inputCls} mt-1`} /></label>
                <label><span className="label-mono">Hasta</span><input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={`${inputCls} mt-1`} /></label>
              </div>
              {sel && (
                <div className="border-t border-border pt-3">
                  <p className="font-mono text-xs text-celeste">{sel.codigo}</p>
                  <p className="mt-1 font-serif text-lg">{sel.titulo}</p>
                  <Link to="/casos/$codigo" params={{ codigo: sel.codigo }} className="mt-2 inline-block text-xs text-celeste underline">Abrir expediente</Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
