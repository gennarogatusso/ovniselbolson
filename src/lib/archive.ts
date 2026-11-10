import polancoDiario from "@/assets/polanco-diario.jpg.asset.json";
import polancoEsquema from "@/assets/polanco-esquema.jpg.asset.json";
import bolson1 from "@/assets/el_bolson_1.jpg.asset.json";
import bolson2 from "@/assets/el_bolson_2.png.asset.json";
import chubut0 from "@/assets/OVNI_CHUBUT_0.jpg.asset.json";
import chubut1 from "@/assets/OVNI_CHUBUT_1.png.asset.json";
import chubut2 from "@/assets/OVNI_CHUBUT_2.jpg.asset.json";
// Estructuras del archivo APFAA. Los arreglos están vacíos a propósito:
// solo deben contener registros reales y documentados.

export type EstadoInvestigacion = "Abierto" | "En análisis" | "Explicado" | "No concluyente" | "Archivado" | "Sin explicación concluyente documentada" | "Caso histórico con hipótesis oficial posterior" | "RESUELTO";

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
    codigo: "APFAA-006",
    titulo: "Fenómeno Aéreo Desconocido visto en toda la Patagonia",
    fecha: "2026-11-02",
    fechaDetalle: "Noche del 2 de noviembre de 2026",
    localidad: "Varias localidades",
    region: "Patagonia argentina; reportes en Chubut y Santa Cruz, entre otras zonas.",
    tipo: "Fenómeno luminoso con estela / posible reingreso de restos espaciales",
    lead: "Una intensa estela luminosa observada desde distintos puntos de la Patagonia durante la noche del 2 de noviembre de 2026.",
    imagenes: [
      {
        src: "/imagens/imagen1.png",
        pie: "Registro fotográfico compartido del fenómeno luminoso.",
        fuente: "Imagen aportada para este expediente; autoría y ubicación no indicadas."
      },
      {
        src: "/imagens/imagen2.png",
        pie: "Registro fotográfico compartido del fenómeno luminoso.",
        fuente: "Imagen aportada para este expediente; autoría y ubicación no indicadas."
      },
      {
        src: "/imagens/imagen3.png",
        pie: "Registro fotográfico compartido del fenómeno luminoso.",
        fuente: "Imagen aportada para este expediente; autoría y ubicación no indicadas."
      }
    ],
    descripcion: `Durante la noche del 2 de noviembre de 2026, habitantes de distintas localidades de la Patagonia observaron un llamativo fenómeno luminoso en el cielo. Numerosos registros compartidos en redes sociales y medios regionales mostraron una intensa estela brillante que llamó la atención de vecinos de Chubut y Santa Cruz, entre otras zonas.

La explicación más probable difundida públicamente apunta al reingreso atmosférico de restos de un cohete chino CZ-2C, que habría producido el efecto visual conocido como «medusa espacial» (space jellyfish).

Esta interpretación fue difundida por referentes de RS Astroturismo y reproducida por medios regionales. La identificación se presenta como una explicación probable y no como una confirmación oficial: no se incorpora al expediente un documento oficial que establezca de manera concluyente el origen del fenómeno.`,
    cierre: "La clasificación RESUELTO refleja la explicación más probable difundida públicamente. No implica que exista una confirmación oficial documentada.",
    estado: "RESUELTO",
    fuentes: [
      { titulo: "La Opinión Austral — Misteriosas luces iluminaron el cielo de Santa Cruz", tipo: "Prensa", url: "https://laopinionaustral.com.ar/chubut/misteriosas-luces-iluminaron-el-cielo-de-santa-cruz-que-fue-lo-que-se-vio-727190.html" },
      { titulo: "La Opinión Austral — La verdad detrás de la medusa espacial", tipo: "Prensa", url: "https://laopinionaustral.com.ar/videos/amp-la-verdad-detrs-del-ovni-o-la-medusa-espacial-que-sorprendi-a-vecinos-en-la-patagonia-727344.html" },
      { titulo: "Radio 3 — Una extraña luz cruzó el cielo y sorprendió a Chubut y Santa Cruz", tipo: "Prensa", url: "https://radio3cadenapatagonia.com.ar/una-extrana-luz-cruzo-el-cielo-y-sorprendio-a-chubut-y-santa-cruz/" },
      { titulo: "LU17 — Luces que iluminaron el cielo patagónico: ¿habrían sido restos de basura espacial?", tipo: "Prensa", url: "https://lu17.com/contenido/156046/luces-que-iluminaron-el-cielo-patagonico-habrian-sido-restos-de-basura-espacial" }
    ]
  },
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
  {
    codigo: "APFAA-004",
    titulo: "La esfera metálica de El Bolsón",
    fecha: "1984-01-01",
    fechaDetalle: "Entre 1984 y 1986 (fecha exacta no confirmada)",
    localidad: "El Bolsón",
    region: "El Bolsón, Río Negro, Patagonia Argentina",
    tipo: "Avistamiento OVNI histórico",
    protagonista: "Familia Carranza (según el relato recopilado por Javier E. Stagnaro)",
    imagenes: [
      { src: bolson1.url, pie: "Imagen asociada al relato de la familia Carranza y el avistamiento de El Bolsón.", fuente: "Material aportado al archivo. Procedencia sin verificar." },
      { src: bolson2.url, pie: "Imagen asociada al avistamiento de El Bolsón.", fuente: "Material aportado al archivo. Procedencia sin verificar." },
    ],
    descripcion: `Una familia de El Bolsón habría reportado un UAP / OVNI en el año 1984.

Según el relato recopilado por Javier E. Stagnaro, la familia Carranza observó una misteriosa esfera de apariencia metálica que se desplazaba a baja altura. El objeto tenía pequeñas aletas y reflejaba el color del cielo. No parecía una aeronave convencional.

Mientras los testigos seguían el movimiento del objeto, se habría producido un corte de electricidad en la zona. El relato también menciona que un locutor de Radio Nacional habría sido alertado y comentado lo sucedido en vivo.

Finalmente, la esfera habría ascendido y desaparecido detrás del imponente cerro Piltriquitrón, en dirección a El Maitén, dejando atrás una historia difícil de olvidar.

Lo que vuelve especial a este caso es que habría ocurrido en nuestra propia región, con una familia como protagonista y una historia que merece ser investigada.`,
    cierre: "Relato histórico recopilado por Javier E. Stagnaro. La fecha exacta y los detalles del corte eléctrico aún requieren corroboración independiente.",
    estado: "Sin explicación concluyente documentada",
    fuentes: [
      { titulo: "Consultar relato original — Javier E. Stagnaro, «Austerria, los túneles de Agharta en América»", tipo: "Testimonio", url: "https://elsurdelgrantriangulo-pablo.blogspot.com/2012/09/austerria-los-tuneles-de-agharta-en.html" },
    ],
  },
  {
    codigo: "APFAA-005",
    titulo: "El OVNI de Chubut: «Un objeto nos pasó por arriba»",
    fecha: "1985-08-20",
    fechaDetalle: "20 de agosto de 1985",
    localidad: "Trelew",
    region: "Trelew y valle inferior del río Chubut, Chubut, Patagonia Argentina",
    tipo: "Avistamiento OVNI histórico / registro fotográfico reportado",
    imagenes: [
      { src: chubut0.url, pie: "Material vinculado al episodio de Chubut, agosto de 1985.", fuente: "Material aportado al archivo. Procedencia sin verificar." },
      { src: chubut1.url, pie: "Material vinculado al episodio de Chubut, agosto de 1985.", fuente: "Material aportado al archivo. Procedencia sin verificar." },
      { src: chubut2.url, pie: "Material vinculado al episodio de Chubut, agosto de 1985.", fuente: "Material aportado al archivo. Procedencia sin verificar." },
    ],
    descripcion: `En agosto de 1985, un avistamiento ocurrido en el cielo de Chubut llegó a los medios de comunicación y dejó una imagen que, con el paso del tiempo, se convirtió en parte de la historia ufológica de la Patagonia.

Según las crónicas publicadas en aquella época, el 20 de agosto se observó un objeto de apariencia metálica en el cielo de la región. El episodio fue recogido por la prensa bajo un título tan directo como inquietante: «Un OVNI nos pasó por arriba».

Entre los materiales vinculados al caso se menciona una fotografía atribuida a Marcelo Furs. La imagen y los relatos publicados en torno al episodio alimentaron las preguntas sobre qué era aquel objeto y qué había ocurrido realmente en el cielo chubutense.

Algunas versiones también mencionan información relacionada con observaciones de radar, aunque ese aspecto no puede presentarse como una conclusión definitiva sin documentación suficiente que permita establecer exactamente qué se detectó y dónde.

Décadas después, el caso continúa siendo un episodio llamativo de la historia OVNI argentina. Las imágenes y las crónicas de la época constituyen el punto de partida para reconstruir lo sucedido, aunque por sí solas no permiten determinar la naturaleza del objeto.`,
    cierre: "Caso reconstruido a partir de crónicas periodísticas y recopilaciones posteriores. La naturaleza del objeto y algunos detalles técnicos del episodio no están establecidos de manera concluyente.",
    estado: "Sin explicación concluyente documentada",
    fuentes: [
      { titulo: "Crónica de 1985 — El País, 23 de agosto de 1985", tipo: "Prensa", url: "https://elpais.com/diario/1985/08/23/sociedad/493596007_850215.html" },
      { titulo: "Reproducción de la noticia original — El Chubut", tipo: "Prensa", url: "https://bahiasinfondo.blogspot.com/2016/02/1985-un-ovni-en-el-cielo-de-puerto.html" },
      { titulo: "Investigación complementaria — Visión OVNI", tipo: "Documento", url: "https://www.visionovni.com.ar/archivos/1302" },
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
  {
    id: "COSTA_RICA_1971_BN",
    titulo: "Lago de Cote, Costa Rica — fotograma cartográfico en blanco y negro",
    fecha: "1971",
    localidad: "Lago de Cote, Costa Rica",
    descripcion: "Imagen aportada para el caso atribuido a un vuelo cartográfico del Instituto Geográfico Nacional de Costa Rica en 1971. Según la información del caso, un Aero Commander F680 volaba a unos 10.000 pies para registrar la zona del proyecto hidroeléctrico próximo al volcán Arenal; una cámara Zeiss R-M-K 15/23 tomaba fotografías en blanco y negro cada 20 segundos. Años después se señaló un objeto circular sobre el agua en el fotograma 300, con estimaciones de tamaño muy variables (aproximadamente 80 a más de 200 metros). Se ha informado que investigadores como Jacques Vallée y Richard Haines, y el grupo francés GEPAN, examinaron el negativo y no identificaron alteraciones o defectos evidentes. La naturaleza del objeto no queda establecida por esta imagen; estos antecedentes se presentan como información atribuida al caso.",
    procedencia: "Imagen aportada por el usuario; caso atribuido al vuelo cartográfico del IGN de Costa Rica",
    expediente: "Caso de Costa Rica, 1971",
    src: "/imagens/imagem-11eb8fe8.webp",
    tipo: "Fotografía",
    verificacion: "Antecedentes del caso pendientes de corroboración documental independiente",
  },
  {
    id: "COSTA_RICA_1971_COLOR",
    titulo: "Lago de Cote, Costa Rica — imagen en color",
    fecha: "1971",
    localidad: "Lago de Cote, Costa Rica",
    descripcion: "Versión en color aportada del caso atribuido a un vuelo cartográfico del Instituto Geográfico Nacional de Costa Rica en 1971. La información del caso sitúa el registro durante un vuelo de evaluación cerca del volcán Arenal y atribuye la toma a una cámara cartográfica automática. El objeto circular fue advertido años después al revisar el fotograma 300. Las dimensiones publicadas son estimaciones dispares y no determinan por sí mismas la escala real ni la naturaleza del objeto. La revisión técnica del negativo se atribuye a investigadores como Jacques Vallée y Richard Haines y al grupo GEPAN; no se presenta aquí como una conclusión independiente verificada.",
    procedencia: "Imagen aportada por el usuario; caso atribuido al vuelo cartográfico del IGN de Costa Rica",
    expediente: "Caso de Costa Rica, 1971",
    src: "/imagens/imagem-08712459.webp",
    tipo: "Fotografía",
    verificacion: "Antecedentes del caso pendientes de corroboración documental independiente",
  },
];
export const reportes: Reporte[] = [];

export const localidades = ["El Bolsón", "Lago Puelo", "El Hoyo", "Epuyén", "Bariloche", "Cholila", "El Maitén", "Península Valdés"];
export const tiposFenomeno = ["Luz nocturna", "Objeto diurno", "Fenómeno lumínico múltiple", "Rastro / marca en suelo", "Interferencia", "Avistamiento luminoso reportado por testigos", "Avistamiento luminoso con registro de comunicación de radio", "Fenómeno aéreo anómalo reportado por tripulación aeronáutica", "Fenómeno luminoso con estela / posible reingreso de restos espaciales", "Otro"];
export const estados: EstadoInvestigacion[] = ["Abierto", "En análisis", "Explicado", "No concluyente", "Archivado", "Sin explicación concluyente documentada", "Caso histórico con hipótesis oficial posterior", "RESUELTO"];

export const CONTACTO_EMAIL = "montecinogenaro@gmail.com";
