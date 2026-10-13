// Estructuras del archivo APFAA. Los arreglos están vacíos a propósito:
// solo deben contener registros reales y documentados.

export type EstadoInvestigacion = "Abierto" | "En análisis" | "Explicado" | "No concluyente" | "Archivado";

export interface Fuente {
  titulo: string;
  tipo: "Testimonio" | "Documento" | "Prensa" | "Fotografía" | "Video" | "Otro";
  url?: string;
}

export interface Expediente {
  codigo: string; // p. ej. "APFAA-0001"
  titulo: string;
  fecha: string; // ISO yyyy-mm-dd
  localidad: string;
  region: string;
  tipo: string;
  descripcion: string;
  estado: EstadoInvestigacion;
  fuentes: Fuente[];
  coordenadas?: [number, number]; // [lat, lng]
}

export interface MaterialVisual {
  id: string;
  titulo: string;
  fecha: string;
  localidad: string;
  descripcion: string;
  procedencia: string;
  expediente?: string;
  src: string;
  tipo: "Fotografía" | "Video" | "Captura" | "Documento escaneado";
}

export interface Reporte {
  id: string;
  titulo: string;
  fecha: string;
  tema: string;
  region: string;
  expediente?: string;
  resumen: string;
  pdf?: string;
}

export const expedientes: Expediente[] = [];
export const materiales: MaterialVisual[] = [];
export const reportes: Reporte[] = [];

export const localidades = ["El Bolsón", "Lago Puelo", "El Hoyo", "Epuyén", "Bariloche", "Cholila", "El Maitén"];
export const tiposFenomeno = ["Luz nocturna", "Objeto diurno", "Fenómeno lumínico múltiple", "Rastro / marca en suelo", "Interferencia", "Otro"];
export const estados: EstadoInvestigacion[] = ["Abierto", "En análisis", "Explicado", "No concluyente", "Archivado"];

export const CONTACTO_EMAIL = "contacto@apfaa.ar";
