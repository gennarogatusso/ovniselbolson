import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageHeader, EmptyState, FieldSchema, inputCls } from "@/components/site/Archive";
import { expedientes, localidades, tiposFenomeno, estados } from "@/lib/archive";

export const Route = createFileRoute("/casos/")({
  head: () => ({
    meta: [
      { title: "Archivo de Casos — APFAA" },
      { name: "description", content: "Catálogo documental de expedientes de fenómenos aéreos anómalos de la Comarca Andina y la Patagonia." },
      { property: "og:title", content: "Archivo de Casos — APFAA" },
      { property: "og:description", content: "Catálogo de expedientes con fuentes, fechas y estado de investigación." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Casos,
});

function Casos() {
  const [q, setQ] = useState("");
  const [loc, setLoc] = useState("");
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");

  const list = useMemo(
    () =>
      expedientes.filter(
        (e) =>
          (!q || `${e.codigo} ${e.titulo} ${e.descripcion}`.toLowerCase().includes(q.toLowerCase())) &&
          (!loc || e.localidad === loc) &&
          (!tipo || e.tipo === tipo) &&
          (!estado || e.estado === estado),
      ),
    [q, loc, tipo, estado],
  );

  return (
    <>
      <PageHeader code="Sección 01" title="Archivo de Casos" lead="Catálogo de expedientes documentados. Cada ficha registra fecha, localidad, tipo de fenómeno, estado de investigación y fuentes asociadas." />
      <section className="mx-auto max-w-7xl px-6 pb-28 md:px-10">
        <div className="grid gap-3 border-y border-border py-6 md:grid-cols-12">
          <label className="relative md:col-span-5">
            <span className="sr-only">Buscar</span>
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código, título o descripción" className={`${inputCls} pl-10`} />
          </label>
          <Select label="Localidad" value={loc} onChange={setLoc} options={localidades} className="md:col-span-3" />
          <Select label="Tipo" value={tipo} onChange={setTipo} options={tiposFenomeno} className="md:col-span-2" />
          <Select label="Estado" value={estado} onChange={setEstado} options={estados} className="md:col-span-2" />
        </div>
        <div className="flex justify-between py-4">
          <span className="label-mono">{list.length} expedientes</span>
          <span className="label-mono">Orden: fecha ↓</span>
        </div>

        {list.length === 0 ? (
          <EmptyState code="Catálogo · En preparación" title="El archivo se encuentra en proceso de catalogación.">
            Los expedientes se incorporarán a medida que cada testimonio y sus fuentes sean verificados y documentados. APFAA no publica casos sin respaldo documental.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {list.map((e) => (
              <li key={e.codigo}>
                <Link to="/casos/$codigo" params={{ codigo: e.codigo }} className="grid gap-2 py-5 hover:bg-graphite/30 md:grid-cols-12">
                  <span className="font-mono text-xs text-celeste md:col-span-2">{e.codigo}</span>
                  <span className="font-serif text-xl md:col-span-5">{e.titulo}</span>
                  <span className="text-sm text-muted-foreground md:col-span-2">{e.fecha}</span>
                  <span className="text-sm text-muted-foreground md:col-span-2">{e.localidad}</span>
                  <span className={`label-mono md:col-span-1 ${e.estado === "RESUELTO" ? "inline-flex w-fit items-center border border-emerald-400/40 bg-emerald-400/10 px-2 py-1 text-emerald-300" : ""}`}>{e.estado}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <FieldSchema fields={["Código del expediente", "Título del caso", "Fecha del avistamiento", "Localidad o región", "Tipo de fenómeno", "Breve descripción", "Estado de investigación", "Fuentes y documentación"]} />
      </section>
    </>
  );
}

export function Select({ label, value, onChange, options, className = "" }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[]; className?: string }) {
  return (
    <label className={className}>
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        <option value="">{label}: todos</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
