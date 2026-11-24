import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, Star, X } from "lucide-react";

export const NAV = [
  { to: "/casos", label: "Casos" },
  { to: "/mapa", label: "Mapa de Casos" },
  { to: "/imagenes", label: "Galería" },
  { to: "/reportes", label: "Publicaciones" },
  { to: "/juego", label: "Jugar" },
  { to: "/about", label: "Sobre mí" },
] as const;

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const home = pathname === "/";

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  const solid = scrolled || !home || open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[1000] transition-all duration-500 ${
        solid ? "border-b border-border bg-background/80 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 md:h-20 md:px-10">
        <Link to="/" className="flex items-center gap-3" aria-label="Gennaro Montecino — inicio">
          <img src="/imagens/logo%20gennaro.png.png" alt="Logo de Gennaro Montecino" className="h-10 w-14 object-contain md:h-12 md:w-16" />
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="font-serif text-base tracking-wide md:text-lg">Gennaro Montecino</span>
            <span className="label-mono !text-[0.6rem]">Videojuegos · Ufología</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Principal">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={`inline-flex items-center gap-1.5 text-[0.8rem] tracking-wide transition-colors hover:text-foreground ${n.to === "/juego" ? "font-semibold text-amber-200 hover:text-amber-100" : "text-foreground/75"}`}
              activeProps={{ className: "!text-celeste" }}
            >
              {n.to === "/juego" && <Star size={12} fill="currentColor" />}
              {n.label}
            </Link>
          ))}
        </nav>

        <button
          className="p-2 md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <nav className="border-t border-border px-6 pb-6 md:hidden" aria-label="Móvil">
          {NAV.map((n, i) => (
            <Link key={n.to} to={n.to} className="flex items-baseline gap-4 border-b border-border py-4">
              <span className="label-mono">0{i + 1}</span>
              <span className="flex items-center gap-2 font-serif text-2xl">{n.to === "/juego" && <Star size={14} fill="currentColor" className="text-amber-200" />}{n.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
