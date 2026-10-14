// Estructuras del archivo APFAA. Los arreglos están vacíos a propósito:
// solo deben contener registros reales y documentados.

export type EstadoInvestigacion = "Abierto" | "En análisis" | "Explicado" | "No concluyente" | "Archivado" | "Sin explicación concluyente documentada";

export interface Fuente {
  titulo: string;
  tipo: "Testimonio" | "Documento" | "Prensa" | "Fotografía" | "Video" | "Otro";
  url?: string;
}

export interface Expediente {
  codigo: string; // p. ej. "APFAA-0001"
  titulo: string;
  fecha: string; // ISO yyyy-mm-dd
  fechaDetalle?: string;
  audio?: string;
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

export const expedientes: Expediente[] = [
  {
    codigo: "APFAA-002",
    titulo: "Ovni sobre Puerto Madryn grabado por Prefectura Naval Argentina",
    fecha: "2023-08-29",
    fechaDetalle: "Madrugada del 29 de agosto de 2023",
    localidad: "Península Valdés",
    region: "Aguas del Atlántico, cerca de la península Valdés, Chubut, Argentina",
    tipo: "Avistamiento luminoso con registro de comunicación de radio",
    descripcion: "El primer oficial del buque mercante San Matías I comunicó a la estación L4S de Prefectura Naval Argentina que la tripulación observaba varias luces anaranjadas que parecían emerger desde el horizonte marítimo y desplazarse por el cielo en distintas direcciones. Durante la comunicación describieron movimientos de ida y vuelta, desapariciones y reapariciones. Según la cobertura periodística, se consultaron los radares sin obtener detecciones relacionadas con el fenómeno. El episodio quedó registrado en una comunicación de radio difundida posteriormente por medios de comunicación. La naturaleza de las luces no quedó establecida mediante la información publicada.",
    estado: "Sin explicación concluyente documentada",
    audio: "https://partedepesca.com.ar/d/wp-content/uploads/2023/08/comunicacion-BT-San-Matias-con-L4S-PNA.mp3?utm_source=chatgpt.com",
    fuentes: [
      { titulo: "Parte de Pesca", tipo: "Prensa", url: "https://partedepesca.com.ar/d/un-buque-mercante-reporto-a-prefectura-el-avistamiento-de-ovnis-cerca-de-peninsula-valdes/" },
      { titulo: "Deproa", tipo: "Prensa", url: "https://deproa.com.ar/avistamiento-de-ovnis-de-un-buque-en-aguas-chubutenses-audio-del-buque-con-prefectura/" },
      { titulo: "Canal 12", tipo: "Prensa", url: "https://canal12web.com/testimonios-de-un-increible-avistaje-de-ovnis-en-puerto-madryn-salieron-a-la-luz/" },
    ],
  },
  {
    codigo: "APFAA-001",
    titulo: "Luces anómalas sobre El Bolsón",
    fecha: "2022-06-22",
    fechaDetalle: "22 de junio de 2022, aprox. 22:30",
    localidad: "El Bolsón",
    region: "El Bolsón, Río Negro, Argentina",
    tipo: "Avistamiento luminoso reportado por testigos",
    descripcion: "Varios vecinos reportaron luces multicolores que parecían desplazarse de forma errática sobre los cerros Morrudo, Barda Negra y Perito Moreno. Según el testimonio de un refugiero citado por la prensa, las luces cambiaban entre blanco, rojo y azul. Una de ellas habría comenzado a elevarse antes de desaparecer. Los relatos no permitieron establecer una explicación concluyente y la noticia señaló que no había evidencia fotográfica fiable para confirmar la naturaleza del fenómeno.",
    estado: "Sin explicación concluyente documentada",
    fuentes: [
      { titulo: "TN", tipo: "Prensa", url: "https://tn.com.ar/increible/2022/06/23/extranas-luces-aparecieron-en-el-cielo-de-el-bolson-y-alertaron-a-todos-los-vecinos/" },
      { titulo: "Radio Mitre", tipo: "Prensa", url: "https://radiomitre.cienradios.com/curiosidades/vecinos-de-el-bolson-alertaron-sobre-unas-luces-extranas-en-el-cielo-empezo-a-elevarse-y-desaparecio/" },
      { titulo: "La 100", tipo: "Prensa", url: "https://la100.cienradios.com/sociedad/aparecieron-luces-extranas-multicolores-en-el-cielo-de-el-bolson-y-los-vecinos-entraron-en-panico/" },
    ],
  },
];
export const materiales: MaterialVisual[] = [];
export const reportes: Reporte[] = [];

export const localidades = ["El Bolsón", "Lago Puelo", "El Hoyo", "Epuyén", "Bariloche", "Cholila", "El Maitén", "Península Valdés"];
export const tiposFenomeno = ["Luz nocturna", "Objeto diurno", "Fenómeno lumínico múltiple", "Rastro / marca en suelo", "Interferencia", "Avistamiento luminoso reportado por testigos", "Avistamiento luminoso con registro de comunicación de radio", "Otro"];
export const estados: EstadoInvestigacion[] = ["Abierto", "En análisis", "Explicado", "No concluyente", "Archivado", "Sin explicación concluyente documentada"];

export const CONTACTO_EMAIL = "montecinogenaro@gmail.com";
