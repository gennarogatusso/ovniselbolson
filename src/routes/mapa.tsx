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
    <section className="flex flex-col pt-16 md:h-screen md:pt-20">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-6 py-5 md:px-10">
        <div>
          <p className="label-mono !text-celeste">Sección 02</p>
          <h1 className="display-serif mt-2 text-4xl">Mapa de Casos</h1>
        </div>
        <div className="text-right">
          <p className="label-mono">Casos registrados</p>
          <p className="font-mono text-3xl">{String(cases.length).padStart(3, "0")}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col md:flex-row md:overflow-hidden">
        <aside className="order-2 w-full space-y-6 overflow-y-auto border-border p-6 md:order-1 md:w-96 md:border-r">
          <div className="space-y-3">
            <p className="label-mono">Filtros</p>
            <Select label="Localidad" value={loc} onChange={setLoc} options={localidades} />
            <Select label="Categoría" value={tipo} onChange={setTipo} options={tiposFenomeno} />
            <div className="grid grid-cols-2 gap-2">
              <label><span className="label-mono">Desde</span><input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={`${inputCls} mt-1`} /></label>
              <label><span className="label-mono">Hasta</span><input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={`${inputCls} mt-1`} /></label>
            </div>
          </div>
          <div className="border-t border-border pt-6">
            <p className="label-mono">Expediente seleccionado</p>
            {sel ? (
              <div className="mt-3">
                <p className="font-mono text-xs text-celeste">{sel.codigo}</p>
                <p className="mt-1 font-serif text-2xl">{sel.titulo}</p>
                <p className="mt-2 text-xs text-muted-foreground">{sel.fecha} · {sel.localidad} · {sel.tipo}</p>
                <p className="mt-3 text-sm text-foreground/80">{sel.descripcion}</p>
                <Link to="/casos/$codigo" params={{ codigo: sel.codigo }} className="mt-4 inline-block border border-border px-4 py-2 text-sm hover:border-celeste hover:text-celeste">Abrir ficha completa</Link>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                {expedientes.length === 0
                  ? "Aún no hay casos georreferenciados. La cartografía está lista para incorporar registros verificados."
                  : "Seleccione un marcador para consultar el expediente."}
              </p>
            )}
          </div>
          <div className="border-t border-border pt-6">
            <p className="label-mono mb-3">Leyenda</p>
            <ul className="space-y-2 text-sm text-foreground/80">
              <li className="flex items-center gap-3"><span className="h-3 w-3 rounded-full border border-celeste bg-celeste/30" /> Registro documentado</li>
              <li className="flex items-center gap-3"><span className="font-mono text-xs text-silver">+</span> Localidad de referencia</li>
            </ul>
          </div>
        </aside>
        <div className="relative order-1 h-[60vh] flex-1 md:order-2 md:h-auto">
          <ClientOnly fallback={<div className="h-full w-full bg-card" />}>
            <Suspense fallback={<div className="h-full w-full bg-card" />}>
              <CaseMap cases={cases} onSelect={onSelect} />
            </Suspense>
          </ClientOnly>
        </div>
      </div>
    </section>
  );
}
