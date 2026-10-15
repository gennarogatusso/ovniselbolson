import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Expediente } from "@/lib/archive";

const ufoIcon = L.divIcon({
  className: "",
  iconSize: [34, 22],
  iconAnchor: [17, 11],
  popupAnchor: [0, -10],
  html: `<svg width="34" height="22" viewBox="0 0 34 22" style="filter:drop-shadow(0 0 6px oklch(0.8 0.09 230))"><path d="M11 10 Q17 1 23 10Z" fill="oklch(0.8 0.09 230 / .55)" stroke="oklch(0.9 0.05 230)" stroke-width="1"/><ellipse cx="17" cy="12" rx="15" ry="4.5" fill="oklch(0.25 0.02 260)" stroke="oklch(0.85 0.08 230)" stroke-width="1.3"/><circle cx="9" cy="12" r="1.1" fill="oklch(0.9 0.1 85)"/><circle cx="17" cy="13" r="1.1" fill="oklch(0.9 0.1 85)"/><circle cx="25" cy="12" r="1.1" fill="oklch(0.9 0.1 85)"/></svg>`,
});

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export default function CaseMap({ cases, onSelect }: { cases: Expediente[]; onSelect: (e: Expediente) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, { zoomControl: true, minZoom: 3 });
    map.fitBounds([[-36.0, -73.5], [-55.2, -62.5]]);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();
    cases.forEach((c) => {
      if (!c.coordenadas) return;
      const breve = c.descripcion.length > 180 ? c.descripcion.slice(0, 180) + "…" : c.descripcion;
      const html = `<div style="font-family:Manrope,sans-serif;max-width:240px">
        <div style="font:500 10px 'IBM Plex Mono',monospace;letter-spacing:.12em;color:oklch(0.8 0.09 230)">${esc(c.codigo)}</div>
        <div style="font-family:Newsreader,serif;font-size:18px;line-height:1.2;margin:4px 0">${esc(c.titulo)}</div>
        <div style="font-size:11px;opacity:.7">${esc(c.fechaDetalle ?? c.fecha)} · ${esc(c.region)}</div>
        ${c.coordenadasNota ? `<div style="font-size:11px;color:oklch(0.8 0.09 230);margin-top:4px">${esc(c.coordenadasNota)}</div>` : ""}
        <p style="font-size:12px;margin:8px 0">${esc(breve)}</p>
        <a href="/casos/${encodeURIComponent(c.codigo)}" style="display:inline-block;border:1px solid oklch(0.8 0.09 230);padding:4px 10px;font-size:12px;color:oklch(0.8 0.09 230)">Abrir expediente</a>
      </div>`;
      L.marker(c.coordenadas, { icon: ufoIcon, title: c.titulo })
        .bindPopup(html)
        .on("click", () => onSelect(c))
        .addTo(layer);
    });
  }, [cases, onSelect]);

  return <div ref={ref} className="h-full w-full" aria-label="Mapa interactivo de casos" />;
}
