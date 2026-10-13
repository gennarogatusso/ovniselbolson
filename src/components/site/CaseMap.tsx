import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Expediente } from "@/lib/archive";

const LOCALIDADES: [string, number, number][] = [
  ["Bariloche", -41.1335, -71.3103],
  ["El Bolsón", -41.9644, -71.5337],
  ["Lago Puelo", -42.0667, -71.6],
  ["El Hoyo", -42.0667, -71.5167],
  ["Epuyén", -42.2306, -71.3653],
];

export default function CaseMap({ cases, onSelect }: { cases: Expediente[]; onSelect: (e: Expediente) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    const map = L.map(ref.current, { zoomControl: true, minZoom: 4 }).setView([-41.75, -71.45], 9);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);
    LOCALIDADES.forEach(([n, lat, lng]) =>
      L.marker([lat, lng], {
        interactive: false,
        icon: L.divIcon({
          className: "",
          html: `<div style="font:500 10px 'IBM Plex Mono',monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--silver);white-space:nowrap;transform:translate(8px,-6px)">+ ${n}</div>`,
        }),
      }).addTo(map),
    );
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
      L.circleMarker(c.coordenadas, { radius: 6, color: "oklch(0.8 0.09 230)", weight: 1.5, fillOpacity: 0.35 })
        .on("click", () => onSelect(c))
        .addTo(layer);
    });
  }, [cases, onSelect]);

  return <div ref={ref} className="h-full w-full" aria-label="Mapa interactivo de casos" />;
}
