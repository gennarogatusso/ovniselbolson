import polancoDiario from "@/assets/polanco-diario.jpg.asset.json";
import polancoEsquema from "@/assets/polanco-esquema.jpg.asset.json";
// Estructuras del archivo APFAA. Los arreglos están vacíos a propósito:
// solo deben contener registros reales y documentados.

export type EstadoInvestigacion = "Abierto" | "En análisis" | "Explicado" | "No concluyente" | "Archivado" | "Sin explicación concluyente documentada" | "Caso histórico con hipótesis oficial posterior";

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
  lead?: string;
  cierre?: string;
  protagonista?: string;
  imagenes?: { src: string; pie: string; fuente: string }[];
  localidad: string;
  region: string;
  tipo: string;
  descripcion: string;
  estado: EstadoInvestigacion;
  fuentes: Fuente[];
  coordenadas?: [number, number]; // [lat, lng] aproximadas
  coordenadasNota?: string;
}

export interface MaterialVisual {
  id: string;
  titulo: string;
  fecha: string;
  localidad: string;
  descripcion: string;
  procedencia: string;
  expediente?: string;
  src?: string;
  tipo: "Fotografía" | "Video" | "Captura" | "Documento" | "Reconstrucción" | "Documento escaneado";
  url?: string;
  creditos?: string;
  verificacion?: string;
  pendiente?: boolean;
  video?: string;
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
    coordenadas: [-42.6, -63.8],
    coordenadasNota: "Punto orientativo: zona general del reporte, no posición exacta.",
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
    coordenadas: [-41.9644, -71.5337],
    tipo: "Avistamiento luminoso reportado por testigos",
    descripcion: "Varios vecinos reportaron luces multicolores que parecían desplazarse de forma errática sobre los cerros Morrudo, Barda Negra y Perito Moreno. Según el testimonio de un refugiero citado por la prensa, las luces cambiaban entre blanco, rojo y azul. Una de ellas habría comenzado a elevarse antes de desaparecer. Los relatos no permitieron establecer una explicación concluyente y la noticia señaló que no había evidencia fotográfica fiable para confirmar la naturaleza del fenómeno.",
    estado: "Sin explicación concluyente documentada",
    fuentes: [
      { titulo: "TN", tipo: "Prensa", url: "https://tn.com.ar/increible/2022/06/23/extranas-luces-aparecieron-en-el-cielo-de-el-bolson-y-alertaron-a-todos-los-vecinos/" },
      { titulo: "Radio Mitre", tipo: "Prensa", url: "https://radiomitre.cienradios.com/curiosidades/vecinos-de-el-bolson-alertaron-sobre-unas-luces-extranas-en-el-cielo-empezo-a-elevarse-y-desaparecio/" },
      { titulo: "La 100", tipo: "Prensa", url: "https://la100.cienradios.com/sociedad/aparecieron-luces-extranas-multicolores-en-el-cielo-de-el-bolson-y-los-vecinos-entraron-en-panico/" },
    ],
  },
  {
    codigo: "APFAA-003",
    titulo: "El incidente OVNI de Bariloche: Caso Polanco",
    fecha: "1995-07-31",
    fechaDetalle: "31 de julio de 1995",
    localidad: "Bariloche",
    region: "Bariloche, Río Negro, Argentina",
    coordenadas: [-41.1335, -71.3103],
    tipo: "Fenómeno aéreo anómalo reportado por tripulación aeronáutica",
    protagonista: "Jorge Polanco, comandante de una aeronave de Aerolíneas Argentinas",
    lead: "Una noche, una aproximación a Bariloche y una presencia luminosa que la tripulación no esperaba encontrar.",
    imagenes: [
      { src: polancoDiario.url, pie: "Recorte de prensa sobre el incidente: «Otro piloto confirma que vio al OVNI».", fuente: "Recorte periodístico. Medio y fecha de publicación sin verificar." },
      { src: polancoEsquema.url, pie: "Esquema de reconstrucción de la trayectoria de la luz sobre el lago Nahuel Huapi, con fragmentos de las comunicaciones entre ARG 674 y la torre.", fuente: "Reconstrucción posterior. Autoría sin verificar." },
    ],
    descripcion: `El 31 de julio de 1995, el comandante Jorge Polanco se encontraba al mando de un vuelo de Aerolíneas Argentinas que se aproximaba a Bariloche. Lo que debía ser una operación aérea rutinaria terminó convirtiéndose en uno de los episodios más conocidos de la ufología argentina.

Según los relatos difundidos posteriormente, durante la aproximación apareció una intensa luz que llamó la atención de la tripulación. El fenómeno habría permanecido visible durante varios minutos y, de acuerdo con los testimonios, la situación llegó a interferir con el desarrollo normal de la aproximación. El incidente también involucró comunicaciones con el aeropuerto y referencias a otra aeronave. Los relatos señalan además que se produjo un corte de energía eléctrica en el momento en que la tripulación observaba el fenómeno.

Lo que vuelve particularmente interesante este episodio no es solamente lo que los tripulantes afirmaron haber visto, sino la posibilidad de contrastar sus testimonios con las comunicaciones aeronáuticas, las declaraciones posteriores y la documentación reunida años después.

El caso adquirió una importante repercusión pública y fue retomado en programas televisivos y publicaciones dedicadas a los fenómenos aéreos anómalos. Décadas después, continúa siendo una referencia habitual cuando se habla de avistamientos reportados por pilotos en Argentina.

Sin embargo, hay un detalle fundamental: la Fuerza Aérea Argentina examinó posteriormente el incidente y planteó una hipótesis explicativa relacionada con un reflector y la iluminación de las nubes. Esa interpretación también forma parte del expediente y se presenta junto con los testimonios, sin ocultarla ni dar por resuelta toda cuestión que no esté respaldada por la documentación disponible.`,
    cierre: "El interés de este caso está precisamente en esa tensión: un testimonio aeronáutico extraordinario, documentación que permite reconstruir parte de lo sucedido y una explicación posterior que puede contrastarse con los relatos originales.",
    estado: "Caso histórico con hipótesis oficial posterior",
    fuentes: [
      { titulo: "CEFORA — documentación y antecedentes sobre el caso", tipo: "Documento", url: "https://www.cefora.com.ar/archivos/701" },
      { titulo: "Informe de la Fuerza Aérea Argentina (CEFAe, 2018)", tipo: "Documento", url: "https://www.argentina.gob.ar/sites/default/files/informe_cefae_2018.pdf" },
    ],
  },
];
export const materiales: MaterialVisual[] = [
  {
    id: "DOD_109584445",
    titulo: "DOD_109584445 — Objeto registrado por un sensor militar en Medio Oriente",
    fecha: "2022",
    localidad: "Medio Oriente",
    descripcion: "Registro de un objeto aparentemente esférico observado por un sensor militar en Medio Oriente. La fuente oficial no establece su naturaleza.",
    procedencia: "DVIDS / Departamento de Defensa de Estados Unidos",
    tipo: "Video",
    video: "https://d34w7g4gy10iej.cloudfront.net/video/2304/DOD_109584445/DOD_109584445.mp4",
    url: "https://www.dvidshub.net/video/880273/middle-east-object",
    pendiente: true,
    verificacion: "Fuente oficial: DVIDS",
  },
];
export const reportes: Reporte[] = [];

export const localidades = ["El Bolsón", "Lago Puelo", "El Hoyo", "Epuyén", "Bariloche", "Cholila", "El Maitén", "Península Valdés"];
export const tiposFenomeno = ["Luz nocturna", "Objeto diurno", "Fenómeno lumínico múltiple", "Rastro / marca en suelo", "Interferencia", "Avistamiento luminoso reportado por testigos", "Avistamiento luminoso con registro de comunicación de radio", "Fenómeno aéreo anómalo reportado por tripulación aeronáutica", "Otro"];
export const estados: EstadoInvestigacion[] = ["Abierto", "En análisis", "Explicado", "No concluyente", "Archivado", "Sin explicación concluyente documentada", "Caso histórico con hipótesis oficial posterior"];

export const CONTACTO_EMAIL = "montecinogenaro@gmail.com";
