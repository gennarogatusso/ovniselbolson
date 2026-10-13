import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo.png.asset.json";
import { NAV } from "./SiteHeader";
import { CONTACTO_EMAIL } from "@/lib/archive";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-12 md:px-10">
        <div className="flex gap-5 md:col-span-5">
          <img src={logo.url} alt="Logotipo APFAA" className="h-16 w-16 shrink-0" />
          <div>
            <p className="font-serif text-xl">APFAA</p>
            <p className="label-mono mt-1">Archivo Patagónico de Fenómenos Aéreos Anómalos</p>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground">
              Archivo independiente de fenómenos aéreos anómalos de la Patagonia argentina.
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
          <span className="label-mono">© {year} APFAA</span>
          <span className="label-mono">41.9°S · 71.5°O — Comarca Andina</span>
        </div>
      </div>
    </footer>
  );
}
