import type { ReactNode } from "react";

export function PageHeader({ code, title, lead }: { code: string; title: string; lead: string }) {
  return (
    <header className="mx-auto max-w-7xl px-6 pb-12 pt-32 md:px-10 md:pt-44">
      <div className="rise flex items-center gap-4">
        <span className="label-mono !text-celeste">{code}</span>
        <span className="h-px w-16 bg-border" />
        <span className="label-mono">APFAA</span>
      </div>
      <h1 className="rise display-serif mt-6 text-5xl md:text-7xl" style={{ animationDelay: "80ms" }}>{title}</h1>
      <p className="rise mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg" style={{ animationDelay: "160ms" }}>
        {lead}
      </p>
    </header>
  );
}

export function EmptyState({ code, title, children }: { code: string; title: string; children: ReactNode }) {
  return (
    <div className="relative border border-dashed border-border px-8 py-20 text-center">
      <span className="label-mono">{code}</span>
      <p className="display-serif mx-auto mt-4 max-w-xl text-3xl">{title}</p>
      <div className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  );
}

export function FieldSchema({ fields }: { fields: string[] }) {
  return (
    <div className="mt-10">
      <p className="label-mono mb-3">Estructura de ficha</p>
      <div className="flex flex-wrap gap-2">
        {fields.map((f, i) => (
          <span key={f} className="border border-border px-3 py-1.5 font-mono text-[0.7rem] text-foreground/70">
            <span className="text-celeste">{String(i + 1).padStart(2, "0")}</span> {f}
          </span>
        ))}
      </div>
    </div>
  );
}

export const inputCls =
  "h-11 w-full border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-celeste focus:outline-none";
