import { Link } from "@tanstack/react-router";
import { NAV } from "./SiteHeader";
import { CONTACTO_EMAIL } from "@/lib/archive";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-12 md:px-10">
        <div className="flex gap-5 md:col-span-5">
          <img src="/imagens/logo%20gennaro.png.png" alt="Logo de Gennaro Montecino" className="h-16 w-24 shrink-0 bg-black object-contain" />
          <div>
            <p className="font-serif text-xl">Gennaro Montecino</p>
            <p className="label-mono mt-1">Videojuegos · Ufología · Investigaciones</p>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Página dedicada a la publicación de mis videojuegos y casos ufológicos de la zona.
            </p>
          </div>
        </div>
        <nav className="md:col-span-3" aria-label="Pie">
          <p className="label-mono mb-4">Secciones</p>
          <ul className="space-y-2 text-sm">
            {NAV.map((n) => (
              <li key={n.to}>
                <Link to={n.to} className="text-foreground/75 hover:text-celeste">{n.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="space-y-6 text-sm md:col-span-4">
          <div>
            <p className="label-mono mb-2">Contacto</p>
            <a href={`mailto:${CONTACTO_EMAIL}`} className="text-foreground/75 hover:text-celeste">{CONTACTO_EMAIL}</a>
          </div>
          <div>
            <p className="label-mono mb-2">Instagram</p>
            <span className="text-muted-foreground">Cuenta próximamente</span>
          </div>
          <div>
            <p className="label-mono mb-2">Privacidad</p>
            <p className="text-muted-foreground">
              Este sitio no recopila datos personales ni utiliza cookies de seguimiento. Los testimonios se publican solo con consentimiento expreso.
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 px-6 py-6 md:flex-row md:px-10">
          <span className="label-mono">© {year} Gennaro Montecino</span>
          <span className="label-mono">El Bolsón · Patagonia argentina</span>
        </div>
      </div>
    </footer>
  );
}
