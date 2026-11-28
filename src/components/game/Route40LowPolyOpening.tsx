import { useEffect, useRef, useState } from "react";
import { Route40Opening as CanvasFallback } from "./Route40Opening";

type V3 = [number, number, number];
type Mesh = { buffer: WebGLBuffer; count: number };

const DURATION = 14.4;
const SIGNAL_Z = -418;
const SIGNAL_STOP_Z = SIGNAL_Z + 70;
const THREAT_Z = SIGNAL_STOP_Z - 22;
const AIRPORT_Z_OFFSET = 36;
const STATION_Z_OFFSET = -85;
const FIELD_X_OFFSET = 77;
const FIELD_Z_OFFSET = -149;
const NPC_NERVOUS_MS = 3000;
const NPC_AIM_RAISE_MS = 720;
const NPC_AIM_HOLD_MS = 1000;
const NPC_WARNING_TEXT = "Tené cuidado... Esta noche vienen ellos.";
const DESTINATION_SIGN_Z = -94;
const DESTINATION_SIGN_TRIGGER_DISTANCE = 7.5;
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const smooth = (a: number, b: number, n: number) => {
  const t = clamp((n - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: V3, n: number): V3 => [a[0] * n, a[1] * n, a[2] * n];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a: V3): V3 => {
  const length = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
};
const hex = (value: string): V3 => {
  const raw = value.replace("#", "");
  return [
    parseInt(raw.slice(0, 2), 16) / 255,
    parseInt(raw.slice(2, 4), 16) / 255,
    parseInt(raw.slice(4, 6), 16) / 255,
  ];
};

class MeshBuilder {
  values: number[] = [];

  triangle(a: V3, b: V3, c: V3, color: V3) {
    const normal = norm(cross(sub(b, a), sub(c, a)));
    for (const point of [a, b, c]) {
      this.values.push(
        point[0], point[1], point[2],
        normal[0], normal[1], normal[2],
        color[0], color[1], color[2],
      );
    }
  }

  quad(a: V3, b: V3, c: V3, d: V3, color: V3) {
    this.triangle(a, b, c, color);
    this.triangle(a, c, d, color);
  }

  box(center: V3, size: V3, color: V3, alternate?: V3) {
    const [x, y, z] = center;
    const [sx, sy, sz] = size.map((v) => v / 2) as V3;
    const p: V3[] = [
      [x - sx, y - sy, z - sz], [x + sx, y - sy, z - sz],
      [x + sx, y + sy, z - sz], [x - sx, y + sy, z - sz],
      [x - sx, y - sy, z + sz], [x + sx, y - sy, z + sz],
      [x + sx, y + sy, z + sz], [x - sx, y + sy, z + sz],
    ];
    const c = color, d = alternate ?? color;
    this.quad(p[0]!, p[3]!, p[2]!, p[1]!, c);
    this.quad(p[4]!, p[5]!, p[6]!, p[7]!, d);
    this.quad(p[0]!, p[4]!, p[7]!, p[3]!, d);
    this.quad(p[1]!, p[2]!, p[6]!, p[5]!, c);
    this.quad(p[3]!, p[7]!, p[6]!, p[2]!, c);
    this.quad(p[0]!, p[1]!, p[5]!, p[4]!, d);
  }

  beam(a: V3, b: V3, width: number, color: V3) {
    const direction = norm(sub(b, a));
    const reference: V3 = Math.abs(direction[1]) > 0.88 ? [1, 0, 0] : [0, 1, 0];
    const side = scale(norm(cross(direction, reference)), width / 2);
    const up = scale(norm(cross(direction, side)), width / 2);
    const p0 = add(add(a, side), up);
    const p1 = add(sub(a, side), up);
    const p2 = sub(sub(a, side), up);
    const p3 = sub(add(a, side), up);
    const q0 = add(add(b, side), up);
    const q1 = add(sub(b, side), up);
    const q2 = sub(sub(b, side), up);
    const q3 = sub(add(b, side), up);
    this.quad(p0, p1, q1, q0, color);
    this.quad(p1, p2, q2, q1, color);
    this.quad(p2, p3, q3, q2, color);
    this.quad(p3, p0, q0, q3, color);
  }

  cone(x: number, y: number, z: number, radius: number, height: number, sides: number, color: V3, light?: V3) {
    const top: V3 = [x, y + height, z];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const b = ((i + 1) / sides) * Math.PI * 2;
      const p1: V3 = [x + Math.cos(a) * radius, y, z + Math.sin(a) * radius];
      const p2: V3 = [x + Math.cos(b) * radius, y, z + Math.sin(b) * radius];
      const shade = (i % 3 === 0 ? 1.1 : i % 3 === 1 ? 0.9 : 0.78);
      const tint = light ?? color;
      this.triangle(top, p1, p2, [tint[0] * shade, tint[1] * shade, tint[2] * shade]);
    }
  }

  disc(cx: number, cy: number, z: number, radius: number, color: V3, segments = 24) {
    const center: V3 = [cx, cy, z];
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      const b = ((i + 1) / segments) * Math.PI * 2;
      this.triangle(
        center,
        [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, z],
        [cx + Math.cos(b) * radius, cy + Math.sin(b) * radius, z],
        color,
      );
    }
  }

  torusXY(cx: number, cy: number, cz: number, radius: number, tube: number, color: V3) {
    const around = 36, ring = 8;
    for (let i = 0; i < around; i++) {
      const a0 = (i / around) * Math.PI * 2, a1 = ((i + 1) / around) * Math.PI * 2;
      for (let j = 0; j < ring; j++) {
        const b0 = (j / ring) * Math.PI * 2, b1 = ((j + 1) / ring) * Math.PI * 2;
        const point = (a: number, b: number): V3 => [
          cx + (radius + Math.cos(b) * tube) * Math.cos(a),
          cy + (radius + Math.cos(b) * tube) * Math.sin(a),
          cz + Math.sin(b) * tube,
        ];
        this.quad(point(a0, b0), point(a1, b0), point(a1, b1), point(a0, b1), color);
      }
    }
  }

  torusYZ(cx:number,cy:number,cz:number,radius:number,tube:number,color:V3){
    const around=28,ring=6;
    for(let i=0;i<around;i++)for(let j=0;j<ring;j++){
      const a0=i/around*Math.PI*2,a1=(i+1)/around*Math.PI*2,b0=j/ring*Math.PI*2,b1=(j+1)/ring*Math.PI*2;
      const p=(a:number,b:number):V3=>[cx+Math.sin(b)*tube,cy+(radius+Math.cos(b)*tube)*Math.cos(a),cz+(radius+Math.cos(b)*tube)*Math.sin(a)];
      this.quad(p(a0,b0),p(a1,b0),p(a1,b1),p(a0,b1),color);
    }
  }
  sphere(cx:number,cy:number,cz:number,radius:number,color:V3,segments=14,rings=9){
    const point=(lat:number,lon:number):V3=>[cx+radius*Math.cos(lat)*Math.cos(lon),cy+radius*Math.sin(lat),cz+radius*Math.cos(lat)*Math.sin(lon)];
    for(let r=0;r<rings;r++){
      const lat0=-Math.PI/2+(r/rings)*Math.PI,lat1=-Math.PI/2+((r+1)/rings)*Math.PI;
      for(let i=0;i<segments;i++){
        const lon0=i/segments*Math.PI*2,lon1=(i+1)/segments*Math.PI*2;
        this.quad(point(lat0,lon0),point(lat1,lon0),point(lat1,lon1),point(lat0,lon1),color);
      }
    }
  }
  ellipsoid(cx:number,cy:number,cz:number,rx:number,ry:number,rz:number,color:V3,segments=9,rings=6){
    const point=(lat:number,lon:number):V3=>[cx+rx*Math.cos(lat)*Math.cos(lon),cy+ry*Math.sin(lat),cz+rz*Math.cos(lat)*Math.sin(lon)];
    for(let r=0;r<rings;r++){
      const lat0=-Math.PI/2+(r/rings)*Math.PI,lat1=-Math.PI/2+((r+1)/rings)*Math.PI;
      for(let i=0;i<segments;i++){
        const lon0=i/segments*Math.PI*2,lon1=(i+1)/segments*Math.PI*2;
        this.quad(point(lat0,lon0),point(lat1,lon0),point(lat1,lon1),point(lat0,lon1),color);
      }
    }
  }
  append(other: MeshBuilder, offset: V3 = [0, 0, 0]) {
    for (let i = 0; i < other.values.length; i += 9) {
      this.values.push(
        other.values[i]! + offset[0], other.values[i + 1]! + offset[1], other.values[i + 2]! + offset[2],
        other.values[i + 3]!, other.values[i + 4]!, other.values[i + 5]!,
        other.values[i + 6]!, other.values[i + 7]!, other.values[i + 8]!,
      );
    }
  }

  data() {
    return new Float32Array(this.values);
  }
}

function randomSource(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function terrainY(x: number, z: number) {
  return 0.12 + Math.sin(x * 0.16 + z * 0.035) * 0.24 + Math.sin(z * 0.11 - x * 0.04) * 0.16;
}
function roadCenter(z: number) {
  const natural = Math.sin(z * 0.023) * 1.7 + Math.sin(z * 0.061) * 0.5;
  // Curva amplia inicial: la ruta cae hacia la derecha y luego recupera su eje.
  const turnIn = smooth(4, 46, -z);
  const turnOut = smooth(58, 112, -z);
  const initialPath = natural + 8.2 * (turnIn - turnOut);
  // Desde el tramo posterior al aeródromo, la ruta se alinea de forma suave y queda recta.
  const straightening = smooth(130, 170, -z);
  return initialPath * (1 - straightening);
}

function roadDipAt(z: number) {
  const descentIn = smooth(3, 43, -z);
  const descentOut = smooth(78, 128, -z);
  return -6.2 * descentIn * (1 - descentOut);
}

function roadHeightAt(z: number) {
  // Se conserva la bajada inicial; desde el valle la calzada queda a una altura constante.
  return 0.18 + roadDipAt(z);
}

function terrainSurfaceY(x: number, z: number) {
  const naturalGround = terrainY(x, z);
  const distanceFromRoad = Math.abs(x - roadCenter(z));
  // El paisaje acompaña la bajada a escala amplia; una holgura local evita que el terreno atraviese el asfalto.
  const downhillEnvelope = 1 - smooth(20, 68, distanceFromRoad);
  const roadClearance = 1 - smooth(6.2, 19, distanceFromRoad);
  const roadsideGround = naturalGround + roadDipAt(z) * downhillEnvelope - 0.78 * roadClearance;
  // Explanada suave del aeródromo al este de la ruta, separada del asfalto por el sendero de bicicletas.
  const airportFieldX = 1 - smooth(27, 43, Math.abs(x + 53.5));
  const airportFieldZ = 1 - smooth(86, 103, Math.abs(z + 131));
  const airportField = airportFieldX * airportFieldZ;
  const pitchArea=(1-smooth(23,34,Math.abs(x+30)))*(1-smooth(39,52,Math.abs(z+315)));
  const schoolArea=(1-smooth(15,25,Math.abs(x+64)))*(1-smooth(15,26,Math.abs(z+315)));
  return mix(mix(roadsideGround,-0.16,airportField),-0.13,Math.max(pitchArea,schoolArea));
}

const PIXEL_GLYPHS: Record<string, string[]> = {
  "A": ["01110","10001","10001","11111","10001","10001","10001"],
  "Y": ["10001","10001","01010","00100","00100","00100","00100"],
  "P": ["11110","10001","10001","11110","10000","10000","10000"],
  "C": ["01111","10000","10000","10000","10000","10000","01111"],
  "D": ["11110","10001","10001","10001","10001","10001","11110"],
  "F": ["11111","10000","10000","11110","10000","10000","10000"],
  "V": ["10001","10001","10001","10001","10001","01010","00100"],
  "E": ["11111","10000","10000","11110","10000","10000","11111"],
  "L": ["10000","10000","10000","10000","10000","10000","11111"],
  "B": ["11110","10001","10001","11110","10001","10001","11110"],
  "O": ["01110","10001","10001","10001","10001","10001","01110"],
  "Ó": ["01110","10001","10001","10001","10001","10001","01110"],
  "S": ["01111","10000","10000","01110","00001","00001","11110"],
  "N": ["10001","11001","11001","10101","10011","10011","10001"],
  "I": ["11111","00100","00100","00100","00100","00100","11111"],
  "T": ["11111","00100","00100","00100","00100","00100","00100"],
  "R": ["11110","10001","10001","11110","10100","10010","10001"],
  "2": ["01110","10001","00001","00010","00100","01000","11111"],
  "K": ["10001","10010","10100","11000","10100","10010","10001"],
  "M": ["10001","11011","10101","10101","10001","10001","10001"],
  "/": ["00001","00010","00010","00100","01000","01000","10000"],
  "H": ["10001","10001","10001","11111","10001","10001","10001"],
  "0": ["01110","10001","10011","10101","11001","10001","01110"],
  "4": ["00010","00110","01010","10010","11111","00010","00010"],
  "6": ["00110","01000","10000","11110","10001","10001","01110"],
  " ": ["00000","00000","00000","00000","00000","00000","00000"],
};

function addPixelText(mesh: MeshBuilder, text: string, centerX: number, centerY: number, z: number, cell: number, color: V3) {
  const chars = Array.from(text);
  const width = chars.length * 5 * cell + Math.max(0, chars.length - 1) * cell;
  let cursor = centerX - width / 2;
  for (const character of chars) {
    const glyph = PIXEL_GLYPHS[character] ?? PIXEL_GLYPHS[" "]!;
    for (let row = 0; row < 7; row++) {
      const pixels = glyph[row] ?? "00000";
      for (let column = 0; column < 5; column++) {
        if (pixels[column] !== "1") continue;
        mesh.box(
          [cursor + column * cell + cell / 2, centerY + (3 - row) * cell, z],
          [cell * 0.82, cell * 0.82, Math.max(0.018, cell * 0.24)],
          color,
        );
      }
    }
    if (character === "Ó") {
      mesh.beam(
        [cursor + cell * 2.6, centerY + cell * 4.1, z],
        [cursor + cell * 3.6, centerY + cell * 5.0, z],
        cell * 0.3,
        color,
      );
    }
    cursor += 6 * cell;
  }
}

function addPixelTextYZ(mesh:MeshBuilder,text:string,centerY:number,centerZ:number,x:number,cell:number,color:V3){
  const chars=Array.from(text),width=chars.length*6*cell-cell;let cursor=centerZ-width/2;
  for(const ch of chars){const glyph=PIXEL_GLYPHS[ch]??PIXEL_GLYPHS[" "]!;for(let row=0;row<7;row++){const pixels=glyph[row]??"00000";for(let col=0;col<5;col++)if(pixels[col]==="1")mesh.box([x,centerY+(3-row)*cell,cursor+col*cell+cell/2],[Math.max(.018,cell*.24),cell*.82,cell*.82],color);}cursor+=6*cell;}
}
function addPine(mesh: MeshBuilder, x: number, z: number, _base: number, height: number, seed: number) {
  let treeX = x;
  const pathX = roadCenter(z) - 12.1;
  if (z <= -76 && z >= -258 && Math.abs(treeX - pathX) < 8.0) {
    treeX = pathX - 10.0;
  }
  const insideMovedPitch = Math.abs(treeX + 30) < 27 && Math.abs(z + 315) < 42;
  const insideMovedSchool = Math.abs(treeX + 64) < 16 && Math.abs(z + 315) < 18;
  const insideYPF = treeX > 5.5 && treeX < 34.5 && z > -274 && z < -231;
  if (insideMovedPitch || insideMovedSchool || insideYPF) return;
  const base = terrainSurfaceY(treeX, z);
  const trunk = hex(seed % 2 < 1 ? "#332b25" : "#292922");
  mesh.box([treeX, base + height * 0.13, z], [height * 0.075, height * 0.27, height * 0.075], trunk);
  const greens = [hex("#172b29"), hex("#1d3430"), hex("#263a34"), hex("#304139")];
  const layers = 3 + (Math.floor(seed) % 2);
  for (let layer = 0; layer < layers; layer++) {
    const fraction = layer / layers;
    const baseY = base + height * (0.22 + fraction * 0.58);
    const layerHeight = height * (0.48 - fraction * 0.12);
    const radius = height * (0.33 - fraction * 0.08) * (0.9 + (seed % 7) * 0.018);
    mesh.cone(treeX, baseY, z, radius, layerHeight, 5 + (layer % 2), greens[(Math.floor(seed + layer) % greens.length)]!, greens[(Math.floor(seed + layer + 1) % greens.length)]!);
  }
}

function addRoadsideMountainRange(
  mesh: MeshBuilder,
  side: -1 | 1,
  seed: number,
  innerDistance: number,
  outerDistance: number,
  heightBase: number,
) {
  const random = randomSource(seed);
  const sections = 55;
  const startZ = 14;
  const endZ = -520;
  const section = (z: number) => {
    const fade = z < -492 ? Math.max(0.12, (z + 520) / 28) : 1;
    const sway = Math.sin(z * 0.043 + seed) * 3.8 + Math.sin(z * 0.091 + seed * 0.3) * 1.9;
    const peakX = side * (innerDistance + 7.5 + Math.sin(z * 0.067 + seed) * 2.2);
    const roadLift = roadHeightAt(z) - 0.18;
    const footY = terrainY(side * innerDistance, z) + roadLift;
    const peakY = footY + (heightBase + sway + random() * 2.4) * fade;
    const outerY = terrainY(side * outerDistance, z) + roadLift;
    return {
      inner: [side * innerDistance, footY, z] as V3,
      peak: [peakX, peakY, z] as V3,
      outer: [side * outerDistance, outerY, z] as V3,
    };
  };
  let previous = section(startZ);
  for (let i = 1; i <= sections; i++) {
    const z = startZ + (endZ - startZ) * (i / sections);
    const next = section(z);
    const rock = hex(random() > 0.5 ? "#435058" : "#53616a");
    const shadow = hex(random() > 0.5 ? "#303d45" : "#394951");
    const lit = hex(random() > 0.5 ? "#69777c" : "#5e6d73");
    mesh.triangle(previous.inner, previous.peak, next.peak, shadow);
    mesh.triangle(previous.inner, next.peak, next.inner, rock);
    mesh.triangle(previous.peak, previous.outer, next.outer, lit);
    mesh.triangle(previous.peak, next.outer, next.peak, rock);
    if (i % 2 === 0 && heightBase > 15) {
      const snow = hex("#aeb9bc");
      mesh.triangle(previous.peak, next.peak, [next.peak[0], next.peak[1] - 0.9, next.peak[2]], snow);
    }
    previous = next;
  }
}


function buildAttendantPose(time: number, stage: string, warningElapsed: number, payingElapsed: number) {
  const npc = new MeshBuilder();
  const skin = hex("#b98768");
  const skinLight = hex("#d2a184");
  const navy = hex("#064f83");
  const uniform = hex("#0875b9");
  const uniformLight = hex("#268dcc");
  const pants = hex("#24333e");
  const boots = hex("#141d25");
  const white = hex("#e6edf0");
  const faceZ = 0.31;
  const bob = Math.sin(time * 1.7) * 0.025;
  const talking = stage === "onFoot" || stage === "fueling" || stage === "payment" || stage === "paying";
  const talkMotion = talking ? Math.sin(time * 3.2) * 0.08 : 0;
  const pointing = stage === "warning"
    ? smooth(0.18, 0.72, warningElapsed) * (1 - smooth(3.9, 4.55, warningElapsed))
    : 0;
  const receiving = stage === "paying" ? smooth(0, 0.9, payingElapsed) : 0;
  const blink = Math.sin(time * 2.3 + 0.6) > 0.992;

  // Piernas y botas firmes sobre la playa de la estación.
  npc.box([-0.2, 0.43, 0], [0.27, 0.91, 0.34], pants);
  npc.box([0.2, 0.43, 0], [0.27, 0.91, 0.34], pants);
  npc.box([-0.22, 0.08, 0.13], [0.42, 0.18, 0.58], boots);
  npc.box([0.22, 0.08, 0.13], [0.42, 0.18, 0.58], boots);

  // Torso joven con uniforme, bolsillo, insignia y movimiento sutil de respiración.
  npc.box([0, 1.23 + bob, 0], [0.92, 1.18, 0.53], uniform, navy);
  npc.box([0, 1.75 + bob, 0.03], [0.42, 0.18, 0.56], white);
  npc.beam([-0.12, 1.72 + bob, faceZ], [0, 1.49 + bob, faceZ + 0.015], 0.045, white);
  npc.beam([0.12, 1.72 + bob, faceZ], [0, 1.49 + bob, faceZ + 0.015], 0.045, white);
  npc.box([-0.27, 1.39 + bob, faceZ + 0.285], [0.23, 0.31, 0.035], uniformLight);
  npc.box([-0.27, 1.42 + bob, faceZ + 0.31], [0.16, 0.055, 0.025], white);

  // Brazo izquierdo: gesticula al conversar y después se extiende para recibir el efectivo.
  const leftShoulder: V3 = [-0.43, 1.62 + bob, 0];
  const leftElbow: V3 = [-0.76 - receiving * 0.18, 1.34 + talkMotion + receiving * 0.14, 0.08];
  const leftHand: V3 = [-1.18 - receiving * 0.18, 1.5 + talkMotion + receiving * 0.05, 0.16];
  npc.beam(leftShoulder, leftElbow, 0.25, navy);
  npc.beam(leftElbow, leftHand, 0.16, skin);
  npc.box(leftHand, [0.23, 0.14, 0.16], skin, skinLight);
  // Brazo derecho: reposo conversacional o gesto claro de señalar al cielo.
  const rightShoulder: V3 = [0.43, 1.62 + bob, 0];
  const rightElbow: V3 = [mix(0.72, 0.82, pointing), mix(1.02 + talkMotion, 2.08, pointing), 0.1];
  const rightWrist: V3 = [mix(0.74, 0.88, pointing), mix(0.91 + talkMotion, 2.73, pointing), 0.2];
  const rightPalm: V3 = [rightWrist[0], rightWrist[1] + 0.06, rightWrist[2] + 0.04];
  npc.beam(rightShoulder, rightElbow, 0.24, navy);
  npc.beam(rightElbow, rightWrist, 0.15, skin);
  npc.box(rightPalm, [0.2, 0.15, 0.16], skin, skinLight);
  if (pointing > 0.08) {
    // Índice extendido verticalmente; los demás dedos quedan recogidos.
    npc.beam([rightPalm[0], rightPalm[1] + 0.04, rightPalm[2] + 0.04],
      [rightPalm[0] + 0.02, rightPalm[1] + 0.58 * pointing, rightPalm[2] + 0.08], 0.055, skinLight);
    for (const finger of [-1, 0, 1]) {
      npc.beam([rightPalm[0] + finger * 0.055, rightPalm[1], rightPalm[2] + 0.04],
        [rightPalm[0] + finger * 0.06, rightPalm[1] - 0.12, rightPalm[2] + 0.11], 0.045, skin);
    }
  } else {
    for (const finger of [-1, 0, 1]) {
      npc.beam([rightPalm[0] + finger * 0.055, rightPalm[1], rightPalm[2] + 0.04],
        [rightPalm[0] + finger * 0.06, rightPalm[1] - 0.09, rightPalm[2] + 0.11], 0.045, skin);
    }
  }

  // Cuello, cabeza, facciones y gorra; el pequeño cambio de mirada enfatiza la advertencia.
  npc.box([0, 1.9 + bob + pointing * 0.04, 0], [0.31, 0.31, 0.3], skin);
  npc.box([0, 2.3 + bob + pointing * 0.11, 0], [0.68, 0.77, 0.57], skin, hex("#a9765b"));
  npc.box([-0.37, 2.3 + bob + pointing * 0.11, 0], [0.13, 0.24, 0.18], skinLight);
  npc.box([0.37, 2.3 + bob + pointing * 0.11, 0], [0.13, 0.24, 0.18], skin);
  npc.box([0, 2.61 + bob, -0.05], [0.64, 0.19, 0.52], hex("#42332e"));
  npc.box([0, 2.68 + bob, -0.06], [0.58, 0.13, 0.5], hex("#332a27"));
  const eyeTone = blink ? skin : hex("#242b30");
  npc.box([-0.15, 2.34 + bob + pointing * 0.11, faceZ + 0.025], [0.06, blink ? 0.018 : 0.07, 0.045], eyeTone);
  npc.box([0.15, 2.34 + bob + pointing * 0.11, faceZ + 0.025], [0.06, blink ? 0.018 : 0.07, 0.045], eyeTone);
  npc.box([-0.15, 2.41 + bob + pointing * 0.11, faceZ + 0.005], [0.12, 0.045, 0.045], hex("#64483d"));
  npc.box([0.15, 2.41 + bob + pointing * 0.11, faceZ + 0.005], [0.12, 0.045, 0.045], hex("#64483d"));
  npc.box([0, 2.24 + bob + pointing * 0.11, faceZ + 0.06], [0.1, 0.16, 0.12], skinLight);
  npc.box([0, 2.08 + bob + pointing * 0.11, faceZ + 0.055], [0.17, 0.035, 0.055], hex("#704b42"));
  npc.box([0, 2.77 + bob + pointing * 0.11, 0], [0.77, 0.2, 0.63], uniform);
  npc.box([0, 2.69 + bob + pointing * 0.11, faceZ + 0.18], [0.8, 0.07, 0.34], navy);
  npc.box([0, 2.78 + bob + pointing * 0.11, faceZ + 0.32], [0.36, 0.1, 0.035], white);
  return npc;
}

function addYPFStation(world: MeshBuilder) {
  const mesh = new MeshBuilder();
  const stationOffset = 6.5;
  const stationOffsetZ = STATION_Z_OFFSET;
  const stationX = 11.2;
  const stationZ = -166;
  const ground = terrainY(stationX + stationOffset, stationZ + stationOffsetZ);
  const blue = hex("#0875b9");
  const deepBlue = hex("#07548b");
  const white = hex("#e6edf0");
  const concrete = hex("#777b7a");

  // Playa de ingreso y pavimento de hormigón, separado de la Ruta 40.
  mesh.quad(
    [0.5, 0.19, -151], [25.5, 0.19, -151],
    [25.5, 0.19, -184], [0.5, 0.19, -184],
    hex("#55595a"),
  );
  mesh.quad(
    [2.8, 0.205, -152], [25.5, 0.205, -152],
    [25.5, 0.205, -154.5], [2.8, 0.205, -154.5],
    hex("#7a7b74"),
  );

  // Edificio de servicios al fondo de la playa.
  mesh.box([20.3, ground + 2.05, -174.8], [8.5, 4.1, 7.4], hex("#d5d8d4"), hex("#b6c0c2"));
  mesh.box([20.3, ground + 4.25, -174.8], [9.0, 0.48, 7.9], deepBlue);
  mesh.box([20.3, ground + 2.5, -170.98], [5.8, 1.8, 0.12], hex("#8eb2c4"), hex("#416477"));
  mesh.box([23.25, ground + 1.55, -170.88], [1.05, 2.65, 0.16], hex("#6b523b"));

  // Marquesina azul de YPF con iluminación blanca inferior.
  mesh.box([11.4, ground + 5.55, stationZ], [18.2, 0.62, 11.2], blue, deepBlue);
  mesh.box([11.4, ground + 5.19, stationZ + 0.02], [18.35, 0.1, 11.3], white);
  mesh.box([11.4, ground + 5.18, stationZ + 5.62], [18.1, 0.72, 0.42], deepBlue);
  addPixelText(mesh, "YPF", 11.4, ground + 5.08, stationZ + 5.86, 0.25, white);
  mesh.box([11.4, ground + 5.0, stationZ - 5.6], [18.1, 0.28, 0.38], hex("#064b7a"));

  // Columnas estructurales blancas con zócalos azules.
  for (const x of [3.5, 19.2]) {
    for (const z of [stationZ - 4.25, stationZ + 4.25]) {
      mesh.box([x, ground + 2.75, z], [0.42, 5.1, 0.42], white);
      mesh.box([x, ground + 0.42, z], [0.62, 0.82, 0.62], deepBlue);
    }
  }

  // Surtidores blancos y azules, pantallas, mangueras y pistolas.
  for (const x of [6.8, 13.7]) {
    mesh.box([x, ground + 0.2, stationZ + 0.6], [3.25, 0.4, 2.0], concrete);
    mesh.box([x, ground + 1.55, stationZ + 0.6], [1.52, 2.45, 1.05], white, hex("#c5d1d4"));
    mesh.box([x, ground + 1.85, stationZ + 1.16], [1.12, 0.66, 0.055], hex("#122b38"));
    mesh.box([x, ground + 1.18, stationZ + 1.17], [1.12, 0.36, 0.055], blue);
    mesh.box([x, ground + 0.35, stationZ + 1.17], [0.52, 0.2, 0.055], deepBlue);
    mesh.beam([x + 0.76, ground + 1.9, stationZ + 0.35], [x + 1.18, ground + 0.8, stationZ + 0.1], 0.075, hex("#202529"));
    mesh.beam([x + 1.18, ground + 0.8, stationZ + 0.1], [x + 0.98, ground + 0.58, stationZ + 0.26], 0.11, hex("#252c30"));
    mesh.box([x + 1.03, ground + 0.53, stationZ + 0.28], [0.16, 0.22, 0.28], hex("#111a20"));
  }

  // Cartel vertical de la estación, visible desde la ruta.
  mesh.box([24.7, ground + 4.35, -160.5], [0.32, 8.4, 0.32], hex("#f1f1e9"));
  mesh.box([24.7, ground + 8.35, -160.5], [3.4, 3.0, 0.34], deepBlue);
  mesh.box([24.7, ground + 8.35, -160.28], [3.18, 2.76, 0.08], blue);
  addPixelText(mesh, "YPF", 24.7, ground + 8.42, -160.19, 0.24, white);
  mesh.box([24.7, ground + 6.15, -160.28], [2.95, 0.1, 0.08], white);

  // Farol de playa y luminarias cálidas debajo de la marquesina.
  for (const x of [4.0, 18.8]) {
    mesh.box([x, ground + 5.1, stationZ], [0.08, 0.08, 0.9], hex("#f6dba8"));
  }
  world.append(mesh, [stationOffset, 0, stationOffsetZ]);
}



function addBikePathAndAerodrome(mesh: MeshBuilder) {
  const pathStart = -258;
  const pathEnd = -76;
  const pathCenter = (z: number) => roadCenter(z) - 12.1;
  const pathSurface = (z: number) => terrainSurfaceY(pathCenter(z), z) + 0.055;

  // Sendero/bicisenda paralelo a la Ruta 40, en el lado izquierdo del conductor.
  // Su pavimento es angosto y continuo: no es otra calzada ni una playa de servicio.
  for (let z = pathStart; z < pathEnd; z += 2.6) {
    const nextZ = Math.min(pathEnd, z + 2.6);
    const x0 = pathCenter(z), x1 = pathCenter(nextZ);
    const y0 = pathSurface(z), y1 = pathSurface(nextZ);
    mesh.quad(
      [x0 - 1.42, y0 - 0.055, z], [x1 - 1.42, y1 - 0.055, nextZ],
      [x1 + 1.42, y1 - 0.055, nextZ], [x0 + 1.42, y0 - 0.055, z],
      hex("#555e60"),
    );
    mesh.quad(
      [x0 - 1.02, y0, z], [x1 - 1.02, y1, nextZ],
      [x1 + 1.02, y1, nextZ], [x0 + 1.02, y0, z],
      hex("#737b79"),
    );
    for (const edge of [-0.91, 0.91]) {
      mesh.quad(
        [x0 + edge - 0.025, y0 + 0.025, z], [x1 + edge - 0.025, y1 + 0.025, nextZ],
        [x1 + edge + 0.025, y1 + 0.025, nextZ], [x0 + edge + 0.025, y0 + 0.025, z],
        hex("#c2c5bd"),
      );
    }
    if (Math.floor((z - pathStart) / 13) % 2 === 0) {
      mesh.box([(x0 + x1) * 0.5, (y0 + y1) * 0.5 + 0.035, (z + nextZ) * 0.5], [0.055, 0.025, 1.4], hex("#d0d1c9"));
    }
  }

  // Cartel bajo de BICISENDA, orientado hacia quienes llegan por la ruta.
  const signZ = -128;
  const signX = pathCenter(signZ);
  const signY = terrainSurfaceY(signX, signZ);
  mesh.box([signX, signY + 1.05, signZ], [0.13, 2.1, 0.13], hex("#403a30"));
  mesh.box([signX, signY + 2.12, signZ], [2.9, 0.88, 0.18], hex("#254d59"), hex("#183944"));
  addPixelText(mesh, "BICISENDA", signX, signY + 2.0, signZ + 0.105, 0.045, hex("#edf0e8"));
  // Símbolo simple de bicicleta debajo del nombre.
  mesh.torusXY(signX - 0.48, signY + 1.43, signZ + 0.11, 0.19, 0.027, hex("#e1e6dd"));
  mesh.torusXY(signX + 0.48, signY + 1.43, signZ + 0.11, 0.19, 0.027, hex("#e1e6dd"));
  mesh.beam([signX - 0.48, signY + 1.43, signZ + 0.12], [signX - 0.08, signY + 1.72, signZ + 0.12], 0.035, hex("#e1e6dd"));
  mesh.beam([signX - 0.08, signY + 1.72, signZ + 0.12], [signX + 0.48, signY + 1.43, signZ + 0.12], 0.035, hex("#e1e6dd"));
  mesh.beam([signX - 0.48, signY + 1.43, signZ + 0.12], [signX + 0.08, signY + 1.43, signZ + 0.12], 0.035, hex("#e1e6dd"));
  mesh.beam([signX + 0.08, signY + 1.43, signZ + 0.12], [signX + 0.32, signY + 1.74, signZ + 0.12], 0.035, hex("#e1e6dd"));

  // Aeródromo El Bolsón: pista asfaltada 18/36, alargada norte-sur y separada del sendero.
  // No se agrega surtidor, marquesina ni edificio comercial: es infraestructura aeronáutica.
  const runwayX = -53.5;
  const runwayStart = -76 + AIRPORT_Z_OFFSET;
  const runwayEnd = -258 + AIRPORT_Z_OFFSET;
  const halfWidth = 7.2;
  const runwayY = (z: number) => terrainSurfaceY(runwayX, z) + 0.055;

  // Banquinas de ripio compactado alrededor de la franja de asfalto.
  for (let z = runwayStart; z > runwayEnd; z -= 4) {
    const nextZ = Math.max(runwayEnd, z - 4);
    const y0 = runwayY(z) - 0.035, y1 = runwayY(nextZ) - 0.035;
    mesh.quad(
      [runwayX - 10.2, y0, z], [runwayX - 10.2, y1, nextZ],
      [runwayX + 10.2, y1, nextZ], [runwayX + 10.2, y0, z],
      hex("#53595b"),
    );
    mesh.quad(
      [runwayX - halfWidth, y0 + 0.035, z], [runwayX - halfWidth, y1 + 0.035, nextZ],
      [runwayX + halfWidth, y1 + 0.035, nextZ], [runwayX + halfWidth, y0 + 0.035, z],
      hex("#343d43"),
    );
  }

  // Líneas blancas laterales y eje discontinuo, marcas inequívocas de pista de aterrizaje.
  for (let z = runwayStart; z > runwayEnd; z -= 4) {
    const nextZ = Math.max(runwayEnd, z - 4);
    const mid = (z + nextZ) * 0.5;
    const y = runwayY(mid) + 0.055;
    for (const side of [-1, 1]) {
      mesh.box([runwayX + side * (halfWidth - 0.32), y, mid], [0.13, 0.035, z - nextZ + 0.04], hex("#d7d8d1"));
    }
    if (Math.floor((runwayStart - mid) / 10) % 2 === 0) {
      mesh.box([runwayX, y + 0.008, mid], [0.22, 0.035, 3.2], hex("#e2e2db"));
    }
  }

  // Franjas de umbral en ambos extremos de la pista.
  for (const thresholdZ of [runwayStart + 5, runwayEnd - 5]) {
    const y = runwayY(thresholdZ) + 0.075;
    for (let i = 0; i < 8; i++) {
      const x = runwayX - 6.1 + i * 1.74;
      mesh.box([x, y, thresholdZ], [0.82, 0.035, 2.6], hex("#e4e4dc"));
    }
  }

  // Luces bajas de borde: blancas y ámbar, nunca postes de estación de servicio.
  for (let z = runwayStart + 8, index = 0; z > runwayEnd - 8; z -= 10, index++) {
    for (const side of [-1, 1]) {
      const x = runwayX + side * (halfWidth + 0.55);
      const y = runwayY(z) + 0.045;
      mesh.box([x, y, z], [0.18, 0.12, 0.18], index % 4 === 0 ? hex("#d6b985") : hex("#c5d8dc"));
    }
  }

  // Calle de rodaje y plataforma de hormigón junto al hangar.
  const apronY = terrainSurfaceY(-68, -165 + AIRPORT_Z_OFFSET) + 0.04;
  mesh.quad(
    [-74, apronY, -181 + AIRPORT_Z_OFFSET], [-59, apronY, -181 + AIRPORT_Z_OFFSET],
    [-59, apronY, -148 + AIRPORT_Z_OFFSET], [-74, apronY, -148 + AIRPORT_Z_OFFSET],
    hex("#51595d"),
  );
  mesh.quad(
    [-69, apronY + 0.012, -181 + AIRPORT_Z_OFFSET], [-61, apronY + 0.012, -181 + AIRPORT_Z_OFFSET],
    [-61, apronY + 0.012, -148 + AIRPORT_Z_OFFSET], [-69, apronY + 0.012, -148 + AIRPORT_Z_OFFSET],
    hex("#424c52"),
  );

  // Hangar bajo de chapa gris, con portón ancho orientado hacia la pista.
  const hangarGround = terrainSurfaceY(-78, -165 + AIRPORT_Z_OFFSET);
  const hangarZ = -165 + AIRPORT_Z_OFFSET;
  mesh.box([-78, hangarGround + 2.0, hangarZ], [11.2, 4.0, 13.0], hex("#737b7c"), hex("#4b565c"));
  mesh.box([-78, hangarGround + 4.12, hangarZ], [11.8, 0.34, 13.6], hex("#343f48"), hex("#202a31"));
  mesh.box([-72.34, hangarGround + 1.72, hangarZ], [0.08, 3.2, 7.4], hex("#26343b"));
  mesh.box([-72.28, hangarGround + 3.25, hangarZ], [0.12, 0.12, 7.8], hex("#a94f42"));
  for (const z of [-170.4, -159.6]) {
    mesh.box([-72.18, hangarGround + 1.75, z + AIRPORT_Z_OFFSET], [0.15, 3.3, 0.16], hex("#a6ada9"));
  }

  // Avioneta liviana estacionada en la plataforma; fuselaje, alas, cola y tren de aterrizaje.
  const planeX = -65.4, planeZ = -164.5 + AIRPORT_Z_OFFSET;
  const planeY = terrainSurfaceY(planeX, planeZ) + 1.0;
  const fuselage = hex("#c5c8bd");
  const wing = hex("#d8d9cf");
  mesh.box([planeX, planeY, planeZ], [0.58, 0.5, 5.4], fuselage, hex("#8d999a"));
  mesh.beam([planeX - 4.25, planeY + 0.08, planeZ - 0.3], [planeX + 4.25, planeY + 0.08, planeZ - 0.3], 0.24, wing);
  mesh.beam([planeX - 1.55, planeY + 0.11, planeZ + 2.05], [planeX + 1.55, planeY + 0.11, planeZ + 2.05], 0.16, wing);
  mesh.box([planeX, planeY + 0.12, planeZ + 2.3], [0.2, 0.75, 0.32], hex("#a54c43"));
  mesh.box([planeX, planeY - 0.34, planeZ - 0.1], [0.08, 0.52, 0.09], hex("#1d2529"));
  mesh.box([planeX - 0.54, planeY - 0.32, planeZ + 0.65], [0.08, 0.5, 0.09], hex("#1d2529"));
  mesh.box([planeX + 0.54, planeY - 0.32, planeZ + 0.65], [0.08, 0.5, 0.09], hex("#1d2529"));
  mesh.beam([planeX - 0.72, planeY + 0.02, planeZ - 2.78], [planeX + 0.72, planeY + 0.02, planeZ - 2.78], 0.08, hex("#515b60"));

  // Cerco perimetral bajo de malla metálica, para separar la zona operativa del espacio público.
  const fenceX = runwayX + 11.6;
  for (let z = runwayStart - 1; z > runwayEnd + 1; z -= 10) {
    const y = terrainSurfaceY(fenceX, z);
    mesh.box([fenceX, y + 0.86, z], [0.09, 1.72, 0.09], hex("#454f53"));
    mesh.beam([fenceX, y + 0.48, z], [fenceX, y + 1.55, z], 0.025, hex("#7b8585"));
    mesh.beam([fenceX - 0.05, y + 0.55, z], [fenceX + 0.05, y + 1.45, z], 0.018, hex("#9aa3a0"));
  }
  for (const height of [0.45, 1.15, 1.58]) {
    mesh.beam(
      [fenceX, terrainSurfaceY(fenceX, runwayStart) + height, runwayStart],
      [fenceX, terrainSurfaceY(fenceX, runwayEnd) + height, runwayEnd],
      0.025,
      hex("#707a7d"),
    );
  }

  // Mangas de viento: mástil y cono rojo/blanco cerca del extremo norte.
  const sockX = runwayX + 9.4, sockZ = runwayStart + 17;
  const sockY = terrainSurfaceY(sockX, sockZ);
  mesh.box([sockX, sockY + 2.7, sockZ], [0.09, 5.4, 0.09], hex("#626d73"));
  mesh.beam([sockX, sockY + 5.25, sockZ], [sockX + 0.85, sockY + 4.9, sockZ - 1.9], 0.35, hex("#bf5d4d"));
  mesh.beam([sockX + 0.85, sockY + 4.9, sockZ - 1.9], [sockX + 1.55, sockY + 4.68, sockZ - 3.35], 0.27, hex("#e5e0d2"));

  // Línea baja de árboles nativos más allá del cerco, sin tapar el rectángulo de la pista.
  const treeLine = randomSource(7441);
  for (let i = 0; i < 20; i++) {
    const z = runwayStart - 4 - i * 9.0;
    const x = -171.0 + treeLine() * 3.5;
    const height = 7.0 + treeLine() * 5.0;
    addPine(mesh, x, z, terrainSurfaceY(x, z), height, Math.floor(treeLine() * 1000));
  }
}


function addSchoolAndFootballField(world:MeshBuilder){
  const m=new MeshBuilder();
  const cx=-107,cz=-166,hw=19,hl=33,y=-.075,ly=y+.055,l=cx-hw,r=cx+hw,n=cz+hl,f=cz-hl,white=hex("#eee9dc");
  // Cancha de tierra apisonada, no de césped.
  m.quad([l,y,n],[l,y,f],[r,y,f],[r,y,n],hex("#a17a4d"));
  const soil=["#aa8052","#967047","#b28a5c","#8f6948","#ad8050"];
  for(let i=0;i<24;i++){const x=l+1+(i*13%34),z=n-2-i*2.65;m.quad([x,y+.012,z],[x+5,y+.012,z-.6],[x+5,y+.012,z-1.5],[x,y+.012,z-.9],hex(soil[i%soil.length]!));}
  // Perímetro, mitad, círculo central y áreas.
  m.box([l,ly,cz],[.12,.045,hl*2],white);m.box([r,ly,cz],[.12,.045,hl*2],white);
  m.box([cx,ly,n],[hw*2,.045,.12],white);m.box([cx,ly,f],[hw*2,.045,.12],white);
  m.box([cx,ly+.006,cz],[hw*2,.045,.11],white);
  for(let i=0;i<32;i++){const a=i/32*Math.PI*2,b=(i+1)/32*Math.PI*2;m.beam([cx+Math.cos(a)*7.1,ly+.02,cz+Math.sin(a)*7.1],[cx+Math.cos(b)*7.1,ly+.02,cz+Math.sin(b)*7.1],.065,white);}
  for(const end of [n,f]){
    const dir=end===n?-1:1,pz=end+dir*9,sz=end+dir*3.8;
    m.box([cx,ly,pz],[25,.04,.09],white);m.box([cx,ly,sz],[10,.04,.08],white);
    for(const side of [-1,1]){m.box([cx+side*12.5,ly,(end+pz)/2],[.08,.04,Math.abs(end-pz)],white);m.box([cx+side*5,ly,(end+sz)/2],[.08,.04,Math.abs(end-sz)],white);}
    const gw=7.1,gh=2.3,back=end+dir*2;
    for(const side of [-1,1]){const x=cx+side*gw/2;m.beam([x,ly,end],[x,ly+gh,end],.15,hex("#f1eee5"));m.beam([x,ly+.02,end],[x,ly+.02,back],.06,hex("#d0d3cc"));}
    m.beam([cx-gw/2,ly+gh,end],[cx+gw/2,ly+gh,end],.15,hex("#f1eee5"));m.beam([cx-gw/2,ly,back],[cx+gw/2,ly,back],.045,hex("#c8ceca"));
    for(let i=0;i<=4;i++){const x=cx-gw/2+i*gw/4;m.beam([x,ly,end],[x,ly+gh,back],.02,hex("#cbd0ca"));}
  }
  // Alambrado completamente cerrado, con postes, diagonales y travesaños.
  const fl=l-2.2,fr=r+2.2,fn=n+2.2,ff=f-2.2,fh=2.15;
  for(const x of [fl,fr]){
    for(let z=ff;z<=fn;z+=6.5)m.box([x,terrainSurfaceY(x+FIELD_X_OFFSET,z+FIELD_Z_OFFSET)+fh/2,z],[.1,fh,.1],hex("#4c5555"));
    for(const h of [.42,1.18,fh])m.beam([x,h,ff],[x,h,fn],.03,hex("#7c8580"));
    for(let z=ff;z<fn;z+=3.3){m.beam([x,.4,z],[x,fh,z+1.65],.018,hex("#9aa09a"));m.beam([x,fh,z],[x,.4,z+1.65],.018,hex("#9aa09a"));}
  }
  for(const z of [ff,fn]){
    for(let x=fl;x<=fr;x+=6)m.box([x,terrainSurfaceY(x+FIELD_X_OFFSET,z+FIELD_Z_OFFSET)+fh/2,z],[.1,fh,.1],hex("#4c5555"));
    for(const h of [.42,1.18,fh])m.beam([fl,h,z],[fr,h,z],.03,hex("#7c8580"));
  }
  for(const x of [cx-3,cx+3])m.beam([x,0,ff],[x,2,ff],.06,hex("#d0d0c8"));
  for(const x of [l-4,r+4]){m.box([x,4,cz],[.16,8,.16],hex("#4a5053"));m.box([x,7.8,cz],[.42,.22,.32],hex("#f1d5a0"));}
  // Escuela barrial detrás de la cancha.
  const sx=-141,sz=-166,gy=terrainSurfaceY(sx+FIELD_X_OFFSET,sz+FIELD_Z_OFFSET);
  m.box([sx,gy+2.45,sz],[24,4.9,28],hex("#d5c5a1"),hex("#b7aa8c"));
  m.box([sx,gy+4.98,sz],[24.8,.38,28.8],hex("#a5503d"),hex("#713f36"));
  m.box([sx+12.08,gy+.72,sz],[.16,1.44,27.2],hex("#78796c"));
  for(const z of [-176,-169,-161,-154]){m.box([sx+12.18,gy+2.85,z],[.11,1.42,2.15],hex("#344f60"));m.box([sx+12.25,gy+2.85,z],[.035,1.14,1.8],hex("#9bb6b9"));}
  m.box([sx+12.22,gy+1.45,sz+1],[.28,2.9,3],hex("#72513c"));m.box([sx+12.95,gy+2.95,sz],[1.5,.18,4.8],hex("#36566a"));
  for(let i=0;i<3;i++)m.box([sx+13+i*.38,gy+.12+i*.13,sz],[.8,.24,3.4],hex("#afa58e"));
  m.box([sx+12.36,gy+4.35,sz],[.14,.72,7.6],hex("#244b60"));addPixelTextYZ(m,"ESCUELA",gy+4.25,sz,sx+12.44,.075,hex("#f2eddb"));
  m.quad([sx+12.1,gy+.025,sz-11],[sx+12.1,gy+.025,sz+11],[sx+14.2,gy+.025,sz+11],[sx+14.2,gy+.025,sz-11],hex("#777466"));
  m.box([sx+16,gy+3.5,sz-12],[.12,7,.12],hex("#6a6656"));m.beam([sx+16,gy+6.7,sz-12],[sx+18.8,gy+6,sz-12],.12,hex("#f1e6cf"));
  // Traslado conjunto: misma cancha, alambrado, arcos y escuela; queda después del aeropuerto y la YPF, junto a la ruta.
  world.append(m,[FIELD_X_OFFSET,0,FIELD_Z_OFFSET]);
}
function buildPathPedestrian(kind:"walk"|"run",jacket:string,skin:string){
  const m=new MeshBuilder(),cloth=hex(jacket),flesh=hex(skin),dark=hex("#29343a"),stride=kind==="run"?.3:.15,swing=kind==="run"?.25:.12;
  m.box([0,1.02,0],[.39,.64,.26],cloth,dark);m.box([0,1.72,0],[.27,.31,.27],flesh);m.box([0,1.9,-.035],[.29,.09,.27],hex("#49392e"));
  m.beam([-.12,.76,0],[-stride,.15,-.16],.12,dark);m.beam([.12,.76,0],[stride,.15,.16],.12,dark);
  m.box([-stride,.08,-.2],[.22,.12,.34],hex("#d4d0c5"));m.box([stride,.08,.12],[.22,.12,.34],hex("#d4d0c5"));
  m.beam([-.23,1.3,0],[-.36-swing,.93,-.11],.105,cloth);m.beam([-.36-swing,.93,-.11],[-.42-swing,.73,-.16],.07,flesh);
  m.beam([.23,1.3,0],[.36+swing,.94,.11],.105,cloth);m.beam([.36+swing,.94,.11],[.42+swing,.74,.16],.07,flesh);return m;
}
function buildPathCyclist(jacket:string){
  const m=new MeshBuilder(),frame=hex("#202b31"),rubber=hex("#171d21"),skin=hex("#c99473"),cloth=hex(jacket);
  m.torusYZ(0,.43,-.64,.37,.035,rubber);m.torusYZ(0,.43,.64,.37,.035,rubber);
  const rear:V3=[0,.43,-.64],crank:V3=[0,.48,-.04],front:V3=[0,.43,.64],seat:V3=[0,.91,-.31],handle:V3=[0,.91,.55];
  m.beam(rear,crank,.055,frame);m.beam(crank,front,.055,frame);m.beam(front,seat,.055,frame);m.beam(seat,rear,.055,frame);m.beam(seat,crank,.055,frame);m.beam(seat,handle,.055,frame);
  m.beam(handle,[0,1.02,.68],.055,hex("#aeb7b4"));m.beam([0,.99,-.31],[0,1.35,.11],.2,cloth);m.box([0,1.55,.19],[.25,.26,.25],skin);m.box([0,1.68,.2],[.29,.12,.28],hex("#d6a34f"));
  m.beam([0,1.32,.1],[0,.97,.62],.08,cloth);m.beam([0,.97,.62],[0,.92,.68],.055,skin);return m;
}
function buildOncomingCar(body:string,cabin:string){
  const m=new MeshBuilder(),paint=hex(body),glass=hex(cabin);
  m.box([0,.53,0],[1.88,.58,4.25],paint,hex("#26323a"));m.box([0,.85,-1.37],[1.72,.19,1.26],paint);m.box([0,1.13,-.18],[1.48,.63,2.12],glass,hex("#35434b"));m.box([0,1.47,-.18],[1.28,.12,1.93],paint);
  for(const x of [-.98,.98])for(const z of [-1.35,1.35])m.box([x,.43,z],[.22,.55,.73],hex("#12181d"));
  for(const x of [-.61,.61]){m.box([x,.67,-2.13],[.26,.17,.08],hex("#fff1c9"));m.box([x,.51,2.13],[.26,.13,.08],hex("#a94c42"));}m.box([0,.81,2.15],[1.15,.11,.12],hex("#20282e"));return m;
}

function buildFootballPlayer(jersey:string,shorts:string,pose:number){
  const m=new MeshBuilder(),shirt=hex(jersey),pants=hex(shorts),skin=hex("#c99576"),boots=hex("#272b2c");
  const stride=pose%2===0?.22:-.22,arm=pose%2===0?.18:-.18;
  m.box([0,1.13,0],[.45,.68,.3],shirt,hex("#29333a"));
  m.box([0,.76,0],[.4,.22,.31],pants);
  m.box([0,1.66,0],[.27,.31,.27],skin);
  m.box([0,1.83,-.02],[.29,.08,.28],hex("#513b2f"));
  m.beam([-.13,1.31,0],[-.3-arm,1.02,-.08],.11,shirt);
  m.beam([-.3-arm,1.02,-.08],[-.34-arm,.88,-.1],.075,skin);
  m.beam([.13,1.31,0],[.3+arm,1.02,.08],.11,shirt);
  m.beam([.3+arm,1.02,.08],[.34+arm,.88,.1],.075,skin);
  m.beam([-.12,.67,0],[-stride,.22,-.12],.13,pants);
  m.beam([.12,.67,0],[stride,.22,.12],.13,pants);
  m.box([-stride,.12,-.2],[.24,.13,.36],boots);
  m.box([stride,.12,.18],[.24,.13,.36],boots);
  return m;
}
function buildFootballBall(){
  const m=new MeshBuilder();m.sphere(0,0,0,.24,hex("#eeeae0"),14,9);
  const black=hex("#20252a");
  m.triangle([.205,.09,0],[.205,-.045,.13],[.205,-.13,-.035],black);
  m.triangle([.17,.13,-.09],[.22,.02,-.14],[.18,-.08,-.12],black);
  m.triangle([.17,.12,.1],[.22,.02,.15],[.18,-.09,.1],black);
  return m;
}

function buildArmedThreatBody(){
  const m=new MeshBuilder();
  const coat=hex("#34343a"),coatLight=hex("#55515a"),pants=hex("#252b34"),skin=hex("#c99576");
  const hair=hex("#282329"),dark=hex("#171a20"),white=hex("#f1e8df");
  // Cuerpo, piernas y cabeza del hombre, orientado hacia el conductor (+Z).
  m.box([0,1.13,0],[.58,.78,.34],coat,coatLight);
  m.box([0,.73,0],[.43,.22,.32],pants);
  m.beam([-.13,.66,0],[-.2,.19,-.02],.17,pants);
  m.beam([.13,.66,0],[.2,.19,-.02],.17,pants);
  m.box([-.2,.1,.05],[.3,.14,.48],dark);
  m.box([.2,.1,.05],[.3,.14,.48],dark);
  m.box([0,1.63,0],[.22,.19,.22],skin);
  m.box([0,2.02,0],[.62,.69,.52],skin,hex("#ab785f"));
  m.box([0,2.36,-.015],[.64,.19,.55],hair);
  m.box([-.33,2.02,0],[.12,.22,.17],skin);
  m.box([.33,2.02,0],[.12,.22,.17],skin);
  // Ojos muy abiertos y boca abierta: miedo visible antes de que se enfurezca.
  m.box([-.145,2.08,.271],[.145,.16,.035],white);
  m.box([.145,2.08,.271],[.145,.16,.035],white);
  m.box([-.145,2.075,.296],[.052,.095,.025],dark);
  m.box([.145,2.075,.296],[.052,.095,.025],dark);
  m.beam([-.235,2.235,.275],[-.075,2.29,.29],.065,hair);
  m.beam([.075,2.29,.29],[.235,2.235,.275],.065,hair);
  m.box([0,1.82,.278],[.15,.19,.045],dark);
  m.box([0,1.82,.304],[.075,.11,.018],hex("#813f43"));
  return m;
}
function buildArmedThreatArms(){
  const m=new MeshBuilder();
  const coat=hex("#34343a"),skin=hex("#c99576"),metal=hex("#444b53"),dark=hex("#171a20");
  // Ambas manos forman una empuñadura a dos manos; este conjunto rota desde la postura baja hasta apuntar.
  const leftShoulder:V3=[-.25,1.43,0],leftElbow:V3=[-.42,1.32,.34],leftHand:V3=[-.09,1.76,.75];
  const rightShoulder:V3=[.25,1.43,0],rightElbow:V3=[.39,1.55,.34],rightHand:V3=[.075,1.78,.73];
  m.beam(leftShoulder,leftElbow,.22,coat);
  m.beam(leftElbow,leftHand,.13,skin);
  m.box(leftHand,[.18,.13,.18],skin);
  m.beam(rightShoulder,rightElbow,.22,coat);
  m.beam(rightElbow,rightHand,.14,skin);
  m.box(rightHand,[.18,.14,.18],skin);
  m.beam([-.13,1.79,.73],[-.02,1.82,.82],.075,skin);
  m.beam([.13,1.79,.74],[.08,1.83,.84],.075,skin);
  // Pistola low-poly con corredera, cañón y empuñadura.
  m.box([.035,1.86,.87],[.18,.16,.42],metal,dark);
  m.box([.035,1.87,1.16],[.105,.105,.27],dark);
  m.box([.035,1.69,.78],[.14,.25,.16],dark);
  m.beam([-.035,1.77,.82],[.12,1.77,.82],.035,metal);
  m.box([.035,1.955,.83],[.12,.035,.16],hex("#737b82"));
  m.box([.035,1.86,1.31],[.07,.07,.035],dark);
  return m;
}
function buildThreatAngryBrows(){
  const m=new MeshBuilder(),hair=hex("#282329");
  m.beam([-.24,2.29,.282],[-.07,2.205,.305],.07,hair);
  m.beam([.07,2.205,.305],[.24,2.29,.282],.07,hair);
  return m;
}
function buildSignalLens(){const m=new MeshBuilder();m.sphere(0,0,0,.135,hex("#ff312b"),14,9);return m;}
function buildStylizedBlood(){
  const m=new MeshBuilder(),red=hex("#8e2426"),bright=hex("#b83b36");
  m.sphere(0,.055,0,.23,red,12,6);m.sphere(.32,.045,.12,.105,bright,10,6);
  m.sphere(-.28,.04,-.16,.09,red,10,6);m.sphere(.12,.035,-.28,.07,bright,9,5);
  m.sphere(-.13,.03,.27,.065,red,9,5);return m;
}
function buildCrashExplosion(){
  const m=new MeshBuilder();
  m.cone(0,0,0,1.15,2.3,9,hex("#c83e2d"),hex("#f45b32"));
  m.cone(0,.18,-.08,.78,1.9,8,hex("#f07b32"),hex("#ffb34f"));
  m.cone(0,.42,-.12,.42,1.2,7,hex("#ffd16c"),hex("#fff0ae"));
  m.cone(-.55,.1,.18,.48,1.35,7,hex("#6f625a"),hex("#97877a"));
  m.cone(.48,.06,-.16,.42,1.15,7,hex("#504d4c"),hex("#8b7766"));
  for(let i=0;i<12;i++){
    const a=i/12*Math.PI*2,dist=1+(i%3)*.24,x=Math.cos(a)*dist,z=Math.sin(a)*dist*.55,y=.45+(i%4)*.28;
    m.box([x,y,z],[.16,.18,.16],i%2?hex("#f5a34c"):hex("#a94d36"));
  }
  return m;
}

function buildWorld() {
  const world = new MeshBuilder();
  const random = randomSource(4081);
  const destinationSignZ = DESTINATION_SIGN_Z;

  // Terreno patagónico nocturno: relieve poligonal y valores oscuros para que destaque la luz del auto.
  const xSteps = 48, zSteps = 180;
  for (let zi = 0; zi < zSteps; zi++) {
    const z0 = -540 + (zi / zSteps) * 558;
    const z1 = -540 + ((zi + 1) / zSteps) * 558;
    for (let xi = 0; xi < xSteps; xi++) {
      const x0 = -176 + (xi / xSteps) * 260;
      const x1 = -176 + ((xi + 1) / xSteps) * 260;
      // Hunde el terreno solo bajo la bajada para que la malla verde no atraviese el asfalto.
      const a: V3 = [x0, terrainSurfaceY(x0, z0), z0];
      const b: V3 = [x0, terrainSurfaceY(x0, z1), z1];
      const c: V3 = [x1, terrainSurfaceY(x1, z1), z1];
      const d: V3 = [x1, terrainSurfaceY(x1, z0), z0];
      const palette = random() > 0.56 ? hex("#1a2830") : hex("#202b33");
      const shade = 0.88 + random() * 0.18;
      world.quad(a, b, c, d, [palette[0] * shade, palette[1] * shade, palette[2] * shade]);
    }
  }

  // Cordilleras lejanas a ambos lados, sin cruzarse visualmente con la estación YPF.
  // Del lado del aeródromo, las lomas quedan bastante más lejos para abrir el campo visual.
  addRoadsideMountainRange(world, -1, 31, 188, 236, 15);
  addRoadsideMountainRange(world, 1, 47, 62, 104, 15);
  addRoadsideMountainRange(world, -1, 71, 246, 302, 21);
  addRoadsideMountainRange(world, 1, 89, 112, 160, 21);

  // Banquinas, asfalto, marcas viales y pequeños parches de pavimento.
  for (let z = -520; z < 17; z += 2.5) {
    const next = z + 2.5;
    const c0 = roadCenter(z), c1 = roadCenter(next);
    const left0 = c0 - 4.15, right0 = c0 + 4.15;
    const left1 = c1 - 4.15, right1 = c1 + 4.15;
    const roadY0 = roadHeightAt(z);
    const roadY1 = roadHeightAt(next);
    world.quad([left0, roadY0, z], [left1, roadY1, next], [right1, roadY1, next], [right0, roadY0, z], hex("#202a33"));
    world.quad([c0 - 5.25, roadY0 - 0.05, z], [c1 - 5.25, roadY1 - 0.05, next], [left1, roadY1 - 0.05, next], [left0, roadY0 - 0.05, z], hex("#30363b"));
    world.quad([right0, roadY0 - 0.05, z], [right1, roadY1 - 0.05, next], [c1 + 5.25, roadY1 - 0.05, next], [c0 + 5.25, roadY0 - 0.05, z], hex("#30363b"));
    // Doble línea central amarilla, continua y gastada.
    for (const offset of [-0.105, 0.105]) {
      world.quad(
        [c0 + offset - 0.035, roadY0 + 0.018, z], [c1 + offset - 0.035, roadY1 + 0.018, next],
        [c1 + offset + 0.035, roadY1 + 0.018, next], [c0 + offset + 0.035, roadY0 + 0.018, z],
        hex("#b7a16e"),
      );
    }
    for (const offset of [-3.92, 3.92]) {
      world.quad(
        [c0 + offset - 0.045, roadY0 + 0.02, z], [c1 + offset - 0.045, roadY1 + 0.02, next],
        [c1 + offset + 0.045, roadY1 + 0.02, next], [c0 + offset + 0.045, roadY0 + 0.02, z],
        hex("#a9aaa0"),
      );
    }
    if (Math.floor((z + 148) / 2.5) % 3 === 0) {
      world.quad([c0 - 3.8, roadY0 + 0.025, z], [c1 - 3.8, roadY1 + 0.025, next], [c1 - 3.55, roadY1 + 0.025, next], [c0 - 3.55, roadY0 + 0.025, z], hex("#4a4b48"));
    }
  }

  // Guardarraíles metálicos con postes separados y sombras propias.
  for (const side of [-1, 1]) {
    for (let z = -517; z < 15; z += 4.2) {
      const x = roadCenter(z) + side * 4.72;
      world.box([x, roadHeightAt(z) + 0.49, z], [0.14, 0.98, 0.14], hex("#555d5e"));
    }
    for (let z = -517; z < 14; z += 4.2) {
      const mid = z + 2.1, x = roadCenter(mid) + side * 4.72;
      world.box([x, roadHeightAt(mid) + 0.92, mid], [0.19, 0.18, 4.3], hex("#727a79"), hex("#424c50"));
    }
  }

  // Pinos patagónicos con variaciones de altura, copa y separación.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 30; i++) {
      const z = 10 - i * 5.25 - random() * 2.7;
      if (side === 1 && Math.abs(z - destinationSignZ) < 22) continue;
      if (side < 0 && z < -74 && z > -258) continue;
      const x = roadCenter(z) + side * (8.5 + random() * 8.5);
      const height = 4.2 + random() * 6.4;
      addPine(world, x, z, terrainY(x, z), height, Math.floor(random() * 1000));
    }
    for (let i = 0; i < 21; i++) {
      const z = 7 - i * 6.9 - random() * 3;
      if (side === 1 && Math.abs(z - destinationSignZ) < 22) continue;
      if (side < 0 && z < -74 && z > -258) continue;
      const x = roadCenter(z) + side * (16 + random() * 23);
      const height = 5.5 + random() * 8;
      addPine(world, x, z, terrainY(x, z), height, Math.floor(random() * 1000));
    }
  }

  // Bosque profundo en varias capas: pinos de tamaños y distancias diferentes, sin invadir la calzada.
  const distantForest = randomSource(2284);
  for (let i = 0; i < 34; i++) {
    const z = -45 - i * 7.25 - distantForest() * 2.2;
    for (const side of [-1, 1]) {
      if (side === 1 && Math.abs(z + 166) < 24) continue;
      if (side < 0 && z < -74 && z > -258) continue;
      const x = roadCenter(z) + side * (13 + distantForest() * 37);
      const depthScale = 0.68 + (i / 34) * 0.32;
      const height = (5.1 + distantForest() * 6.8) * depthScale;
      addPine(world, x, z, terrainY(x, z), height, Math.floor(distantForest() * 1000));
    }
  }

  // Pequeñas luces cálidas del valle, muy alejadas y suavizadas por la niebla.
  for (let i = 0; i < 9; i++) {
    const z = -188 - i * 9.2;
    const x = roadCenter(z) + (35 + distantForest() * 30);
    const y = terrainY(x, z) + 2.6 + distantForest() * 1.8;
    world.box([x, y, z], [0.32, 0.24, 0.16], i % 3 === 0 ? hex("#e8b978") : hex("#d79d6d"));
  }

  // Taludes rocosos que acompañan la pendiente y árboles pegados al camino.
  for (const side of [-1, 1]) {
    for (let z = -178; z >= -512; z -= 5.2) {
      if (side < 0 && z < -74 && z > -258) continue;
      const next = z - 5.2;
      const c0 = roadCenter(z), c1 = roadCenter(next);
      const y0 = roadHeightAt(z), y1 = roadHeightAt(next);
      const inner0 = c0 + side * 4.25;
      const inner1 = c1 + side * 4.25;
      const outer0 = c0 + side * 25.5;
      const outer1 = c1 + side * 25.5;
      world.quad(
        [inner0, y0 - 0.03, z], [inner1, y1 - 0.03, next],
        [outer1, y1 - 7.2, next], [outer0, y0 - 7.2, z],
        hex(side < 0 ? "#3f494b" : "#485152"),
      );
    }
    for (let z = -180; z >= -508; z -= 8.4) {
      if (side < 0 && z < -74 && z > -258) continue;
      const x = roadCenter(z) + side * (8.2 + random() * 2.6);
      const y = roadHeightAt(z) - 1.4 - random() * 0.8;
      const height = 5.2 + random() * 5.5;
      addPine(world, x, z, y, height, Math.floor(random() * 1000));
    }
    for (let z = -184; z >= -508; z -= 13.5) {
      if (side < 0 && z < -74 && z > -258) continue;
      const x = roadCenter(z) + side * (18 + random() * 6.2);
      const y = roadHeightAt(z) - 6.2 - random() * 0.7;
      addPine(world, x, z, y, 6.5 + random() * 5.5, Math.floor(random() * 1000));
    }
  }

  // Bosque de la última subida: acompaña la ruta hasta después de la secuencia final.
  const uphillForest = randomSource(6182);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 43; i++) {
      const z = -164 - i * 8.4 - uphillForest() * 2.1;
      const x = roadCenter(z) + side * (9.2 + uphillForest() * 8.8);
      const base = terrainSurfaceY(x, z) - 0.1;
      const height = 5.4 + uphillForest() * 5.8;
      addPine(world, x, z, base, height, Math.floor(uphillForest() * 1000));
    }
  }

  // Matorrales y rocas facetadas junto a las banquinas.
  for (let i = 0; i < 85; i++) {
    const side = random() > 0.5 ? 1 : -1;
    const z = 12 - random() * 135;
    if (side === 1 && Math.abs(z - destinationSignZ) < 24) continue;
    if (side < 0 && z < -74 && z > -258) continue;
    const x = roadCenter(z) + side * (6.4 + random() * 8.4);
    const y = terrainY(x, z);
    if (i % 3 === 0) {
      world.cone(x, y, z, 0.5 + random() * 0.7, 0.55 + random() * 0.8, 5, hex("#28372d"));
    } else {
      const rock = hex(i % 2 ? "#545b57" : "#66675f");
      world.cone(x, y, z, 0.35 + random() * 0.65, 0.35 + random() * 0.65, 5, rock);
    }
  }

  // Postes de madera y cables en la margen de la ruta, sin atravesar la bicisenda ni la pista.
  for (const side of [-1, 1]) {
    const poleOffset = side < 0 ? -20.5 : 15.8;
    for (let i = 0; i < 38; i++) {
      const z = 7 - i * 14;
      if (side < 0 && z < -74 && z > -258) continue;
      // Deja libre el césped alrededor del cartel para que los postes y cables no lo tapen.
      if (side > 0 && (Math.abs(z - destinationSignZ) < 18 || Math.abs(z - 15 - destinationSignZ) < 18)) continue;
      const x = roadCenter(z) + poleOffset;
      const y = roadHeightAt(z) - 0.18;
      world.box([x, y + 4.3, z], [0.24, 8.6, 0.24], hex("#40372d"));
      world.box([x, y + 7.7, z], [2.7, 0.16, 0.16], hex("#4a4035"));
      world.box([x - 0.78, y + 7.45, z], [0.1, 0.7, 0.1], hex("#3d352d"));
      world.box([x + 0.78, y + 7.45, z], [0.1, 0.7, 0.1], hex("#3d352d"));
      if (i < 37) {
        const nextZ = z - 15, nextX = roadCenter(nextZ) + poleOffset;
        world.beam([x - 0.8, y + 7.75, z], [nextX - 0.8, roadHeightAt(nextZ) - 0.18 + 7.75, nextZ], 0.045, hex("#232c31"));
        world.beam([x + 0.8, y + 7.75, z], [nextX + 0.8, roadHeightAt(nextZ) - 0.18 + 7.75, nextZ], 0.045, hex("#30373a"));
      }
    }
  }

  // El predio abierto, la bicisenda y la pista quedan en el margen izquierdo; la YPF permanece a la derecha.
  addBikePathAndAerodrome(world);
  addSchoolAndFootballField(world);

  // Cartel de advertencia existente y un cartel verde de distancia a El Bolsón.
  const signX = roadCenter(-29) + 7.8, signZ = -29, signY = terrainY(signX, signZ);
  world.box([signX, signY + 1.18, signZ], [0.13, 2.36, 0.13], hex("#514435"));
  world.box([signX, signY + 2.38, signZ], [1.25, 0.98, 0.16], hex("#9b8a6e"), hex("#5d5448"));
  world.cone(signX, signY + 2.1, signZ - 0.11, 0.31, 0.55, 3, hex("#a94f3f"));

  addYPFStation(world);

  const signalZ=SIGNAL_Z,signalX=roadCenter(signalZ)+3.55,signalGround=roadHeightAt(signalZ)-.18;
  world.box([signalX,signalGround+3.1,signalZ],[.2,6.2,.2],hex("#42484a"));
  world.beam([signalX,signalGround+6.2,signalZ],[signalX-1.3,signalGround+6.2,signalZ],.18,hex("#42484a"));
  world.box([signalX,signalGround+5.45,signalZ],[.92,2.35,.66],hex("#20272b"),hex("#394044"));
  world.sphere(signalX,signalGround+6.12,signalZ+.36,.235,hex("#4b2020"),16,9);
  world.sphere(signalX,signalGround+5.45,signalZ+.36,.235,hex("#514425"),16,9);
  world.sphere(signalX,signalGround+4.78,signalZ+.36,.235,hex("#1d432c"),16,9);
  world.box([roadCenter(SIGNAL_STOP_Z-2),roadHeightAt(SIGNAL_STOP_Z-2)-.1,SIGNAL_STOP_Z-2],[8.6,.055,.18],hex("#e7dfce"));
  return world;
}

function buildDestinationSign() {
  const sign = new MeshBuilder();
  const signX = roadCenter(DESTINATION_SIGN_Z) + 13.6;
  // Se apoya sobre la superficie real del césped, no sobre la altura de la calzada.
  const groundY = terrainSurfaceY(signX, DESTINATION_SIGN_Z);
  const boardY = groundY + 3.65;

  for (const dx of [-4.5, 4.5]) {
    sign.box([signX + dx, groundY + 1.85, DESTINATION_SIGN_Z], [0.28, 3.7, 0.3], hex("#514638"));
    sign.box([signX + dx, groundY + 0.12, DESTINATION_SIGN_Z], [0.82, 0.2, 0.62], hex("#625642"), hex("#403a30"));
  }

  sign.box([signX, boardY, DESTINATION_SIGN_Z], [11.8, 2.9, 0.38], hex("#102f35"), hex("#1c5a4a"));
  sign.box([signX, boardY + 1.28, DESTINATION_SIGN_Z + 0.22], [11.25, 0.075, 0.055], hex("#d3c28f"));
  sign.box([signX, boardY - 1.28, DESTINATION_SIGN_Z + 0.22], [11.25, 0.075, 0.055], hex("#d3c28f"));
  sign.box([signX, boardY + 1.42, DESTINATION_SIGN_Z + 0.22], [1.15, 0.11, 0.07], hex("#f4d8a1"));
  addPixelText(sign, "EL BOLSÓN", signX, boardY + 0.52, DESTINATION_SIGN_Z + 0.24, 0.18, hex("#fff5dc"));
  addPixelText(sign, "2 KILÓMETROS", signX, boardY - 0.52, DESTINATION_SIGN_Z + 0.24, 0.145, hex("#fff5dc"));
  return sign;
}

function buildSkyDressing() {
  const sky=new MeshBuilder(),random=randomSource(9041);
  // Atardecer naranja con sol bajo y halo cálido.
  sky.disc(-45,52,-420,9.0,hex("#b94f3b"),48);sky.disc(-45,52,-419.7,6.8,hex("#e36f49"),48);
  sky.disc(-45,52,-419.4,4.7,hex("#f5a15f"),48);sky.disc(-45,52,-419.1,2.9,hex("#ffe0a4"),48);
  const clouds=[[-59,31,-278,22,4,4.8],[-43,34,-279,18,4.4,4.8],[-26,32,-280,18,3.4,4.2],[-5,34,-282,23,4.2,5],[20,36,-282,19,4.3,5],[41,33,-280,20,3.4,4.6],[61,29,-278,18,3,4.4]];
  for(let i=0;i<clouds.length;i++){const [x,y,z,w,h,d]=clouds[i]!;sky.box([x,y,z],[w,h,d],hex("#65515a"),hex("#514957"));sky.box([x-w*.18,y+h*.22,z-.08],[w*.52,h*.58,d*.88],hex("#bd735d"));sky.box([x+w*.22,y+h*.18,z+.05],[w*.48,h*.48,d*.9],i%2?hex("#e08a5d"):hex("#ca795d"));}
  // Silueta de montañas al fondo, detrás del extremo de la carretera: nunca cruza la calzada ni la cámara.
  const peaks=[[-154,-8],[-128,5],[-106,-4],[-82,23],[-61,-6],[-39,13],[-17,42],[8,5],[32,31],[56,-5],[77,20],[101,-5],[126,14],[154,-8]];
  for(let i=0;i<peaks.length-1;i++){const [x0,y0]=peaks[i]!,[x1,y1]=peaks[i+1]!,px=(x0+x1)*.5,py=Math.max(y0,y1)+11+random()*8,shade=i%3===0?hex("#3b354b"):i%3===1?hex("#514052"):hex("#414057");sky.triangle([x0,-11,-560],[px,py,-566],[x1,-11,-560],shade);sky.triangle([x0,-11,-560.2],[px,Math.max(0,py*.5),-565.9],[x1,-11,-560.2],hex("#6d5360"));}
  return sky;
}

function buildCar() {
  const car = new MeshBuilder();
  car.box([0, 0.48, 0], [1.9, 0.62, 4.45], hex("#252c32"), hex("#465158"));
  car.box([0, 0.9, -0.18], [1.52, 0.85, 2.2], hex("#192630"), hex("#485b62"));
  car.box([0, 1.26, -0.2], [1.43, 0.09, 2.05], hex("#293940"));
  car.box([0, 1.315, -0.18], [1.18, 0.025, 1.52], hex("#3b4850"));
  car.box([0, 1.33, -0.18], [0.055, 0.018, 1.45], hex("#1b242b"));
  car.beam([-0.62, 1.34, -0.78], [-0.62, 1.34, 0.48], 0.045, hex("#758087"));
  car.beam([0.62, 1.34, -0.78], [0.62, 1.34, 0.48], 0.045, hex("#758087"));
  car.box([0, 1.03, -0.93], [1.44, 0.56, 0.08], hex("#54656a"));
  car.box([0, 1.03, 0.7], [1.4, 0.56, 0.08], hex("#192a32"));
  for (const x of [-0.98, 0.98]) {
    for (const z of [-1.35, 1.35]) {
      car.box([x, 0.42, z], [0.22, 0.58, 0.86], hex("#090d11"));
    }
  }
  for (const x of [-0.62, 0.62]) {
    car.box([x, 0.55, 2.2], [0.33, 0.16, 0.1], hex("#a4463d"));
  }
  car.box([0, 0.81, 2.18], [1.1, 0.08, 0.12], hex("#171e24"));
  return car;
}


const CAMP_STOP_DISTANCE = 86;
const CAMP_GATE_Z = -26;
const CAMP_RIVER_Z = -153;

function campRoadX(z: number) {
  return Math.sin(z * 0.024) * 2.7 + Math.sin(z * 0.061) * 0.62;
}

function campGroundY(x: number, z: number) {
  const natural = -0.12 + Math.sin(x * 0.16 + z * 0.055) * 0.13 + Math.sin(z * 0.095 - x * 0.035) * 0.085;
  const riverBasin = (1 - smooth(30, 47, Math.abs(x))) * (1 - smooth(18, 31, Math.abs(z - CAMP_RIVER_Z)));
  return natural - riverBasin * 2.65;
}

function addCampingTree(mesh: MeshBuilder, x: number, z: number, height: number, seed: number, broadleaf: boolean) {
  const base = campGroundY(x, z);
  const trunkColor = hex(seed % 2 ? "#49372b" : "#58402f");
  const trunkHeight = height * (broadleaf ? 0.56 : 0.72);
  mesh.box([x, base + trunkHeight * 0.5, z], [height * 0.065, trunkHeight, height * 0.07], trunkColor);
  if (broadleaf) {
    const foliage = [hex("#31513b"), hex("#3c6244"), hex("#496f4c"), hex("#294834")];
    const crownY = base + height * 0.73;
    mesh.ellipsoid(x, crownY, z, height * 0.3, height * 0.25, height * 0.27, foliage[Math.floor(seed) % foliage.length]!, 10, 6);
    mesh.ellipsoid(x - height * 0.17, crownY - height * 0.06, z + height * 0.08, height * 0.2, height * 0.19, height * 0.2, foliage[(Math.floor(seed) + 1) % foliage.length]!, 9, 5);
    mesh.ellipsoid(x + height * 0.16, crownY - height * 0.03, z - height * 0.07, height * 0.19, height * 0.18, height * 0.2, foliage[(Math.floor(seed) + 2) % foliage.length]!, 9, 5);
  } else {
    const greens = [hex("#183c32"), hex("#20503a"), hex("#285a40"), hex("#316346")];
    const layers = 4;
    for (let layer = 0; layer < layers; layer++) {
      const fraction = layer / layers;
      const crownBase = base + height * (0.19 + fraction * 0.43);
      const radius = height * (0.34 - fraction * 0.065) * (0.92 + (seed % 7) * 0.018);
      mesh.cone(x, crownBase, z, radius, height * (0.48 - fraction * 0.055), 6, greens[(Math.floor(seed + layer) % greens.length)]!, greens[(Math.floor(seed + layer + 1) % greens.length)]!);
    }
  }
}

function buildCampingWorld() {
  const world = new MeshBuilder();
  const random = randomSource(9164);

  // Terreno irregular: praderas, pequeñas ondulaciones y una depresión natural bajo el río.
  for (let z0 = 24; z0 > -238; z0 -= 10) {
    const z1 = z0 - 10;
    for (let x0 = -100; x0 < 100; x0 += 10) {
      const x1 = x0 + 10;
      const point = (x: number, z: number): V3 => [x, campGroundY(x, z), z];
      const p00 = point(x0, z0), p10 = point(x1, z0), p11 = point(x1, z1), p01 = point(x0, z1);
      const shade = random();
      const color = hex(shade > 0.72 ? "#405a3b" : shade > 0.36 ? "#354f38" : "#2d4834");
      world.triangle(p00, p10, p11, color);
      world.triangle(p00, p11, p01, color);
    }
  }

  // Camino de ripio con curvas suaves; el ancho nunca se estrecha en la tranquera.
  for (let z = 18; z > -122; z -= 2.4) {
    const next = z - 2.4;
    const center0 = campRoadX(z), center1 = campRoadX(next);
    const y0 = 0.035 + campGroundY(center0, z) * 0.12;
    const y1 = 0.035 + campGroundY(center1, next) * 0.12;
    const color = hex(Math.floor((z + 122) / 2.4) % 3 === 0 ? "#8c785d" : "#79684f");
    world.quad([center0 - 3.7, y0, z], [center0 + 3.7, y0, z], [center1 + 3.7, y1, next], [center1 - 3.7, y1, next], color);
    world.quad([center0 - 4.25, y0 - 0.012, z], [center0 - 3.72, y0 - 0.012, z], [center1 - 3.72, y1 - 0.012, next], [center1 - 4.25, y1 - 0.012, next], hex("#9a8666"));
    world.quad([center0 + 3.72, y0 - 0.012, z], [center0 + 4.25, y0 - 0.012, z], [center1 + 4.25, y1 - 0.012, next], [center1 + 3.72, y1 - 0.012, next], hex("#9a8666"));
  }

  // Piedras pequeñas y pastos silvestres a los costados del camino.
  for (let i = 0; i < 170; i++) {
    const z = 17 - random() * 168;
    const side = random() > 0.5 ? 1 : -1;
    const x = campRoadX(z) + side * (5.2 + random() * 16.5);
    if (Math.abs(z - CAMP_RIVER_Z) < 34 && Math.abs(x) < 25) continue;
    const y = campGroundY(x, z);
    if (i % 3 === 0) {
      world.ellipsoid(x, y + 0.16, z, 0.28 + random() * 0.34, 0.16 + random() * 0.13, 0.3 + random() * 0.32, hex(i % 2 ? "#64705e" : "#737568"), 8, 5);
    } else {
      world.cone(x, y, z, 0.16 + random() * 0.24, 0.36 + random() * 0.52, 4, hex(i % 2 ? "#4a6b42" : "#607b49"));
    }
  }

  // Bosque de coihues, cipreses y coníferas escalonadas; se conserva un claro visual hacia el río.
  for (let i = 0; i < 112; i++) {
    const z = 16 - random() * 212;
    const side = random() > 0.5 ? 1 : -1;
    const x = campRoadX(z) + side * (11.5 + random() * 38);
    const bridgeView = z < -126 && z > -185 && Math.abs(x) < 24;
    const riverShore = Math.abs(z - CAMP_RIVER_Z) < 12 && Math.abs(x) < 37;
    if (bridgeView || riverShore) continue;
    const broadleaf = i % 4 === 0 || i % 7 === 0;
    const height = broadleaf ? 10 + random() * 9 : 13 + random() * 15;
    addCampingTree(world, x, z, height, Math.floor(random() * 9000), broadleaf);
  }
  // Segunda línea de bosque en la orilla opuesta, con copas que enmarcan la cordillera.
  for (let i = 0; i < 27; i++) {
    const x = -83 + random() * 166;
    const z = -190 - random() * 24;
    if (Math.abs(x) < 23) continue;
    addCampingTree(world, x, z, 12 + random() * 12, Math.floor(random() * 8000), i % 5 === 0);
  }

  // Entrada rural: dos postes gruesos, piedras de apoyo y herrajes visibles.
  for (const x of [-5.65, 5.65]) {
    const y = campGroundY(x, CAMP_GATE_Z);
    world.box([x, y + 1.82, CAMP_GATE_Z], [0.48, 3.64, 0.5], hex("#58412e"), hex("#73543a"));
    world.box([x, y + 3.56, CAMP_GATE_Z], [0.72, 0.2, 0.7], hex("#8a6742"));
    world.ellipsoid(x, y + 0.18, CAMP_GATE_Z, 0.9, 0.22, 0.74, hex("#66685a"), 7, 4);
  }
  // Pequeño dintel de madera sobre el acceso.
  world.beam([-5.65, 3.42, CAMP_GATE_Z], [5.65, 3.42, CAMP_GATE_Z], 0.24, hex("#62482f"));

  // Formaciones rocosas que contienen el río y conectan visualmente las dos orillas.
  for (let i = 0; i < 44; i++) {
    const side = i % 2 ? -1 : 1;
    const x = side * (31 + random() * 16);
    const z = CAMP_RIVER_Z - 16 + random() * 32;
    const y = campGroundY(x, z);
    world.ellipsoid(x, y + 0.2, z, 0.8 + random() * 1.7, 0.35 + random() * 0.7, 0.8 + random() * 1.4, hex(i % 3 ? "#777c70" : "#8d8979"), 8, 5);
  }

  // Piedras de canto rodado bajo el agua, asentadas en el fondo del cauce.
  for (let i = 0; i < 86; i++) {
    const x = -34 + random() * 68;
    const z = CAMP_RIVER_Z - 11 + random() * 22;
    const ground = campGroundY(x, z);
    const radius = 0.28 + random() * 0.48;
    world.ellipsoid(x, ground + 0.16, z, radius * 1.25, 0.18 + random() * 0.14, radius, hex(i % 3 ? "#777f78" : "#8c9185"), 8, 5);
  }

  // Montañas lejanas patagónicas, con planos facetados y sombras violetas de atardecer.
  const peaks: Array<[number, number]> = [[-105, 4], [-82, 20], [-62, 9], [-39, 31], [-15, 12], [12, 35], [38, 16], [61, 29], [85, 8], [108, 3]];
  for (let i = 0; i < peaks.length - 1; i++) {
    const [x0, h0] = peaks[i]!, [x1, h1] = peaks[i + 1]!;
    const middleX = (x0 + x1) * 0.5;
    const peakY = Math.max(h0, h1) + 10 + random() * 7;
    world.triangle([x0, -3, -226], [middleX, peakY, -231], [x1, -3, -226], hex(i % 2 ? "#51465b" : "#655064"));
    world.triangle([x0, -3, -226.3], [middleX, peakY * 0.62, -230.7], [x1, -3, -226.3], hex("#79606a"));
    if (i % 2 === 0) {
      world.triangle([middleX - 4, peakY - 1, -230], [middleX, peakY, -231], [middleX + 4, peakY - 1, -230], hex("#c0b7b2"));
    }
  }

  // Sol bajo, nubes de atardecer y luna visible, de escala contenida.
  world.sphere(-48, 16, -214, 5.0, hex("#e9a06b"), 16, 9);
  world.sphere(42, 29, -228, 2.45, hex("#e6dfd1"), 16, 9);
  for (let i = 0; i < 10; i++) {
    const x = -76 + i * 16;
    const y = 25 + Math.sin(i * 1.8) * 4;
    const z = -202 - (i % 3) * 2;
    world.box([x, y, z], [14, 1.8 + (i % 2) * 1.2, 2.3], hex(i % 2 ? "#805968" : "#a46b62"), hex("#604c60"));
  }

  return world;
}

function buildCampingWater() {
  const water = new MeshBuilder();
  const xSteps = 30, zSteps = 12;
  for (let zi = 0; zi < zSteps; zi++) {
    const z0 = -132 - zi * 3.7;
    const z1 = z0 - 3.7;
    for (let xi = 0; xi < xSteps; xi++) {
      const x0 = -58 + xi * 3.9;
      const x1 = x0 + 3.9;
      const shade = Math.sin((xi + zi) * 0.72) * 0.5 + 0.5;
      const color = shade > 0.68 ? hex("#5aa89e") : shade > 0.36 ? hex("#397f82") : hex("#286276");
      water.quad([x0, -0.86, z0], [x1, -0.86, z0], [x1, -0.86, z1], [x0, -0.86, z1], color);
    }
  }
  return water;
}

function buildCampingBridge() {
  const bridge = new MeshBuilder();
  const green = hex("#315b47"), greenLight = hex("#547e61"), darkGreen = hex("#243f35");
  const meshWire = hex("#8ba18b");
  const halfSpan = 40;
  const deckY = 1.12;
  const deckHalfWidth = 0.82;
  const bridgeZ = (x: number) => CAMP_RIVER_Z - x * 0.075;
  const bankY = (x: number, z: number) => campGroundY(x, z);

  // Torres y anclajes asentados en la altura real de cada margen.
  for (const side of [-1, 1]) {
    const x = side * halfSpan, z = bridgeZ(x), ground = bankY(x, z);
    bridge.ellipsoid(x, ground + 0.26, z, 2.8, 0.55, 2.25, hex("#72766b"), 8, 5);
    bridge.beam([x, ground + 0.15, z], [x, 5.35, z], 0.3, darkGreen);
    bridge.beam([x - 1.0, ground + 0.15, z - 0.9], [x + 1.0, 5.35, z + 0.9], 0.2, green);
    bridge.beam([x + 1.0, ground + 0.15, z - 0.9], [x - 1.0, 5.35, z + 0.9], 0.2, green);
    bridge.beam([x - 1.35, 5.35, z], [x + 1.35, 5.35, z], 0.22, greenLight);
  }

  // Dos largueros metálicos sostienen un tablero angosto, de tablones independientes.
  for (const side of [-1, 1]) {
    const offset = side * deckHalfWidth;
    bridge.beam([-halfSpan, deckY, bridgeZ(-halfSpan) + offset], [halfSpan, deckY, bridgeZ(halfSpan) + offset], 0.19, green);
    bridge.beam([-halfSpan, deckY + 0.76, bridgeZ(-halfSpan) + offset], [halfSpan, deckY + 0.76, bridgeZ(halfSpan) + offset], 0.115, greenLight);
  }
  for (let x = -halfSpan + 0.9; x < halfSpan; x += 1.8) {
    const z = bridgeZ(x);
    bridge.box([x, deckY - 0.09, z], [1.72, 0.16, deckHalfWidth * 2], hex(Math.floor(x) % 2 ? "#886d4f" : "#9b805d"));
    bridge.beam([x, deckY - 0.04, z - deckHalfWidth], [x, deckY - 0.04, z + deckHalfWidth], 0.075, darkGreen);
  }

  // Malla metálica lateral en rombos, como las pasarelas colgantes de la zona del Río Azul.
  for (const side of [-1, 1]) {
    const railZ = (x: number) => bridgeZ(x) + side * deckHalfWidth;
    for (let x = -halfSpan + 0.2; x < halfSpan - 0.2; x += 1.25) {
      const x1 = Math.min(halfSpan - 0.05, x + 1.25);
      bridge.beam([x, deckY + 0.12, railZ(x)], [x1, deckY + 0.7, railZ(x1)], 0.018, meshWire);
      bridge.beam([x, deckY + 0.7, railZ(x)], [x1, deckY + 0.12, railZ(x1)], 0.018, meshWire);
    }
    for (let x = -halfSpan + 1.6; x <= halfSpan - 1.6; x += 3.2) {
      bridge.beam([x, deckY + 0.1, railZ(x)], [x, 5.35 - Math.pow(Math.abs(x) / halfSpan, 2) * 0.88, railZ(x)], 0.035, green);
    }
  }

  // Cables principales con la curva de suspensión descendiendo suavemente en el centro.
  const cableY = (x: number) => 5.35 - (1 - Math.pow(Math.abs(x) / halfSpan, 2)) * 0.88;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 32; i++) {
      const x0 = -halfSpan + i * (halfSpan * 2 / 32), x1 = x0 + (halfSpan * 2 / 32);
      const z0 = bridgeZ(x0) + side * (deckHalfWidth + 0.12), z1 = bridgeZ(x1) + side * (deckHalfWidth + 0.12);
      bridge.beam([x0, cableY(x0), z0], [x1, cableY(x1), z1], 0.07, greenLight);
    }
    for (let x = -halfSpan + 2; x <= halfSpan - 2; x += 2.5) {
      const z = bridgeZ(x) + side * (deckHalfWidth + 0.12);
      bridge.beam([x, deckY + 0.75, z], [x, cableY(x), z], 0.035, green);
    }
  }

  // Accesos de tablas en ambas orillas para que la pasarela no termine suspendida sobre el terreno.
  for (const side of [-1, 1]) {
    for (let step = 0; step < 5; step++) {
      const x = side * (halfSpan + 1.2 + step * 1.25);
      const z = bridgeZ(side * halfSpan);
      const ground = bankY(x, z);
      const t = (step + 1) / 5;
      const y = mix(deckY, ground + 0.13, t);
      bridge.box([x, y, z], [1.2, 0.14, 1.55], step % 2 ? hex("#886d4f") : hex("#9b805d"));
    }
  }
  return bridge;
}

function buildCampingGateLeaf() {
  const gate = new MeshBuilder();
  const wood = hex("#704f31"), lightWood = hex("#9a7448");
  gate.beam([0, 1.28, 0], [11.1, 1.28, 0], 0.24, wood);
  gate.beam([0, 2.15, 0], [11.1, 2.15, 0], 0.22, lightWood);
  for (const x of [0.22, 3.7, 7.4, 10.9]) {
    gate.beam([x, 0.3, 0], [x, 2.35, 0], 0.19, x % 2 ? wood : lightWood);
  }
  gate.beam([0.18, 0.32, 0], [11.0, 2.3, 0], 0.15, wood);
  gate.beam([0.18, 2.28, 0], [11.0, 0.32, 0], 0.11, lightWood);
  return gate;
}

function buildCampingDoor() {
  const door = new MeshBuilder();
  door.box([0.035, 0.52, 1.03], [0.13, 0.94, 2.02], hex("#28343a"), hex("#465057"));
  door.box([0.09, 1.17, 1.03], [0.08, 0.36, 1.91], hex("#455c62"), hex("#30454e"));
  door.box([0.12, 0.88, 0.17], [0.035, 0.065, 0.18], hex("#a18a65"));
  door.beam([0.1, 0.08, 0.22], [0.1, 0.08, 1.8], 0.045, hex("#161e24"));
  return door;
}

function buildCampingCarExterior() {
  const car = new MeshBuilder();
  const body = hex("#252c32"), bodyLight = hex("#465158");
  const dark = hex("#11191e"), glass = hex("#344c55"), trim = hex("#758087");

  // Carrocería exterior exclusiva del camping: el compartimiento trasero queda abierto por arriba.
  car.box([0, 0.48, -0.48], [1.9, 0.62, 2.95], body, bodyLight);
  car.box([0, 0.9, -0.18], [1.52, 0.85, 2.2], hex("#192630"), hex("#485b62"));
  car.box([0, 1.26, -0.2], [1.43, 0.09, 2.05], hex("#293940"));
  car.box([0, 1.315, -0.18], [1.18, 0.025, 1.52], hex("#3b4850"));
  car.box([0, 1.03, -0.93], [1.44, 0.56, 0.08], hex("#54656a"));
  car.box([0, 1.03, 0.7], [1.4, 0.56, 0.08], hex("#192a32"));

  // Vidrios laterales, techo y marcos, manteniendo la silueta del vehículo anterior.
  for (const side of [-1, 1]) {
    car.box([side * 0.78, 1.03, -0.08], [0.055, 0.53, 1.72], glass);
    car.beam([side * 0.8, 1.28, -0.96], [side * 0.8, 1.28, 0.78], 0.045, trim);
    car.beam([side * 0.8, 0.77, -0.96], [side * 0.8, 0.77, 0.78], 0.045, dark);
    car.box([side * 0.98, 0.42, -1.35], [0.22, 0.58, 0.86], dark);
    car.box([side * 0.98, 0.42, 1.35], [0.22, 0.58, 0.86], dark);
    car.box([side * 0.62, 0.55, -2.05], [0.33, 0.16, 0.1], hex("#d8cfb5"));
    car.box([side * 0.62, 0.55, 2.03], [0.33, 0.16, 0.1], hex("#a4463d"));
  }

  // Piso y paredes bajas del baúl; la bolsa y la caja quedan dentro de sus límites.
  car.box([0, 0.31, 1.58], [1.58, 0.16, 1.05], hex("#242a2d"), hex("#3c4546"));
  car.box([-0.78, 0.65, 1.58], [0.14, 0.62, 1.05], body, bodyLight);
  car.box([0.78, 0.65, 1.58], [0.14, 0.62, 1.05], body, bodyLight);
  car.box([0, 0.58, 2.08], [1.58, 0.52, 0.12], body, bodyLight);
  car.box([0, 0.35, 2.22], [1.86, 0.25, 0.16], hex("#20272c"));
  car.box([0, 0.81, -2.02], [1.1, 0.08, 0.12], dark);
  car.box([0, 0.81, 1.52], [1.58, 0.12, 0.12], dark);
  return car;
}

function buildCampingTrunkClosed() {
  const hatch = new MeshBuilder();
  hatch.box([0, -0.43, 0], [1.54, 0.9, 0.18], hex("#252e35"), hex("#48555d"));
  hatch.box([0, -0.27, -0.11], [1.28, 0.44, 0.035], hex("#455b63"));
  hatch.box([0, -0.73, -0.105], [0.34, 0.1, 0.035], hex("#9b8b72"));
  return hatch;
}

function buildCampingTrunkLid() {
  const lid = new MeshBuilder();
  lid.box([0, -0.43, 0], [1.52, 0.9, 0.18], hex("#252e35"), hex("#48555d"));
  lid.box([0, -0.28, -0.11], [1.28, 0.46, 0.035], hex("#36474d"));
  lid.box([0, -0.73, -0.105], [0.34, 0.1, 0.035], hex("#9b8b72"));
  return lid;
}

function buildCampingCharacter() {
  const person = new MeshBuilder();
  const jacket = hex("#343c36"), pants = hex("#34373d");
  const skin = hex("#bd896b"), hair = hex("#201e1b"), boots = hex("#171b1b");
  // Proporción humana estilizada coherente con la escala del habitáculo.
  person.box([-0.13, 0.52, 0], [0.22, 0.98, 0.25], pants);
  person.box([0.13, 0.52, 0], [0.22, 0.98, 0.25], pants);
  person.box([-0.13, 0.12, 0.15], [0.34, 0.2, 0.5], boots);
  person.box([0.13, 0.12, 0.15], [0.34, 0.2, 0.5], boots);
  person.box([0, 1.2, 0], [0.82, 0.86, 0.48], jacket, hex("#252e2b"));
  person.box([-0.43, 1.18, 0.02], [0.22, 0.72, 0.24], jacket);
  person.box([0.43, 1.18, 0.02], [0.22, 0.72, 0.24], jacket);
  person.box([0, 1.83, 0.02], [0.44, 0.49, 0.43], skin, hex("#a8765b"));
  person.box([0, 2.04, 0.01], [0.46, 0.19, 0.45], hair);
  person.box([-0.23, 1.91, 0.23], [0.08, 0.18, 0.06], hair);
  person.box([0.23, 1.91, 0.23], [0.08, 0.18, 0.06], hair);
  person.beam([-0.12, 1.84, 0.25], [-0.06, 1.84, 0.27], 0.025, hex("#25211d"));
  person.beam([0.06, 1.84, 0.27], [0.12, 1.84, 0.25], 0.025, hex("#25211d"));
  return person;
}

function buildCampingGear() {
  const gear = new MeshBuilder();
  // Bolsa de carpa plegada, con extremos, correas y costuras.
  gear.ellipsoid(-0.34, 0.73, 1.58, 0.36, 0.28, 0.42, hex("#526447"), 10, 6);
  gear.beam([-0.55, 0.92, 1.35], [-0.55, 0.92, 1.82], 0.055, hex("#c3a66c"));
  gear.beam([-0.12, 0.92, 1.35], [-0.12, 0.92, 1.82], 0.055, hex("#c3a66c"));
  gear.box([-0.34, 0.81, 1.99], [0.43, 0.12, 0.12], hex("#293c30"));
  // Caja de herramientas rígida, colocada junto a la bolsa dentro del baúl.
  gear.box([0.4, 0.64, 1.58], [0.55, 0.46, 0.58], hex("#4a5250"), hex("#282f31"));
  gear.box([0.4, 0.89, 1.58], [0.58, 0.09, 0.61], hex("#65736d"));
  gear.box([0.4, 0.99, 1.58], [0.24, 0.08, 0.17], hex("#202729"));
  gear.beam([0.18, 0.93, 1.58], [0.62, 0.93, 1.58], 0.055, hex("#262e2f"));
  return gear;
}
function buildHeadlights() {
  const lights = new MeshBuilder();
  const warm = hex("#ad9872");
  // Haces bajos y contenidos sobre el asfalto: no invaden la vista frontal del conductor.
  lights.triangle([-0.43, 0.18, -2.1], [-2.85, 0.14, -34], [-0.12, 0.14, -34], warm);
  lights.triangle([0.43, 0.18, -2.1], [0.12, 0.14, -34], [2.85, 0.14, -34], warm);
  return lights;
}

function buildRefuelHose() {
  const hose = new MeshBuilder();
  const rubber = hex("#171b1e");
  hose.beam([8.0, 1.95, -2.2], [7.0, 1.35, -1.7], 0.075, rubber);
  hose.beam([7.0, 1.35, -1.7], [4.6, 0.95, -0.9], 0.065, rubber);
  hose.beam([4.6, 0.95, -0.9], [1.02, 0.88, 0.78], 0.055, rubber);
  hose.box([1.02, 0.86, 0.78], [0.15, 0.28, 0.34], hex("#232a2f"));
  hose.beam([1.02, 0.98, 0.78], [0.91, 1.16, 0.62], 0.045, hex("#8b969b"));
  return hose;
}

function buildMoneyHandover() {
  const money = new MeshBuilder();
  const sleeve = hex("#222f3a");
  const skin = hex("#bd896b");
  const bill = hex("#4e9971");
  const billLight = hex("#8cc69a");
  money.beam([-1.15, -0.03, 0], [-0.18, 0.03, 0], 0.24, sleeve);
  money.box([0.04, 0.05, 0], [0.48, 0.22, 0.2], skin, hex("#9e7058"));
  money.box([0.63, 0.23, -0.02], [0.88, 0.48, 0.035], bill, hex("#347755"));
  money.box([0.63, 0.23, 0.012], [0.72, 0.34, 0.018], billLight);
  money.box([0.63, 0.23, 0.026], [0.16, 0.18, 0.012], hex("#3f855d"));
  money.beam([0.21, 0.13, -0.02], [0.34, 0.27, -0.02], 0.085, skin);
  money.beam([0.22, 0.09, 0.04], [0.46, 0.1, 0.04], 0.07, skin);
  return money;
}

function buildSteeringAssembly() {
  const steering = new MeshBuilder();
  const rim = hex("#090e12");
  const rimSeam = hex("#51595a");
  const spoke = hex("#151d22");
  const hub = hex("#30383b");
  const hubMetal = hex("#77756a");
  const sleeve = hex("#202b35");
  const sleeveLight = hex("#394753");
  const cuff = hex("#626f78");
  const skin = hex("#b78364");
  const skinLight = hex("#c99575");
  const skinMid = hex("#a87960");

  // Aro y radios del volante, con un perfil menos voluminoso.
  steering.torusXY(0, 1.03, -0.88, 0.48, 0.064, rim);
  steering.torusXY(0, 1.03, -0.88, 0.48, 0.014, rimSeam);
  steering.beam([0, 1.03, -0.87], [0, 0.67, -0.87], 0.085, spoke);
  steering.beam([0, 1.03, -0.87], [-0.34, 1.21, -0.87], 0.075, spoke);
  steering.beam([0, 1.03, -0.87], [0.34, 1.21, -0.87], 0.075, spoke);
  steering.box([0, 1.03, -0.83], [0.27, 0.23, 0.11], hub, hex("#161e22"));
  steering.box([0, 1.03, -0.755], [0.16, 0.13, 0.03], hubMetal);
  steering.box([0, 1.03, -0.733], [0.105, 0.085, 0.018], hub);

  for (const side of [-1, 1]) {
    const shoulder: V3 = [side * 1.42, 0.66, -1.12];
    const elbow: V3 = [side * 1.02, 0.86, -0.99];
    const wrist: V3 = [side * 0.66, 1.01, -0.86];

    steering.beam(shoulder, elbow, 0.35, sleeve);
    steering.beam(elbow, wrist, 0.285, sleeve);
    steering.ellipsoid(elbow[0], elbow[1], elbow[2], 0.17, 0.16, 0.15, sleeve, 8, 5);
    steering.beam([side * 1.24, 0.75, -1.075], [side * 0.91, 0.91, -0.965], 0.025, sleeveLight);
    steering.ellipsoid(side * 0.625, 1.005, -0.845, 0.145, 0.13, 0.12, cuff, 8, 5);
    steering.beam([side * 0.62, 1.005, -0.84], [side * 0.505, 1.035, -0.79], 0.155, skinMid);
    steering.ellipsoid(side * 0.405, 1.045, -0.79, 0.15, 0.12, 0.105, skin, 9, 6);
    steering.ellipsoid(side * 0.415, 1.066, -0.815, 0.105, 0.075, 0.07, skinLight, 8, 5);

    // Índice, medio, anular y meñique: tres falanges cortas y curvadas alrededor del aro.
    for (let finger = 0; finger < 4; finger++) {
      const baseY = 1.145 - finger * 0.06;
      const tipY = baseY - (finger === 3 ? 0.05 : 0.038);
      const base: V3 = [side * 0.475, baseY, -0.735];
      const knuckle: V3 = [side * 0.525, baseY - 0.012, -0.795];
      const joint: V3 = [side * 0.545, baseY - 0.022, -0.865];
      const tip: V3 = [side * 0.49, tipY, -0.925];
      steering.beam(base, knuckle, 0.052, skin);
      steering.ellipsoid(knuckle[0], knuckle[1], knuckle[2], 0.032, 0.031, 0.032, skinLight, 7, 4);
      steering.beam(knuckle, joint, 0.047, skinLight);
      steering.ellipsoid(joint[0], joint[1], joint[2], 0.028, 0.027, 0.028, skin, 7, 4);
      steering.beam(joint, tip, finger === 3 ? 0.038 : 0.041, skin);
      steering.ellipsoid(tip[0], tip[1], tip[2], 0.025, 0.021, 0.025, skinLight, 7, 4);
    }

    // Pulgar enfrentado, apoyado en el borde interior del volante.
    const thumbBase: V3 = [side * 0.32, 1.045, -0.755];
    const thumbJoint: V3 = [side * 0.34, 1.105, -0.82];
    const thumbTip: V3 = [side * 0.415, 1.085, -0.905];
    steering.beam(thumbBase, thumbJoint, 0.072, skin);
    steering.ellipsoid(thumbJoint[0], thumbJoint[1], thumbJoint[2], 0.039, 0.035, 0.034, skinLight, 7, 4);
    steering.beam(thumbJoint, thumbTip, 0.061, skinLight);
    steering.ellipsoid(thumbTip[0], thumbTip[1], thumbTip[2], 0.032, 0.027, 0.027, skin, 7, 4);
  }
  return steering;
}

function buildCockpit() {
  const cockpit = new MeshBuilder();
  const dashTop = hex("#252b2e");
  const dashFace = hex("#34383a");
  const dashShadow = hex("#151b20");
  const trim = hex("#64635b");
  const silver = hex("#879195");
  const silverDark = hex("#485258");
  const leather = hex("#292b2a");
  const glassBlue = hex("#49616a");
  const amber = hex("#d6a45e");
  const warmWhite = hex("#dfd1b2");
  const screenGreen = hex("#9fb49a");

  // Tablero ancho de dos niveles, pensado para enmarcar la vista en horizontal.
  cockpit.box([0, 0.77, -1.78], [3.68, 0.56, 1.28], dashFace, dashShadow);
  cockpit.box([0, 1.035, -1.93], [3.72, 0.19, 1.03], dashTop, hex("#353b3c"));
  cockpit.beam([-1.79, 1.105, -2.08], [1.79, 1.105, -2.08], 0.035, hex("#555b59"));
  cockpit.beam([-1.7, 0.99, -1.31], [1.7, 0.99, -1.31], 0.025, trim);
  cockpit.beam([-1.55, 0.58, -1.2], [1.55, 0.58, -1.2], 0.035, dashShadow);

  // Costura superior y pequeñas líneas de textura del tablero.
  for (let i = 0; i < 28; i++) {
    const x = -1.55 + i * 0.115;
    cockpit.beam([x, 1.126, -1.83], [x + 0.035, 1.126, -1.83], 0.012, hex("#77736a"));
  }

  // Consola central escalonada con radio, pantalla, mandos y climatizador.
  cockpit.box([0, 0.69, -1.045], [1.08, 0.83, 0.19], dashShadow, hex("#30383c"));
  cockpit.box([0, 0.91, -0.932], [0.86, 0.31, 0.055], hex("#10171b"));
  cockpit.box([0, 0.91, -0.895], [0.72, 0.205, 0.025], glassBlue);
  cockpit.box([0, 0.91, -0.877], [0.58, 0.025, 0.012], screenGreen);
  cockpit.box([-0.22, 0.965, -0.874], [0.035, 0.025, 0.012], amber);
  cockpit.box([0.22, 0.965, -0.874], [0.035, 0.025, 0.012], amber);

  // Rejillas de ventilación con láminas metálicas.
  for (const x of [-0.52, 0.52]) {
    cockpit.box([x, 1.015, -1.075], [0.32, 0.13, 0.055], dashShadow);
    for (let slat = 0; slat < 4; slat++) {
      const y = 0.975 + slat * 0.026;
      cockpit.beam([x - 0.12, y, -1.04], [x + 0.12, y, -1.04], 0.012, silver);
    }
    cockpit.box([x, 0.77, -0.92], [0.14, 0.045, 0.035], silverDark);
  }

  // Botonera y controles físicos, cada uno separado para dar volumen.
  cockpit.box([0, 0.68, -0.925], [0.79, 0.12, 0.045], hex("#20282c"));
  for (let i = 0; i < 5; i++) {
    const x = -0.29 + i * 0.145;
    cockpit.box([x, 0.68, -0.895], [0.075, 0.055, 0.025], i === 2 ? amber : silverDark);
  }
  for (const x of [-0.24, 0, 0.24]) {
    cockpit.torusXY(x, 0.47, -0.905, 0.075, 0.018, silverDark);
    cockpit.disc(x, 0.47, -0.89, 0.054, hex("#20292d"), 20);
    cockpit.beam([x, 0.47, -0.87], [x + 0.025, 0.515, -0.87], 0.018, warmWhite);
  }
  cockpit.box([0, 0.32, -0.98], [0.88, 0.09, 0.34], hex("#171e22"));
  cockpit.box([-0.35, 0.32, -0.79], [0.12, 0.06, 0.16], silverDark);
  cockpit.box([0.35, 0.32, -0.79], [0.12, 0.06, 0.16], silverDark);

  // Guantera del acompañante con tapa, bisagra y tirador.
  cockpit.box([1.12, 0.69, -1.12], [0.91, 0.36, 0.13], hex("#292f32"));
  cockpit.beam([0.7, 0.49, -1.04], [1.55, 0.49, -1.04], 0.024, dashShadow);
  cockpit.box([1.16, 0.77, -1.025], [0.22, 0.045, 0.035], silverDark);
  cockpit.box([1.16, 0.77, -1.002], [0.12, 0.018, 0.018], silver);

  // Panel bajo el volante y zona de encendido.
  cockpit.box([-1.08, 0.62, -0.99], [0.72, 0.35, 0.2], dashShadow);
  cockpit.box([-1.23, 0.73, -0.875], [0.18, 0.12, 0.035], hex("#11171b"));
  cockpit.torusXY(-0.86, 0.62, -0.865, 0.055, 0.014, silverDark);
  cockpit.box([-0.87, 0.62, -0.842], [0.07, 0.035, 0.018], hex("#8d9a9b"));

  // Instrumental doble: aros, escalas, agujas y testigos iluminados.
  cockpit.box([0, 1.105, -1.37], [1.86, 0.32, 0.26], dashShadow, hex("#242c30"));
  for (const x of [-0.72, 0.72]) {
    cockpit.disc(x, 0.95, -1.105, 0.235, hex("#0a1013"), 32);
    cockpit.torusXY(x, 0.95, -1.085, 0.205, 0.018, silverDark);
    cockpit.disc(x, 0.95, -1.07, 0.174, hex("#6b604d"), 32);
    cockpit.disc(x, 0.95, -1.055, 0.148, hex("#182127"), 32);
    for (let tick = 0; tick <= 12; tick++) {
      const angle = 0.2 + (tick / 12) * (Math.PI - 0.4);
      const outerX = x + Math.cos(angle) * 0.132;
      const outerY = 0.95 + Math.sin(angle) * 0.132;
      const innerX = x + Math.cos(angle) * 0.108;
      const innerY = 0.95 + Math.sin(angle) * 0.108;
      cockpit.beam([innerX, innerY, -1.035], [outerX, outerY, -1.035], 0.012, warmWhite);
    }
    cockpit.beam([x, 0.95, -1.025], [x + (x < 0 ? 0.075 : -0.085), 1.045, -1.02], 0.022, hex("#cf7756"));
    cockpit.disc(x, 0.95, -1.005, 0.027, silver, 12);
  }
  cockpit.box([0, 0.79, -1.105], [0.38, 0.12, 0.035], hex("#0c1317"));
  cockpit.box([-0.12, 0.79, -1.08], [0.035, 0.035, 0.015], amber);
  cockpit.box([0, 0.79, -1.08], [0.035, 0.035, 0.015], hex("#a94f42"));
  cockpit.box([0.12, 0.79, -1.08], [0.035, 0.035, 0.015], hex("#7b9b72"));
  addPixelText(cockpit, "064", 0, 1.0, -1.015, 0.027, hex("#dfc99b"));
  addPixelText(cockpit, "KM/H", 0, 0.81, -1.014, 0.014, hex("#a9b2a8"));

  // Puertas interiores anchas, apoyabrazos, manijas y controles de ventanilla.
  for (const side of [-1, 1]) {
    cockpit.box([side * 1.69, 0.62, -1.32], [0.27, 0.72, 2.38], hex("#20282c"), hex("#30383b"));
    cockpit.box([side * 1.64, 0.99, -1.42], [0.25, 0.13, 2.44], hex("#343b3e"));
    cockpit.beam([side * 1.53, 0.78, -2.35], [side * 1.53, 0.78, -0.34], 0.035, hex("#596267"));
    cockpit.box([side * 1.48, 0.69, -0.91], [0.38, 0.16, 0.82], hex("#3a4245"));
    cockpit.beam([side * 1.42, 0.77, -1.1], [side * 1.25, 0.86, -1.1], 0.055, silver);
    cockpit.box([side * 1.43, 0.88, -0.64], [0.25, 0.055, 0.25], dashShadow);
    cockpit.box([side * 1.43, 0.92, -0.64], [0.11, 0.025, 0.09], silverDark);
    cockpit.box([side * 1.51, 0.55, -1.72], [0.13, 0.31, 0.13], dashShadow);
    cockpit.beam([side * 1.52, 0.96, -2.48], [side * 1.68, 1.7, -3.35], 0.09, hex("#1b2429"));
    cockpit.beam([side * 1.68, 1.7, -3.35], [side * 1.73, 1.78, -4.15], 0.09, hex("#293337"));
    cockpit.box([side * 1.92, 1.38, -2.53], [0.12, 0.3, 0.46], dashShadow);
    cockpit.box([side * 1.99, 1.38, -2.53], [0.035, 0.22, 0.36], glassBlue);
    cockpit.beam([side * 1.95, 1.19, -2.53], [side * 1.95, 1.57, -2.53], 0.025, silverDark);
  }

  // Techo interior continuo: cierra el claro entre los paneles delanteros y traseros sin bajar la altura.
  cockpit.box([0, 2.57, -0.95], [3.62, 0.13, 7.5], hex("#303a40"), hex("#202930"));
  // Asiento trasero, respaldo, apoyacabezas y bandeja posterior.
  cockpit.box([0, 0.56, 2.05], [2.95, 0.28, 1.45], leather, hex("#1d2428"));
  cockpit.box([0, 1.12, 2.63], [2.95, 1.0, 0.34], leather, hex("#343638"));
  for (const x of [-0.88, 0, 0.88]) {
    cockpit.box([x, 1.72, 2.55], [0.48, 0.48, 0.26], hex("#252c30"));
  }
  cockpit.box([0, 1.13, 3.18], [3.18, 0.12, 0.62], dashShadow);
  // Paneles de puertas traseras y pilares C.
  for (const side of [-1, 1]) {
    cockpit.box([side * 1.69, 0.62, 1.34], [0.27, 0.72, 2.52], hex("#20282c"), hex("#30383b"));
    cockpit.box([side * 1.64, 0.99, 1.34], [0.25, 0.13, 2.54], hex("#343b3e"));
    cockpit.beam([side * 1.73, 1.78, -0.15], [side * 1.73, 2.23, -0.2], 0.11, hex("#1b2429"));
    cockpit.beam([side * 1.52, 0.96, 2.05], [side * 1.74, 2.22, 2.75], 0.13, hex("#1b2429"));
  }
  cockpit.beam([-1.74, 2.48, 2.75], [1.74, 2.48, 2.75], 0.13, hex("#182128"));
  cockpit.beam([-1.68, 2.48, -4.56], [1.68, 2.48, -4.56], 0.11, hex("#182128"));
  for (const side of [-1, 1]) {
    cockpit.box([side * 0.94, 2.44, -2.75], [0.72, 0.11, 0.48], hex("#3b454b"));
    cockpit.box([side * 0.94, 2.37, -2.52], [0.08, 0.08, 0.08], silverDark);
  }
  cockpit.box([0, 2.43, -3.02], [0.3, 0.07, 0.42], hex("#8a8170"));
  cockpit.box([0, 2.38, -3.02], [0.16, 0.045, 0.28], warmWhite);
  cockpit.beam([0, 2.27, -4.12], [0, 2.14, -4.4], 0.055, silverDark);
  cockpit.box([0, 2.11, -4.42], [0.68, 0.18, 0.1], hex("#30383c"));
  cockpit.box([0, 2.11, -4.35], [0.55, 0.13, 0.035], glassBlue);

  // Marcos completos de las ventanillas laterales: ahora se distinguen al mirar a izquierda y derecha.
  for (const side of [-1, 1]) {
    const frameX = side * 1.76;
    cockpit.beam([frameX, 1.18, -2.12], [frameX, 1.18, 2.72], 0.09, hex("#151e25"));
    cockpit.beam([frameX, 2.19, -4.35], [frameX, 2.19, 2.72], 0.105, hex("#151e25"));
    cockpit.beam([frameX, 1.18, -0.08], [frameX, 2.47, -0.08], 0.13, hex("#151e25"));
    cockpit.beam([frameX, 1.18, 2.58], [frameX, 2.47, 2.58], 0.13, hex("#151e25"));
    // Espejo lateral con carcasa y superficie reflectante.
    cockpit.beam([side * 1.68, 1.48, -2.35], [side * 2.02, 1.54, -2.5], 0.085, hex("#1b252c"));
    cockpit.box([side * 2.08, 1.57, -2.52], [0.16, 0.25, 0.42], hex("#202b33"));
    cockpit.box([side * 2.17, 1.58, -2.52], [0.025, 0.17, 0.31], hex("#6e858c"));
  }

  // Capó corto y nervaduras delanteras, como referencia visual del propio vehículo.
  cockpit.box([0, 0.55, -5.08], [3.02, 0.13, 1.62], hex("#202a31"), hex("#111a21"));
  cockpit.beam([-1.18, 0.64, -4.58], [-1.1, 0.64, -5.75], 0.045, hex("#46525a"));
  cockpit.beam([1.18, 0.64, -4.58], [1.1, 0.64, -5.75], 0.045, hex("#46525a"));
  cockpit.beam([-1.12, 0.61, -5.78], [1.12, 0.61, -5.78], 0.06, hex("#38454d"));

  // Marco del parabrisas con sellos de goma y limpiaparabrisas en la base.
  cockpit.beam([-1.62, 0.92, -2.15], [-1.78, 2.25, -4.65], 0.18, hex("#11181d"));
  cockpit.beam([1.62, 0.92, -2.15], [1.78, 2.25, -4.65], 0.18, hex("#11181d"));
  cockpit.beam([-1.78, 2.25, -4.65], [1.78, 2.25, -4.65], 0.17, hex("#11181d"));
  cockpit.beam([-1.62, 0.94, -2.15], [1.62, 0.94, -2.15], 0.13, hex("#1a2126"));
  cockpit.beam([-1.58, 1.04, -2.25], [-1.74, 1.62, -3.34], 0.055, hex("#59636a"));
  cockpit.beam([1.58, 1.04, -2.25], [1.74, 1.62, -3.34], 0.055, hex("#59636a"));
  cockpit.beam([-1.38, 0.965, -2.19], [-0.27, 0.965, -2.19], 0.032, hex("#090e12"));
  cockpit.beam([0.27, 0.965, -2.19], [1.38, 0.965, -2.19], 0.032, hex("#090e12"));

  return cockpit;
}
function buildWindshield() {
  const glass = new MeshBuilder();
  glass.quad(
    [-1.62, 0.98, -2.18],
    [1.62, 0.98, -2.18],
    [1.75, 2.2, -4.58],
    [-1.75, 2.2, -4.58],
    hex("#8ca6aa"),
  );
  // Reflejos fríos muy tenues sobre el cristal.
  glass.quad(
    [-1.48, 1.72, -3.58],
    [-1.37, 1.76, -3.66],
    [-0.84, 2.04, -4.28],
    [-0.97, 2.02, -4.22],
    hex("#c0b9a0"),
  );
  glass.quad(
    [1.42, 1.78, -3.7],
    [1.49, 1.82, -3.8],
    [1.12, 2.04, -4.27],
    [1.04, 2.01, -4.19],
    hex("#879b9d"),
  );
  // Ventanillas delanteras, traseras y luneta: vidrio tenue para conservar el exterior visible.
  glass.quad([-1.76, 1.2, -2.18], [-1.76, 2.12, -2.18], [-1.76, 2.12, -0.08], [-1.76, 1.2, -0.08], hex("#81999e"));
  glass.quad([1.76, 1.2, -2.18], [1.76, 1.2, -0.08], [1.76, 2.12, -0.08], [1.76, 2.12, -2.18], hex("#81999e"));
  glass.quad([-1.76, 1.2, -0.08], [-1.76, 2.12, -0.08], [-1.76, 2.12, 2.55], [-1.76, 1.2, 2.55], hex("#81999e"));
  glass.quad([1.76, 1.2, -0.08], [1.76, 1.2, 2.55], [1.76, 2.12, 2.55], [1.76, 2.12, -0.08], hex("#81999e"));
  glass.quad([-1.62, 1.15, 2.78], [1.62, 1.15, 2.78], [1.58, 2.12, 2.78], [-1.58, 2.12, 2.78], hex("#81999e"));
  return glass;
}

function buildWindshieldCracks() {
  const cracks = new MeshBuilder();
  const bright = hex("#d8e0dc");
  const shadow = hex("#91a5aa");
  const centerX = 0.04;
  const centerY = 1.56;
  const glassPoint = (x: number, y: number): V3 => [
    x,
    y,
    -2.18 - ((y - 0.98) / 1.22) * 2.4 + 0.035,
  ];
  const origin = glassPoint(centerX, centerY);
  const rays = [
    [-0.16, 0.99, 0.48], [0.72, 0.69, 0.55], [0.99, 0.12, 0.44],
    [0.78, -0.63, 0.5], [0.16, -0.99, 0.4], [-0.7, -0.72, 0.49],
    [-0.99, -0.08, 0.46], [-0.78, 0.62, 0.52], [0.42, 0.91, 0.38],
    [-0.43, -0.9, 0.36],
  ];
  for (let i = 0; i < rays.length; i++) {
    const [dx, dy, length] = rays[i]!;
    const endX = centerX + dx * length;
    const endY = centerY + dy * length;
    const kinkX = centerX + dx * length * 0.54 + (i % 2 ? 0.035 : -0.028);
    const kinkY = centerY + dy * length * 0.54 + (i % 3 ? 0.025 : -0.02);
    const kink = glassPoint(kinkX, kinkY);
    const end = glassPoint(endX, endY);
    cracks.beam(origin, kink, 0.014, bright);
    cracks.beam(kink, end, 0.01, i % 2 ? bright : shadow);
    if (i % 2 === 0) {
      const branchStart = glassPoint(centerX + dx * length * 0.42, centerY + dy * length * 0.42);
      const branchEnd = glassPoint(
        centerX + dx * length * 0.35 - dy * 0.12,
        centerY + dy * length * 0.35 + dx * 0.12,
      );
      cracks.beam(branchStart, branchEnd, 0.008, shadow);
    }
  }
  // Dos microfisuras que salen del punto de impacto, sin cubrir la visión frontal.
  cracks.beam(origin, glassPoint(centerX + 0.19, centerY + 0.17), 0.018, bright);
  cracks.beam(origin, glassPoint(centerX - 0.2, centerY - 0.14), 0.016, shadow);
  return cracks;
}

function makeShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("No se pudo crear el shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "Error de compilación gráfica";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

const VERTEX_SHADER = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec3 aColor;
uniform mat4 uViewProjection;
uniform mat4 uView;
uniform mat4 uModel;
uniform float uWaterMode;
uniform float uTime;
varying vec3 vColor;
varying vec3 vNormal;
varying float vDepth;
varying float vWater;
varying vec3 vWorldPosition;
void main() {
  vec3 animatedPosition = aPosition;
  float wave = sin(aPosition.x * 0.19 + uTime * 1.15) * 0.045
    + sin(aPosition.z * 0.15 - uTime * 0.82) * 0.035
    + sin((aPosition.x + aPosition.z) * 0.095 + uTime * 0.62) * 0.022;
  animatedPosition.y += wave * uWaterMode;
  vec4 world = uModel * vec4(animatedPosition, 1.0);
  vec4 viewPosition = uView * world;
  vDepth = length(viewPosition.xyz);
  vNormal = mat3(uModel) * aNormal;
  vWorldPosition = world.xyz;
  vColor = aColor;
  vWater = uWaterMode;
  gl_Position = uViewProjection * world;
}
`;

const FRAGMENT_SHADER = `
precision mediump float;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uFogColor;
uniform vec3 uHeadlightPosition;
uniform float uOpacity;
varying vec3 vColor;
varying vec3 vNormal;
varying float vDepth;
varying float vWater;
varying vec3 vWorldPosition;
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
void main() {
  vec3 n = normalize(vNormal);
  vec3 sunsetSun = normalize(vec3(-0.38, 0.52, 0.74));
  float diffuse = max(dot(n, sunsetSun), 0.0);
  float ambient = 0.49 + max(n.y, 0.0) * 0.13;
  float light = ambient + diffuse * 0.31 + floor(diffuse * 4.0) * 0.025;

  // Haz cálido de los faros: ilumina el asfalto, la vegetación cercana y los bordes del camino.
  vec3 fromHeadlight = vWorldPosition - uHeadlightPosition;
  float ahead = max(0.0, -fromHeadlight.z);
  float beamWidth = 0.58 + ahead * 0.12;
  float beamSide = 1.0 - smoothstep(beamWidth * 0.64, beamWidth, abs(fromHeadlight.x));
  float beamDistance = 1.0 - smoothstep(4.0, 41.0, ahead);
  float beamHeight = 1.0 - smoothstep(0.65, 4.9, fromHeadlight.y);
  float headlight = beamSide * beamDistance * beamHeight * smoothstep(0.0, 3.0, ahead);
  light += headlight * 0.92;

  vec3 color = vColor * light * vec3(1.08, 0.95, 0.86);
  color += vec3(1.0, 0.78, 0.52) * headlight * 0.30;
  float emissive = smoothstep(0.70, 0.96, max(max(vColor.r, vColor.g), vColor.b));
  color += vColor * emissive * 0.28;
  vec3 highlights = max(color - vec3(0.52, 0.56, 0.62), vec3(0.0));
  color += highlights * 0.18;
  float waterRipple = sin(vWorldPosition.x * 0.31 + uTime * 1.25)
    * sin(vWorldPosition.z * 0.27 - uTime * 0.9);
  float waterGlint = pow(max(0.0, waterRipple), 8.0) * 0.24;
  vec3 waterColor = color * vec3(0.78, 1.08, 1.18)
    + vec3(0.018, 0.075, 0.092) * (0.55 + waterRipple * 0.45);
  color = mix(color, waterColor, vWater);
  color += vec3(0.34, 0.48, 0.48) * waterGlint * vWater;
  float fog = smoothstep(58.0, 238.0, vDepth);
  color = mix(color, uFogColor, fog);
  float scan = 1.0 - 0.022 * (0.5 + 0.5 * sin(gl_FragCoord.y * 3.14159));
  float grain = (hash(floor(gl_FragCoord.xy * 0.72) + floor(uTime * 8.0)) - 0.5) * 0.022;
  float tearSeed = hash(vec2(floor(uTime * 0.82), 19.0));
  float tear = step(0.992, tearSeed) * step(0.0, 2.0 - abs(gl_FragCoord.y - mod(uTime * 53.0, max(uResolution.y, 1.0))));
  color = color * scan + grain + tear * 0.035;
  vec2 uv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
  float vignette = 1.0 - smoothstep(0.2, 0.94, length((uv - 0.5) * vec2(1.0, 0.82)));
  color *= mix(0.72, 1.0, vignette);
  color += vec3(0.003, 0.006, 0.014);
  gl_FragColor = vec4(color, uOpacity);
}
`;

function perspective(fov: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ]);
}

function lookAt(eye: V3, target: V3, up: V3) {
  const z = norm(sub(eye, target));
  const x = norm(cross(up, z));
  const y = cross(z, x);
  return new Float32Array([
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -dot(x, eye), -dot(y, eye), -dot(z, eye), 1,
  ]);
}

function multiply(a: Float32Array, b: Float32Array) {
  const out = new Float32Array(16);
  for (let column = 0; column < 4; column++) {
    for (let row = 0; row < 4; row++) {
      out[column * 4 + row] =
        a[row]! * b[column * 4]! +
        a[4 + row]! * b[column * 4 + 1]! +
        a[8 + row]! * b[column * 4 + 2]! +
        a[12 + row]! * b[column * 4 + 3]!;
    }
  }
  return out;
}

function projectToViewport(point: V3, viewProjection: Float32Array, width: number, height: number) {
  const clipX = viewProjection[0]! * point[0] + viewProjection[4]! * point[1] + viewProjection[8]! * point[2] + viewProjection[12]!;
  const clipY = viewProjection[1]! * point[0] + viewProjection[5]! * point[1] + viewProjection[9]! * point[2] + viewProjection[13]!;
  const clipW = viewProjection[3]! * point[0] + viewProjection[7]! * point[1] + viewProjection[11]! * point[2] + viewProjection[15]!;
  if (clipW <= 0.001) return null;
  const ndcX = clipX / clipW;
  const ndcY = clipY / clipW;
  if (Math.abs(ndcX) > 1.5 || Math.abs(ndcY) > 1.5) return null;
  return {
    x: (ndcX * 0.5 + 0.5) * width,
    y: (1 - (ndcY * 0.5 + 0.5)) * height,
  };
}

function translation(x: number, y: number, z: number) {
  const matrix = new Float32Array(16);
  matrix[0] = 1; matrix[5] = 1; matrix[10] = 1; matrix[15] = 1;
  matrix[12] = x; matrix[13] = y; matrix[14] = z;
  return matrix;
}

function rotationY(angle: number) {
  const matrix = new Float32Array(16);
  const cosine = Math.cos(angle), sine = Math.sin(angle);
  matrix[0]=cosine;matrix[2]=-sine;matrix[5]=1;matrix[8]=sine;matrix[10]=cosine;matrix[15]=1;
  return matrix;
}
function rotationX(angle:number){const m=new Float32Array(16),c=Math.cos(angle),q=Math.sin(angle);m[0]=1;m[5]=c;m[6]=q;m[9]=-q;m[10]=c;m[15]=1;return m;}
function rotationZ(angle:number){const m=new Float32Array(16),c=Math.cos(angle),q=Math.sin(angle);m[0]=c;m[1]=q;m[4]=-q;m[5]=c;m[10]=1;m[15]=1;return m;}
function scaling(x:number,y:number,z:number){
  const matrix=new Float32Array(16);
  matrix[0]=x;matrix[5]=y;matrix[10]=z;matrix[15]=1;
  return matrix;
}

function createMesh(gl: WebGLRenderingContext, builder: MeshBuilder): Mesh {
  const data = builder.data();
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("No se pudo reservar la geometría 3D");
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return { buffer, count: data.length / 9 };
}

function bindMesh(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  mesh: Mesh,
  viewProjection: Float32Array,
  view: Float32Array,
  model: Float32Array,
  opacity = 1,
  waterMode = false,
) {
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
  const stride = 9 * Float32Array.BYTES_PER_ELEMENT;
  const position = gl.getAttribLocation(program, "aPosition");
  const normal = gl.getAttribLocation(program, "aNormal");
  const color = gl.getAttribLocation(program, "aColor");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 3, gl.FLOAT, false, stride, 0);
  gl.enableVertexAttribArray(normal);
  gl.vertexAttribPointer(normal, 3, gl.FLOAT, false, stride, 3 * Float32Array.BYTES_PER_ELEMENT);
  gl.enableVertexAttribArray(color);
  gl.vertexAttribPointer(color, 3, gl.FLOAT, false, stride, 6 * Float32Array.BYTES_PER_ELEMENT);
  gl.uniformMatrix4fv(gl.getUniformLocation(program, "uViewProjection"), false, viewProjection);
  gl.uniformMatrix4fv(gl.getUniformLocation(program, "uView"), false, view);
  gl.uniformMatrix4fv(gl.getUniformLocation(program, "uModel"), false, model);
  gl.uniform1f(gl.getUniformLocation(program, "uOpacity"), opacity);
  gl.uniform1f(gl.getUniformLocation(program, "uWaterMode"), waterMode ? 1 : 0);
  gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
}


type EngineAudio = {
  context: AudioContext; oscillator: OscillatorNode; secondOscillator: OscillatorNode;
  filter: BiquadFilterNode; gain: GainNode;
  roadNoise: AudioBufferSourceNode; roadFilter: BiquadFilterNode; roadGain: GainNode;
  setThrottle: (value: number) => void; setRoadSpeed: (value: number) => void;
  stop: () => void; destroy: () => void;
};
function playNpcImpactSequence(context: AudioContext) {
  if (context.state === "suspended") void context.resume();
  const now = context.currentTime;

  // Golpe seco con un pequeño crujido de vidrio.
  const noiseBuffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.24), context.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) {
    const fade = 1 - i / noiseData.length;
    noiseData[i] = (Math.random() * 2 - 1) * fade;
  }
  const impactNoise = context.createBufferSource();
  impactNoise.buffer = noiseBuffer;
  const impactFilter = context.createBiquadFilter();
  impactFilter.type = "bandpass";
  impactFilter.frequency.setValueAtTime(760, now);
  impactFilter.Q.value = 0.72;
  const impactGain = context.createGain();
  impactGain.gain.setValueAtTime(0.0001, now);
  impactGain.gain.exponentialRampToValueAtTime(0.2, now + 0.012);
  impactGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.23);
  impactNoise.connect(impactFilter);
  impactFilter.connect(impactGain);
  impactGain.connect(context.destination);
  impactNoise.onended = () => {
    impactNoise.disconnect();
    impactFilter.disconnect();
    impactGain.disconnect();
  };
  impactNoise.start(now);

  const thump = context.createOscillator();
  const thumpGain = context.createGain();
  thump.type = "sine";
  thump.frequency.setValueAtTime(112, now);
  thump.frequency.exponentialRampToValueAtTime(43, now + 0.2);
  thumpGain.gain.setValueAtTime(0.0001, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.22, now + 0.008);
  thumpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
  thump.connect(thumpGain);
  thumpGain.connect(context.destination);
  thump.onended = () => {
    thump.disconnect();
    thumpGain.disconnect();
  };
  thump.start(now);
  thump.stop(now + 0.25);

  // Quejido breve sintetizado con armónicos y formantes para sugerir una exclamación de dolor.
  const cry = context.createOscillator();
  const cryFormant = context.createBiquadFilter();
  const cryGain = context.createGain();
  cry.type = "sawtooth";
  cry.frequency.setValueAtTime(196, now + 0.035);
  cry.frequency.exponentialRampToValueAtTime(142, now + 0.25);
  cry.frequency.exponentialRampToValueAtTime(118, now + 0.48);
  cryFormant.type = "bandpass";
  cryFormant.frequency.setValueAtTime(690, now + 0.035);
  cryFormant.frequency.exponentialRampToValueAtTime(505, now + 0.45);
  cryFormant.Q.value = 1.15;
  cryGain.gain.setValueAtTime(0.0001, now + 0.035);
  cryGain.gain.exponentialRampToValueAtTime(0.075, now + 0.085);
  cryGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.56);
  cry.connect(cryFormant);
  cryFormant.connect(cryGain);
  cryGain.connect(context.destination);
  cry.onended = () => {
    cry.disconnect();
    cryFormant.disconnect();
    cryGain.disconnect();
  };
  cry.start(now + 0.035);
  cry.stop(now + 0.58);

  const cryHarmonic = context.createOscillator();
  const harmonicFilter = context.createBiquadFilter();
  const harmonicGain = context.createGain();
  cryHarmonic.type = "triangle";
  cryHarmonic.frequency.setValueAtTime(392, now + 0.035);
  cryHarmonic.frequency.exponentialRampToValueAtTime(236, now + 0.49);
  harmonicFilter.type = "bandpass";
  harmonicFilter.frequency.value = 1180;
  harmonicFilter.Q.value = 1.35;
  harmonicGain.gain.setValueAtTime(0.0001, now + 0.035);
  harmonicGain.gain.exponentialRampToValueAtTime(0.018, now + 0.09);
  harmonicGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
  cryHarmonic.connect(harmonicFilter);
  harmonicFilter.connect(harmonicGain);
  harmonicGain.connect(context.destination);
  cryHarmonic.onended = () => {
    cryHarmonic.disconnect();
    harmonicFilter.disconnect();
    harmonicGain.disconnect();
  };
  cryHarmonic.start(now + 0.035);
  cryHarmonic.stop(now + 0.5);
}

function createCampingAmbientAudio() {
  const context = new window.AudioContext();
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const slow = 0.55 + 0.45 * Math.sin(i / context.sampleRate * 2.1);
    data[i] = (Math.random() * 2 - 1) * slow * 0.28;
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 620;
  const gain = context.createGain();
  gain.gain.value = 0.022;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start();
  void context.resume();
  return () => {
    const now = context.currentTime;
    gain.gain.setTargetAtTime(0, now, 0.18);
    try { source.stop(now + 0.55); } catch { /* El ambiente ya se detuvo */ }
    source.onended = () => { void context.close(); };
  };
}

function createEngineAudio(): EngineAudio {
  const context = new window.AudioContext();
  const filter = context.createBiquadFilter();
  filter.type = "lowpass"; filter.frequency.value = 185; filter.Q.value = 0.7;
  const gain = context.createGain(); gain.gain.value = 0;
  filter.connect(gain); gain.connect(context.destination);
  const oscillator = context.createOscillator();
  oscillator.type = "sawtooth"; oscillator.frequency.value = 52;
  oscillator.connect(filter); oscillator.start();
  const secondOscillator = context.createOscillator();
  secondOscillator.type = "triangle"; secondOscillator.frequency.value = 34;
  const secondGain = context.createGain(); secondGain.gain.value = 0.24;
  secondOscillator.connect(secondGain); secondGain.connect(filter); secondOscillator.start();
  const roadFilter = context.createBiquadFilter();
  roadFilter.type = "lowpass";
  roadFilter.frequency.value = 280;
  const roadGain = context.createGain();
  roadGain.gain.value = 0;
  roadFilter.connect(roadGain);
  roadGain.connect(context.destination);
  const noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const noiseData = noiseBuffer.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) noiseData[i] = (Math.random() * 2 - 1) * 0.22;
  const roadNoise = context.createBufferSource();
  roadNoise.buffer = noiseBuffer;
  roadNoise.loop = true;
  roadNoise.connect(roadFilter);
  roadNoise.start();
  return {
    context, oscillator, secondOscillator, filter, gain, roadNoise, roadFilter, roadGain,
    setThrottle(value: number) {
      const amount = clamp(value, 0, 1), now = context.currentTime;
      oscillator.frequency.setTargetAtTime(48 + amount * 74, now, 0.09);
      secondOscillator.frequency.setTargetAtTime(31 + amount * 25, now, 0.12);
      filter.frequency.setTargetAtTime(150 + amount * 620, now, 0.14);
      gain.gain.setTargetAtTime(amount > 0 ? 0.035 + amount * 0.055 : 0, now, 0.18);
    },
    setRoadSpeed(value: number) {
      const amount = clamp(value, 0, 1), now = context.currentTime;
      roadFilter.frequency.setTargetAtTime(220 + amount * 680, now, 0.2);
      roadGain.gain.setTargetAtTime(amount > 0.025 ? 0.003 + amount * 0.014 : 0, now, 0.24);
    },
    stop() {
      const now = context.currentTime;
      gain.gain.setTargetAtTime(0, now, 0.24);
      roadGain.gain.setTargetAtTime(0, now, 0.24);
    },
    destroy() {
      try { oscillator.stop(); } catch { /* Ya detenido */ }
      try { secondOscillator.stop(); } catch { /* Ya detenido */ }
      try { roadNoise.stop(); } catch { /* Ya detenido */ }
      void context.close();
    },
  };
}

export function Route40LowPolyOpening() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const npcDialogueRef = useRef<HTMLDivElement | null>(null);
  const npcDialogueTextRef = useRef<HTMLSpanElement | null>(null);
  const locationRef = useRef<HTMLDivElement | null>(null);
  const driverReactionRef = useRef<HTMLDivElement | null>(null);
  const timeJumpRef = useRef<HTMLDivElement | null>(null);
  const gameHudRef = useRef<HTMLDivElement | null>(null);
  const starIndicatorRef = useRef<HTMLDivElement | null>(null);
  const campEndingRef = useRef<HTMLDivElement | null>(null);
  const campEndingShadeRef = useRef<HTMLDivElement | null>(null);
  const campEndingTextRef = useRef<HTMLParagraphElement | null>(null);
  const interactionActionRef = useRef<(() => void) | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const speedRef = useRef<HTMLSpanElement | null>(null);
  const mouseSensitivityRef = useRef(0.00235);
  const [mouseSensitivity, setMouseSensitivity] = useState(0.00235);
  const keysRef = useRef<Set<string>>(new Set());
  const stageRef = useRef<"driving" | "climbing" | "signalEncounter" | "signalAim" | "escape" | "finished" | "crashed" | "campApproach" | "campStopped" | "exiting" | "walkingToTrunk" | "trunkPrompt" | "trunkOpening" | "ending">("driving");
  const engineAudioRef = useRef<EngineAudio | null>(null);
  const [interactionStage, setInteractionStage] = useState<"driving" | "climbing" | "signalEncounter" | "signalAim" | "escape" | "finished" | "crashed" | "campApproach" | "campStopped" | "exiting" | "walkingToTrunk" | "trunkPrompt" | "trunkOpening" | "ending">("driving");
  const [fallback, setFallback] = useState(false);
  const setStage = (next: "driving" | "climbing" | "signalEncounter" | "signalAim" | "escape" | "finished" | "crashed" | "campApproach" | "campStopped" | "exiting" | "walkingToTrunk" | "trunkPrompt" | "trunkOpening" | "ending") => {
    stageRef.current = next;
    setInteractionStage(next);
  };
  const startEngineAudio = () => {
    try {
      if (!engineAudioRef.current) engineAudioRef.current = createEngineAudio();
      void engineAudioRef.current.context.resume();
      engineAudioRef.current.setThrottle(0.32);
    } catch (error) {
      console.warn("El sonido del motor no está disponible en este navegador", error);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: true,
      powerPreference: "low-power",
      preserveDrawingBuffer: false,
    });
    if (!canvas || !gl) {
      setFallback(true);
      return;
    }

    let active = true;
    let frame = 0;
    let startedAt = 0;
    let started = false;
    let previousFrame = 0;
    let driveElapsed = 0;
    let climbElapsed = 0;
    let travelled = 0;
    let campDistance = 0, campSpeed = 6.8, campLaneOffset = 0;
    let exitStartedAt = 0, walkStartedAt = 0, trunkStartedAt = 0, endingStartedAt = 0;
    let campAmbientStop: (() => void) | null = null;
    let signalEncounterStartedAt=0,signalAimStartedAt=0,escapeStartedAt=0,npcImpactAt=0;
    let npcImpactX=0,npcImpactZ=THREAT_Z;
    let impactEffectsPlayed=false;
    // La cinemática entrega el vehículo ya rodando; no necesita que el jugador lo arranque desde cero.
    let driveSpeed = 4.15;
    let laneOffset = 0;
    let steeringAngle = 0;
    let steeringTarget = 0;
    let lookYaw = 0;
    let lookPitch = 0;
    let crashStartedAt = 0;
    let crashExplosionMesh: Mesh | null = null;
    const keys = keysRef.current;
    keys.clear();
    stageRef.current = "driving";
    setInteractionStage("driving");
    interactionActionRef.current = () => {
      if (stageRef.current === "campStopped") {
        if (document.pointerLockElement === canvas) document.exitPointerLock();
        keys.clear();
        exitStartedAt = performance.now();
        setStage("exiting");
      } else if (stageRef.current === "trunkPrompt") {
        keys.clear();
        trunkStartedAt = performance.now();
        setStage("trunkOpening");
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (key === "e" || key === "enter") {
        interactionActionRef.current?.();
        return;
      }
      if (["w", "a", "s", "d", "arrowleft", "arrowright", "arrowup", "arrowdown", "q"].includes(key)) {
        if (key.startsWith("arrow")) event.preventDefault();
        keys.add(key);
      }
      if (key === "w" && (stageRef.current === "driving" || stageRef.current === "climbing" || stageRef.current === "campApproach") &&
        (stageRef.current !== "driving" || performance.now() - startedAt >= DURATION * 1000)) startEngineAudio();
    };
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
    const onBlur = () => keys.clear();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    let dragging = false;
    let pointerX = 0;
    let pointerY = 0;
    let pointerLocked = false;
    let pointerLockFallback = false;
    let lookYawTarget = 0;
    let lookPitchTarget = 0;
    const onPointerLockChange = () => {
      pointerLocked = document.pointerLockElement === canvas;
      if (pointerLocked) dragging = false;
      canvas.style.cursor = pointerLocked ? "none" : "crosshair";
    };
    const onPointerLockError = () => { pointerLockFallback = true; };
    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (event.pointerType === "mouse") {
        if ((stageRef.current === "driving" && performance.now() - startedAt >= DURATION * 1000) || stageRef.current === "climbing" || stageRef.current === "escape" || stageRef.current === "campApproach") {
          startEngineAudio();
          const requestLock = (canvas as HTMLCanvasElement & { requestPointerLock?: () => void | Promise<void> }).requestPointerLock;
          if (requestLock) {
            try {
              const result = requestLock.call(canvas);
              if (result && typeof (result as Promise<void>).catch === "function") {
                void (result as Promise<void>).catch(() => { pointerLockFallback = true; });
              }
            } catch {
              pointerLockFallback = true;
            }
          } else {
            pointerLockFallback = true;
          }
        }
      } else {
        try { canvas.setPointerCapture(event.pointerId); } catch { /* Captura táctil opcional */ }
      }
    };
    const onPointerMove = (event: PointerEvent) => {
      let dx = 0, dy = 0;
      if (document.pointerLockElement === canvas && event.pointerType === "mouse") {
        dx = event.movementX;
        dy = event.movementY;
      } else if (dragging && (event.pointerType !== "mouse" || pointerLockFallback)) {
        dx = event.clientX - pointerX;
        dy = event.clientY - pointerY;
        pointerX = event.clientX;
        pointerY = event.clientY;
      } else {
        return;
      }
      lookYawTarget += dx * mouseSensitivityRef.current;
      lookPitchTarget = clamp(lookPitchTarget - dy * 0.0021, -0.48, 0.48);
    };
    const onPointerUp = () => { dragging = false; };
    canvas.style.touchAction = "none";
    canvas.style.cursor = "crosshair";
    document.addEventListener("pointerlockchange", onPointerLockChange);
    document.addEventListener("pointerlockerror", onPointerLockError);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    let worldMesh: Mesh | null = null;
    let campingWorldMesh: Mesh | null = null;
    let campingWaterMesh: Mesh | null = null;
    let campingBridgeMesh: Mesh | null = null;
    let campingGateLeafMesh: Mesh | null = null;
    let campingCarExteriorMesh: Mesh | null = null;
    let campingDoorMesh: Mesh | null = null;
    let campingTrunkClosedMesh: Mesh | null = null;
    let campingTrunkLidMesh: Mesh | null = null;
    let campingCharacterMesh: Mesh | null = null;
    let campingGearMesh: Mesh | null = null;
    let destinationSignMesh: Mesh | null = null;
    let skyMesh: Mesh | null = null;
    let carMesh: Mesh | null = null;
    let lightMesh: Mesh | null = null;
    let cockpitMesh: Mesh | null = null;
    let steeringAssemblyMesh: Mesh | null = null;
    let windshieldMesh: Mesh | null = null;
    let windshieldCracksMesh: Mesh | null = null;
    let pathActors: Array<{mesh:Mesh;baseZ:number;speed:number;lateral:number;reverse:boolean}> = [];
    let trafficActors: Array<{mesh:Mesh;baseZ:number;speed:number}> = [];
    let footballActors: Array<{mesh:Mesh;baseX:number;baseZ:number;phase:number;speed:number;radiusX:number;radiusZ:number}> = [];
    let footballBallMesh: Mesh | null = null;
    let armedThreatBodyMesh: Mesh | null = null;
    let armedThreatArmsMesh: Mesh | null = null;
    let threatAngryBrowsMesh: Mesh | null = null;
    let signalRedMesh: Mesh | null = null;
    let bloodMesh: Mesh | null = null;
    let program: WebGLProgram | null = null;

    try {
      const vertex = makeShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
      const fragment = makeShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
      program = gl.createProgram();
      if (!program) throw new Error("No se pudo iniciar el renderizador 3D");
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || "No se pudo enlazar el renderizador 3D");
      }

      worldMesh = createMesh(gl, buildWorld());
      campingWorldMesh = createMesh(gl, buildCampingWorld());
      campingWaterMesh = createMesh(gl, buildCampingWater());
      campingBridgeMesh = createMesh(gl, buildCampingBridge());
      campingGateLeafMesh = createMesh(gl, buildCampingGateLeaf());
      campingCarExteriorMesh = createMesh(gl, buildCampingCarExterior());
      campingDoorMesh = createMesh(gl, buildCampingDoor());
      campingTrunkClosedMesh = createMesh(gl, buildCampingTrunkClosed());
      campingTrunkLidMesh = createMesh(gl, buildCampingTrunkLid());
      campingCharacterMesh = createMesh(gl, buildCampingCharacter());
      campingGearMesh = createMesh(gl, buildCampingGear());
      destinationSignMesh = createMesh(gl, buildDestinationSign());
      skyMesh = createMesh(gl, buildSkyDressing());
      carMesh = createMesh(gl, buildCar());
      lightMesh = createMesh(gl, buildHeadlights());
      cockpitMesh = createMesh(gl, buildCockpit());
      steeringAssemblyMesh = createMesh(gl, buildSteeringAssembly());
      windshieldMesh = createMesh(gl, buildWindshield());
      windshieldCracksMesh = createMesh(gl, buildWindshieldCracks());
      const people=[
        // Bicicletas: circulación pausada, más lenta que la gente a pie.
        {kind:"bike" as const,baseZ:-112,speed:.28,lateral:-.34,reverse:false,color:"#bb653f"},
        {kind:"bike" as const,baseZ:-181,speed:-.32,lateral:.34,reverse:true,color:"#6d8297"},
        {kind:"bike" as const,baseZ:-237,speed:.24,lateral:-.18,reverse:false,color:"#668a70"},
        // Caminantes y corredores en más tramos de la bicisenda.
        {kind:"walk" as const,baseZ:-91,speed:.62,lateral:.2,reverse:false,color:"#9271a4"},
        {kind:"walk" as const,baseZ:-136,speed:-.58,lateral:-.3,reverse:true,color:"#4e8491"},
        {kind:"walk" as const,baseZ:-169,speed:.55,lateral:.28,reverse:false,color:"#c17e55"},
        {kind:"walk" as const,baseZ:-214,speed:-.64,lateral:-.22,reverse:true,color:"#788f9d"},
        {kind:"walk" as const,baseZ:-247,speed:.57,lateral:.22,reverse:false,color:"#b8a16b"},
        {kind:"run" as const,baseZ:-155,speed:.88,lateral:-.18,reverse:false,color:"#d1a34f"},
        {kind:"run" as const,baseZ:-224,speed:-.82,lateral:.16,reverse:true,color:"#a85e54"},
      ];
      pathActors=people.map(p=>({mesh:createMesh(gl,p.kind==="bike"?buildPathCyclist(p.color):buildPathPedestrian(p.kind,p.color,"#c99576")),baseZ:p.baseZ,speed:p.speed,lateral:p.lateral,reverse:p.reverse}));
      const traffic=[
        {baseZ:-165,speed:6,body:"#b85d45",cabin:"#596e75"},
        {baseZ:-232,speed:5.6,body:"#d5d1bf",cabin:"#526b78"},
        {baseZ:-292,speed:6.5,body:"#4d7181",cabin:"#374c5a"},
        {baseZ:-122,speed:5.4,body:"#b8a36f",cabin:"#42565e"},
        {baseZ:-74,speed:6.2,body:"#d7d2c3",cabin:"#586d78"},
        {baseZ:-196,speed:5.9,body:"#647f68",cabin:"#354d58"},
        {baseZ:-264,speed:6.4,body:"#b68c58",cabin:"#425b68"},
        {baseZ:-318,speed:5.8,body:"#a8afb0",cabin:"#394f5a"},
      ];
      trafficActors=traffic.map(c=>({mesh:createMesh(gl,buildOncomingCar(c.body,c.cabin)),baseZ:c.baseZ,speed:c.speed}));
      const players=[
        {x:-121,z:-179,phase:.2,speed:.72,rx:2.4,rz:3.2,team:0},
        {x:-112,z:-174,phase:1.3,speed:.83,rx:2.8,rz:3.7,team:1},
        {x:-96,z:-178,phase:2.1,speed:.68,rx:2.3,rz:3.4,team:0},
        {x:-119,z:-153,phase:3.0,speed:.77,rx:2.8,rz:3.1,team:1},
        {x:-105,z:-157,phase:4.1,speed:.91,rx:3.0,rz:3.6,team:0},
        {x:-91,z:-164,phase:5.0,speed:.73,rx:2.6,rz:3.4,team:1},
      ];
      footballActors=players.map((p,i)=>({
        mesh:createMesh(gl,buildFootballPlayer(p.team===0?"#b94e3f":"#e4dfce",p.team===0?"#263a58":"#4b3431",i)),
        baseX:p.x+FIELD_X_OFFSET,baseZ:p.z+FIELD_Z_OFFSET,phase:p.phase,speed:p.speed,radiusX:p.rx,radiusZ:p.rz,
      }));
      footballBallMesh=createMesh(gl,buildFootballBall());
      armedThreatBodyMesh=createMesh(gl,buildArmedThreatBody());
      armedThreatArmsMesh=createMesh(gl,buildArmedThreatArms());
      threatAngryBrowsMesh=createMesh(gl,buildThreatAngryBrows());
      signalRedMesh=createMesh(gl,buildSignalLens());
      bloodMesh=createMesh(gl,buildStylizedBlood());
      crashExplosionMesh=createMesh(gl,buildCrashExplosion());
    } catch (error) {
      console.error("No se pudo iniciar la escena low poly de Ruta 40", error);
      if (program) gl.deleteProgram(program);
      setFallback(true);
      return;
    }

    gl.useProgram(program);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 0);

    const fogLocation = gl.getUniformLocation(program, "uFogColor");
    gl.uniform3fv(fogLocation, new Float32Array([0.57, 0.36, 0.32]));
    const resolutionLocation = gl.getUniformLocation(program, "uResolution");
    const timeLocation = gl.getUniformLocation(program, "uTime");
    const headlightLocation = gl.getUniformLocation(program, "uHeadlightPosition");

    setFallback(false);

    const animate = (now: number) => {
      if (!active || !program || !worldMesh || !carMesh || !lightMesh || !cockpitMesh || !steeringAssemblyMesh || !windshieldMesh) return;
      if (!started) {
        startedAt = now;
        previousFrame = now;
        started = true;
      }
      const elapsed = Math.max(0, (now - startedAt) / 1000);
      const dt = clamp((now - previousFrame) / 1000, 0, 0.05);
      previousFrame = now;
      const roadZForPhysics = elapsed < DURATION ? -elapsed * 4.1 : -DURATION * 4.1 - travelled;
      const steeringInput = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
      steeringTarget = steeringInput * 0.13;
      steeringAngle = mix(steeringAngle, steeringTarget, 1 - Math.exp(-dt * 7.5));

      if (elapsed >= DURATION && stageRef.current === "driving") {
        const braking = keys.has("s");
        const throttle = keys.has("w") && !braking;
        const downhillAssist = clamp((roadHeightAt(roadZForPhysics + 3) - roadHeightAt(roadZForPhysics - 3)) * 0.12, 0, 0.5);
        if (throttle) {
          driveSpeed = Math.min(5.4, driveSpeed + dt * (2.55 + downhillAssist));
        } else if (braking) {
          driveSpeed = Math.max(0, driveSpeed - dt * 8.2);
        } else {
          // Crucero automático: mantiene marcha y recupera suavemente velocidad al soltar el freno.
          driveSpeed = Math.min(5.1, driveSpeed + dt * 1.25);
        }
        driveElapsed += dt * clamp(driveSpeed / 5.1, 0, 1);
        if (keys.has("a")) laneOffset = clamp(laneOffset - dt * 2.15, -2.35, 2.35);
        if (keys.has("d")) laneOffset = clamp(laneOffset + dt * 2.15, -2.35, 2.35);
        if (keys.has("arrowleft") || keys.has("q")) lookYawTarget -= dt * 1.15;
        if (keys.has("arrowright")) lookYawTarget += dt * 1.15;
        if (keys.has("arrowup")) lookPitchTarget = clamp(lookPitchTarget + dt * 0.7, -0.48, 0.48);
        if (keys.has("arrowdown")) lookPitchTarget = clamp(lookPitchTarget - dt * 0.7, -0.48, 0.48);
        lookYaw = mix(lookYaw, lookYawTarget, 1 - Math.exp(-dt * 18));
        lookPitch = mix(lookPitch, lookPitchTarget, 1 - Math.exp(-dt * 18));
        travelled += driveSpeed * dt;
        if (driveElapsed >= 20) {
          // La YPF queda como paisaje: el auto pasa de largo y sigue hacia la subida.
          climbElapsed = 0;
          setStage("climbing");
        }
      }
      if(stageRef.current==="climbing"){
        const braking=keys.has("s"),throttle=keys.has("w")&&!braking;
        const uphillPenalty=clamp((roadHeightAt(roadZForPhysics-3)-roadHeightAt(roadZForPhysics+3))*.09,0,.6);
        const distanceToStop=(-DURATION*4.1-travelled)-SIGNAL_STOP_Z;
        const brakingDistance=(driveSpeed*driveSpeed)/(2*2.7)+1.0;
        const automaticBrake=distanceToStop<=brakingDistance;
        if(automaticBrake)driveSpeed=Math.max(0,driveSpeed-dt*2.7);
        else if(throttle)driveSpeed=Math.min(5.4,driveSpeed+dt*(2.25-uphillPenalty));
        else if(braking)driveSpeed=Math.max(0,driveSpeed-dt*8.2);
        else driveSpeed=Math.min(5.1,driveSpeed+dt*Math.max(.45,1.2-uphillPenalty));
        climbElapsed+=dt*clamp(driveSpeed/5.1,0,1);
        if(keys.has("a"))laneOffset=clamp(laneOffset-dt*1.85,-2.35,2.35);
        if(keys.has("d"))laneOffset=clamp(laneOffset+dt*1.85,-2.35,2.35);
        if(keys.has("arrowleft")||keys.has("q"))lookYawTarget-=dt*1.1;
        if(keys.has("arrowright"))lookYawTarget+=dt*1.1;
        lookYaw=mix(lookYaw,lookYawTarget,1-Math.exp(-dt*18));
        lookPitch=mix(lookPitch,lookPitchTarget,1-Math.exp(-dt*18));
        travelled+=driveSpeed*dt;
        const approachingCarZ=-DURATION*4.1-travelled;
        if((automaticBrake&&driveSpeed<=.05)||approachingCarZ<=SIGNAL_STOP_Z){
          driveSpeed=0;laneOffset=0;signalEncounterStartedAt=now;keys.clear();
          lookYawTarget=0;lookYaw=0;lookPitchTarget=0;lookPitch=0;
          engineAudioRef.current?.stop();setStage("signalEncounter");
        }
      }
      if(stageRef.current==="signalEncounter"){
        driveSpeed=0;
        if(now-signalEncounterStartedAt>=NPC_NERVOUS_MS){
          signalAimStartedAt=now;
          setStage("signalAim");
        }
      }
      if(stageRef.current==="signalAim"){
        driveSpeed=0;
        if(now-signalAimStartedAt>=NPC_AIM_HOLD_MS){
          escapeStartedAt=now;
          npcImpactZ=THREAT_Z;
          npcImpactX=roadCenter(THREAT_Z);
          driveSpeed=0;laneOffset=0;keys.clear();
          startEngineAudio();engineAudioRef.current?.setThrottle(.98);setStage("escape");
        }
      }
      if(stageRef.current==="escape"){
        const braking=keys.has("s");
        const accelerating=keys.has("w")&&!braking;
        if(braking)driveSpeed=Math.max(0,driveSpeed-dt*8.2);
        else if(accelerating)driveSpeed=Math.min(9.4,driveSpeed+dt*5.1);
        else driveSpeed=Math.min(9.4,driveSpeed+dt*4.2);
        if(keys.has("a"))laneOffset=clamp(laneOffset-dt*1.85,-2.35,2.35);
        if(keys.has("d"))laneOffset=clamp(laneOffset+dt*1.85,-2.35,2.35);
        if(keys.has("arrowleft")||keys.has("q"))lookYawTarget-=dt*1.1;
        if(keys.has("arrowright"))lookYawTarget+=dt*1.1;
        if(keys.has("arrowup"))lookPitchTarget=clamp(lookPitchTarget+dt*.7,-.48,.48);
        if(keys.has("arrowdown"))lookPitchTarget=clamp(lookPitchTarget-dt*.7,-.48,.48);
        lookYaw=mix(lookYaw,lookYawTarget,1-Math.exp(-dt*18));
        lookPitch=mix(lookPitch,lookPitchTarget,1-Math.exp(-dt*18));
        travelled+=driveSpeed*dt;
        const movingCarZ=-DURATION*4.1-travelled;
        if(npcImpactAt===0&&movingCarZ<=npcImpactZ+2.35){
          npcImpactAt=now;
          if(!impactEffectsPlayed){
            impactEffectsPlayed=true;
            const audioContext=engineAudioRef.current?.context;
            if(audioContext)playNpcImpactSequence(audioContext);
          }
        }
        // Se conserva la salida narrativa, pero recién después de mostrar el salto temporal completo.
        if(npcImpactAt>0&&now-npcImpactAt>=15500){
          driveSpeed=0;keys.clear();
          if(document.pointerLockElement)document.exitPointerLock();
          engineAudioRef.current?.stop();
          campDistance=0;campSpeed=6.8;campLaneOffset=0;
          startEngineAudio();engineAudioRef.current?.setThrottle(.58);
          try { campAmbientStop=createCampingAmbientAudio(); } catch (error) {
            console.warn("El ambiente natural del camping no está disponible", error);
          }
          setStage("campApproach");
        }
      }
      if(stageRef.current==="campApproach"){
        const braking=keys.has("s"),accelerating=keys.has("w")&&!braking;
        if(keys.has("a"))campLaneOffset=clamp(campLaneOffset-dt*1.4,-1.6,1.6);
        if(keys.has("d"))campLaneOffset=clamp(campLaneOffset+dt*1.4,-1.6,1.6);
        if(braking)campSpeed=Math.max(0,campSpeed-dt*8.0);
        else if(CAMP_STOP_DISTANCE-campDistance<=13.5)campSpeed=Math.max(0,campSpeed-dt*1.8);
        else if(accelerating)campSpeed=Math.min(8.4,campSpeed+dt*2.1);
        else campSpeed=Math.min(7.0,campSpeed+dt*.45);
        campDistance=Math.min(CAMP_STOP_DISTANCE,campDistance+campSpeed*dt);
        lookYaw=mix(lookYaw,lookYawTarget,1-Math.exp(-dt*12));
        lookPitch=mix(lookPitch,lookPitchTarget,1-Math.exp(-dt*12));
        if(campDistance>=CAMP_STOP_DISTANCE-.05||campSpeed<=.04){
          campDistance=Math.min(campDistance,CAMP_STOP_DISTANCE);
          campSpeed=0;keys.clear();
          if(document.pointerLockElement)document.exitPointerLock();
          engineAudioRef.current?.stop();
          setStage("campStopped");
        }
      }
      if(stageRef.current==="exiting"&&now-exitStartedAt>=4400){
        walkStartedAt=now;setStage("walkingToTrunk");
      }
      if(stageRef.current==="walkingToTrunk"&&now-walkStartedAt>=2800){
        setStage("trunkPrompt");
      }
      if(stageRef.current==="trunkOpening"&&now-trunkStartedAt>=4200){
        endingStartedAt=now;
        setStage("ending");
      }
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      const dpr = Math.min(1.25, window.devicePixelRatio || 1);
      const pixelWidth = Math.max(1, Math.round(width * dpr));
      const pixelHeight = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }
      gl.viewport(0, 0, pixelWidth, pixelHeight);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniform2f(resolutionLocation, pixelWidth, pixelHeight);
      gl.uniform1f(timeLocation, elapsed);
      gl.useProgram(program);

      const campingMode = ["campApproach", "campStopped", "exiting", "walkingToTrunk", "trunkPrompt", "trunkOpening", "ending"].includes(stageRef.current);
      const carZ = campingMode ? -campDistance : elapsed < DURATION ? -elapsed * 4.1 : -DURATION * 4.1 - travelled;
      const carX = campingMode ? campRoadX(carZ) + campLaneOffset : roadCenter(carZ) + laneOffset;
      const carY = campingMode ? -0.145 : roadHeightAt(carZ) - 0.18;
      gl.uniform3f(headlightLocation, carX, carY + 0.48, carZ - 2.08);

      // Choque por volumen de ambos autos: invadir el carril contrario puede terminar en accidente.
      if (crashStartedAt === 0 && elapsed >= DURATION &&
        (stageRef.current === "driving" || stageRef.current === "climbing")) {
        const collision = trafficActors.some((traffic) => {
          const span = 534;
          const raw = traffic.baseZ + elapsed * traffic.speed;
          const trafficZ = -520 + (((raw + 520) % span) + span) % span;
          // La separación lateral se mide contra el eje local de la ruta para no generar falsos choques en curvas.
          const laneOverlap = Math.abs(laneOffset + 2.15) < 1.88;
          return Math.abs(trafficZ - carZ) < 4.15 && laneOverlap;
        });
        if (collision) {
          crashStartedAt = now;
          driveSpeed = 0;
          keys.clear();
          if (document.pointerLockElement) document.exitPointerLock();
          if (engineAudioRef.current) engineAudioRef.current.stop();
          setStage("crashed");
        }
      }
      const transition = smooth(4.48, 5.95, elapsed);
      const aerialEye: V3 = [0, 38 + roadHeightAt(carZ), carZ + 13];
      const aerialTarget: V3 = [0, roadHeightAt(carZ), carZ - 1.5];
      const outsideStage = false;
      const crashAge = stageRef.current === "crashed" ? (now - crashStartedAt) / 1000 : 0;
      const crashShake = stageRef.current === "crashed" ? (1 - smooth(0, 0.72, crashAge)) * 0.055 : 0;
      const hitShake=npcImpactAt>0?(1-smooth(0,.72,(now-npcImpactAt)/1000))*.085:0;
      const shake = transition * (0.005 + driveSpeed * 0.0021) * (outsideStage ? 0 : 1) + crashShake + hitShake;
      const shakeX = Math.sin(now * 0.024) * shake;
      const shakeY = Math.sin(now * 0.039) * shake * 0.62;
      const suspensionBounce = (Math.sin(elapsed * 13.5) + Math.sin(elapsed * 22.0) * 0.32) * (driveSpeed / 5.4) * 0.018;
      const uphillGrade=clamp((roadHeightAt(carZ-18)-roadHeightAt(carZ+2))/20,0,.48);
      const uphillPitch=Math.atan(uphillGrade)*.96;
      const driverEye: V3 = [carX+shakeX,roadHeightAt(carZ)+1.43+shakeY+suspensionBounce+uphillPitch*.52,carZ+.56];
      const driverTarget: V3 = elapsed < DURATION
        ? [roadCenter(carZ - 39) + shakeX * 0.7, roadHeightAt(carZ - 39) + 2.6 + shakeY + uphillPitch*16, carZ - 39]
        : [
            carX + Math.sin(lookYaw + steeringAngle) * 39 + shakeX,
            roadHeightAt(carZ - 39) + 2.6 + lookPitch * 18 + shakeY + uphillPitch*16,
            carZ + 0.56 - Math.cos(lookYaw + steeringAngle) * 39,
          ];
      const cockpitEye: V3 = [
        mix(aerialEye[0], driverEye[0], transition),
        mix(aerialEye[1], driverEye[1], transition),
        mix(aerialEye[2], driverEye[2], transition),
      ];
      const cockpitTarget: V3 = [
        mix(aerialTarget[0], driverTarget[0], transition),
        mix(aerialTarget[1], driverTarget[1], transition),
        mix(aerialTarget[2], driverTarget[2], transition),
      ];
      const blendPoint = (from: V3, to: V3, amount: number): V3 => [
        mix(from[0], to[0], amount), mix(from[1], to[1], amount), mix(from[2], to[2], amount),
      ];
      const campDriverEye: V3 = [carX + shakeX, 1.43 + shakeY + suspensionBounce, carZ + 0.56];
      const campDriverTarget: V3 = [
        carX + Math.sin(lookYaw + steeringAngle) * 37 + shakeX,
        2.45 + lookPitch * 18 + shakeY,
        carZ + 0.56 - Math.cos(lookYaw + steeringAngle) * 37,
      ];
      const campOutsideEye: V3 = [carX - 10.8, 6.7, carZ + 15.2];
      const campOutsideTarget: V3 = [carX - 0.7, 1.0, carZ + 1.9];
      const campTrunkEye: V3 = [carX + 7.2, 4.7, carZ + 13.5];
      const campTrunkTarget: V3 = [carX, 1.45, carZ + 3.35];
      let campEye = campDriverEye;
      let campTarget = campDriverTarget;
      if (stageRef.current === "exiting") {
        const exitProgress = smooth(0.18, 4.15, (now - exitStartedAt) / 1000);
        campEye = blendPoint(campDriverEye, campOutsideEye, exitProgress);
        campTarget = blendPoint(campDriverTarget, campOutsideTarget, exitProgress);
      } else if (["walkingToTrunk", "trunkPrompt"].includes(stageRef.current)) {
        campEye = campOutsideEye;
        campTarget = campOutsideTarget;
      } else if (stageRef.current === "trunkOpening" || stageRef.current === "ending") {
        const trunkProgress = stageRef.current === "ending" ? 1 : smooth(0.25, 2.2, (now - trunkStartedAt) / 1000);
        campEye = blendPoint(campOutsideEye, campTrunkEye, trunkProgress);
        campTarget = blendPoint(campOutsideTarget, campTrunkTarget, trunkProgress);
      }
      const eye = campingMode ? campEye : cockpitEye;
      const target = campingMode ? campTarget : cockpitTarget;
      const fov = (campingMode ? 64 : mix(49, 66, transition)) * Math.PI / 180;
      const projection = perspective(fov, width / height, 0.1, 520);
      const cameraUp: V3 = [
        Math.sin(now * 0.021) * shake * 0.16,
        1,
        Math.sin(now * 0.017) * shake * 0.12,
      ];
      const view = lookAt(eye, target, cameraUp);
      const viewProjection = multiply(projection, view);

      const identity = translation(0, 0, 0);
      if (campingMode) {
        if (campingWorldMesh) bindMesh(gl, program, campingWorldMesh, viewProjection, view, identity);
        if (campingWaterMesh) {
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.depthMask(false);
          bindMesh(gl, program, campingWaterMesh, viewProjection, view, identity, 0.76, true);
          gl.depthMask(true);
          gl.disable(gl.BLEND);
        }
        if (campingBridgeMesh) bindMesh(gl, program, campingBridgeMesh, viewProjection, view, identity);

        // La tranquera gira sobre su bisagra y queda paralela al camino antes de que llegue el vehículo.
        const gateOpenProgress = smooth(10, 22, campDistance);
        const gatePivotX = campRoadX(CAMP_GATE_Z) - 5.65;
        const gatePivotY = campGroundY(gatePivotX, CAMP_GATE_Z);
        const gateModel = multiply(
          translation(gatePivotX, gatePivotY, CAMP_GATE_Z),
          rotationY(Math.PI * 0.5 * gateOpenProgress),
        );
        if (campingGateLeafMesh) bindMesh(gl, program, campingGateLeafMesh, viewProjection, view, gateModel);

        const carRotation = rotationY(campingMode && stageRef.current === "campApproach" ? steeringAngle * 0.34 : 0);
        const carModel = multiply(translation(carX, carY, carZ), carRotation);
        const outsideBlend = stageRef.current === "exiting"
          ? smooth(0.25, 3.7, (now - exitStartedAt) / 1000)
          : ["walkingToTrunk", "trunkPrompt", "trunkOpening", "ending"].includes(stageRef.current) ? 1 : 0;
        const cabinBlend = 1 - outsideBlend;

        // Durante la llegada se conserva el habitáculo, las manos, el volante y el parabrisas actuales.
        if (cabinBlend > 0.005) {
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.depthMask(false);
          bindMesh(gl, program, cockpitMesh, viewProjection, view, carModel, cabinBlend);
          const steeringModel = multiply(
            multiply(multiply(carModel, translation(0, 1.03, -0.88)), rotationZ(steeringAngle * 2.25)),
            translation(0, -1.03, 0.88),
          );
          bindMesh(gl, program, steeringAssemblyMesh, viewProjection, view, steeringModel, cabinBlend);
          bindMesh(gl, program, windshieldMesh, viewProjection, view, carModel, cabinBlend * 0.19);
          if (npcImpactAt > 0 && windshieldCracksMesh) {
            bindMesh(gl, program, windshieldCracksMesh, viewProjection, view, carModel, cabinBlend * 0.88);
          }
          gl.depthMask(true);
          gl.disable(gl.BLEND);
        }

        // El modelo exterior es el mismo vehículo low-poly de la escena anterior.
        if (outsideBlend > 0.005) {
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.depthMask(false);
          if (campingCarExteriorMesh) bindMesh(gl, program, campingCarExteriorMesh, viewProjection, view, carModel, outsideBlend);
          gl.depthMask(true);
          gl.disable(gl.BLEND);
        }

        const exitElapsed = stageRef.current === "exiting" ? (now - exitStartedAt) / 1000 : 0;
        const doorOpen = stageRef.current === "exiting"
          ? smooth(0.12, 0.85, exitElapsed) * (1 - smooth(3.55, 4.25, exitElapsed))
          : 0;
        if (campingDoorMesh && doorOpen > 0.005) {
          const doorModel = multiply(
            translation(carX - 0.98, carY + 0.55, carZ - 1.18),
            rotationY(-doorOpen * 1.2),
          );
          bindMesh(gl, program, campingDoorMesh, viewProjection, view, doorModel);
        }

        // El personaje baja del lado del conductor, cierra la puerta y camina hacia el baúl.
        let playerVisible = false, playerX = carX - 2.75, playerZ = carZ + 0.85, playerFacing = -Math.PI * 0.5;
        let playerOpacity = 1;
        if (stageRef.current === "exiting") {
          const exitProgress = (now - exitStartedAt) / 1000;
          const stepOut = smooth(0.8, 2.75, exitProgress);
          playerVisible = exitProgress > 0.55;
          playerX = mix(carX - 0.72, carX - 2.85, stepOut);
          playerZ = mix(carZ + 0.1, carZ + 0.85, stepOut);
          playerOpacity = smooth(0.55, 1.0, exitProgress);
        } else if (stageRef.current === "walkingToTrunk") {
          const walkProgress = smooth(0.12, 2.65, (now - walkStartedAt) / 1000);
          playerVisible = true;
          playerX = mix(carX - 2.85, carX - 1.05, walkProgress);
          playerZ = carZ + 0.85 + walkProgress * 4.25;
          playerFacing = Math.PI;
        } else if (["trunkPrompt", "trunkOpening", "ending"].includes(stageRef.current)) {
          playerVisible = true;
          playerX = carX - 1.05;
          playerZ = carZ + 5.1;
          playerFacing = Math.PI;
        }
        if (playerVisible && campingCharacterMesh) {
          const footstep = stageRef.current === "walkingToTrunk" ? Math.abs(Math.sin((now - walkStartedAt) * 0.009)) * 0.07 : 0;
          const playerModel = multiply(
            translation(playerX, campGroundY(playerX, playerZ) + footstep, playerZ),
            rotationY(playerFacing),
          );
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.depthMask(false);
          bindMesh(gl, program, campingCharacterMesh, viewProjection, view, playerModel, playerOpacity);
          gl.depthMask(true);
          gl.disable(gl.BLEND);
        }

        // El portón trasero se levanta desde sus bisagras; la carpa y la caja ya están dentro del baúl.
        const trunkProgress = stageRef.current === "ending"
          ? 1
          : stageRef.current === "trunkOpening"
            ? smooth(0.08, 1.65, (now - trunkStartedAt) / 1000)
            : 0;
        if (campingTrunkClosedMesh && outsideBlend > 0.005 && trunkProgress < 0.995) {
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.depthMask(false);
          bindMesh(gl, program, campingTrunkClosedMesh, viewProjection, view, carModel, outsideBlend * (1 - trunkProgress));
          gl.depthMask(true);
          gl.disable(gl.BLEND);
        }
        if (campingTrunkLidMesh && trunkProgress > 0.005) {
          const lidModel = multiply(
            translation(carX, carY + 1.25, carZ + 2.2),
            rotationX(-1.42 * trunkProgress),
          );
          bindMesh(gl, program, campingTrunkLidMesh, viewProjection, view, lidModel);
        }
        if (campingGearMesh && trunkProgress > 0.72) {
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.depthMask(false);
          bindMesh(gl, program, campingGearMesh, viewProjection, view, carModel, smooth(0.72, 0.98, trunkProgress));
          gl.depthMask(true);
          gl.disable(gl.BLEND);
        }
      } else {
      bindMesh(gl, program, worldMesh, viewProjection, view, identity);
      if (skyMesh) bindMesh(gl, program, skyMesh, viewProjection, view, identity);
      const signReveal = smooth(
        DESTINATION_SIGN_TRIGGER_DISTANCE,
        DESTINATION_SIGN_TRIGGER_DISTANCE + 1.8,
        travelled,
      );
      if (destinationSignMesh && signReveal > 0.001) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        bindMesh(gl, program, destinationSignMesh, viewProjection, view, identity, signReveal);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
      }
      // Ciclistas, peatones y corredores recorren la bicisenda en ambos sentidos.
      for(const actor of pathActors){
        const span=168,raw=actor.baseZ+elapsed*actor.speed,z=-252+(((raw+252)%span)+span)%span;
        const x=roadCenter(z)-12.1+actor.lateral,y=terrainSurfaceY(x,z)+.035;
        const model=multiply(translation(x,y,z),rotationY(actor.reverse?Math.PI:0));
        bindMesh(gl,program,actor.mesh,viewProjection,view,model);
      }
      // Autos que vienen de frente por el carril opuesto.
      for(const traffic of trafficActors){
        const span=534,raw=traffic.baseZ+elapsed*traffic.speed,z=-520+(((raw+520)%span)+span)%span;
        const x=roadCenter(z)-2.15,y=roadHeightAt(z)-.16;
        const model=multiply(translation(x,y,z),rotationY(Math.PI));
        bindMesh(gl,program,traffic.mesh,viewProjection,view,model);
      }
      // Partido informal de dos equipos, con jugadores que se mueven por el campo.
      for(const player of footballActors){
        const phase=elapsed*player.speed+player.phase;
        const x=player.baseX+Math.sin(phase)*player.radiusX;
        const z=player.baseZ+Math.cos(phase*.82)*player.radiusZ;
        const y=terrainSurfaceY(x,z)-.05;
        const facing=Math.atan2(Math.cos(phase)*player.radiusX,-Math.sin(phase*.82)*player.radiusZ*.82);
        const model=multiply(translation(x,y,z),rotationY(facing));
        bindMesh(gl,program,player.mesh,viewProjection,view,model);
      }
      // Pelota que rueda y da pequeños saltos durante el partido.
      if(footballBallMesh){
        const ballX=-30+Math.sin(elapsed*1.08)*5.5;
        const ballZ=-315+Math.cos(elapsed*1.42)*8.5;
        const ballY=terrainSurfaceY(ballX,ballZ)+.24+Math.abs(Math.sin(elapsed*4.8))*.12;
        const ballModel=multiply(translation(ballX,ballY,ballZ),rotationY(elapsed*3.1));
        bindMesh(gl,program,footballBallMesh,viewProjection,view,ballModel);
      }

      const carRotation=multiply(rotationY(steeringAngle),rotationX(uphillPitch));
      const carModel=multiply(translation(carX,carY,carZ),carRotation);
      const aerialVisibility = 1 - smooth(5.1, 5.95, elapsed);
      const signalZ=SIGNAL_Z,signalX=roadCenter(signalZ)+3.55,signalGround=roadHeightAt(signalZ)-.18;
      const signalActive=["climbing","signalEncounter","signalAim","escape"].includes(stageRef.current);
      if(signalActive&&signalRedMesh){
        const redModel=multiply(translation(signalX,signalGround+6.12,signalZ+.39),scaling(2.55,2.55,2.55));
        bindMesh(gl,program,signalRedMesh,viewProjection,view,redModel);
      }
      if((stageRef.current==="signalEncounter"||stageRef.current==="signalAim"||stageRef.current==="escape")&&armedThreatBodyMesh){
        let npcX=roadCenter(THREAT_Z),npcZ=THREAT_Z;
        let npcY=roadHeightAt(npcZ)-.02,impactFall=0;
        if(stageRef.current==="escape"&&npcImpactAt>0){
          const hitAge=(now-npcImpactAt)/1000;
          impactFall=smooth(0,.48,hitAge);
          npcX=npcImpactX+2.0*impactFall;
          npcZ=npcImpactZ+.8*impactFall;
          const airborne=1-smooth(.28,.9,hitAge);
          npcY=roadHeightAt(npcZ)-.02+Math.sin(Math.min(hitAge,.62)/.62*Math.PI)*1.2*airborne;
        }
        const threatAge=stageRef.current==="signalEncounter"
          ? clamp((now-signalEncounterStartedAt)/1000,0,3)
          : 3;
        const aimStartSeconds=(NPC_NERVOUS_MS-NPC_AIM_RAISE_MS)/1000;
        const aimProgress=stageRef.current==="signalEncounter"
          ? smooth(aimStartSeconds,NPC_NERVOUS_MS/1000,threatAge)
          : 1;
        const nervousness=stageRef.current==="signalEncounter"?1-aimProgress:0;
        const anger=stageRef.current==="signalEncounter"?smooth(1.1,2.8,threatAge):1;
        const bodySway=stageRef.current==="escape"&&npcImpactAt>0
          ? 0
          : Math.sin(now*.021)*.018*nervousness + Math.sin(now*.037)*.009*nervousness + anger*.025;
        const bodyBob=stageRef.current==="escape"&&npcImpactAt>0
          ? 0
          : Math.sin(now*.028)*.035*nervousness;
        const fallRotation=rotationZ(1.48*impactFall);
        const npcRoot=multiply(translation(npcX,npcY+bodyBob,npcZ),fallRotation);
        const bodyModel=multiply(npcRoot,rotationZ(bodySway));
        if(npcDialogueRef.current&&npcDialogueTextRef.current){
          const warningAge=stageRef.current==="signalEncounter"
            ? clamp((now-signalEncounterStartedAt)/1000,0,3)
            : stageRef.current==="signalAim"
              ? 3+clamp((now-signalAimStartedAt)/1000,0,1)
              : -1;
          if(warningAge>=0){
            const reveal=smooth(0.08,1.35,warningAge);
            const visibleCharacters=Math.min(NPC_WARNING_TEXT.length,Math.ceil(NPC_WARNING_TEXT.length*reveal));
            npcDialogueTextRef.current.textContent=NPC_WARNING_TEXT.slice(0,visibleCharacters);
            const opacity=smooth(0.06,0.28,warningAge)*(1-smooth(3.72,4.02,warningAge));
            const headX=npcX-Math.sin(bodySway)*2.82;
            const headY=npcY+bodyBob+Math.cos(bodySway)*2.82;
            const anchor=projectToViewport([headX,headY,npcZ],viewProjection,rect.width,rect.height);
            if(anchor){
              const panelWidth=Math.min(320,Math.max(220,rect.width-24));
              const halfPanel=panelWidth*.5;
              const screenX=clamp(anchor.x,halfPanel+8,rect.width-halfPanel-8);
              const screenY=clamp(anchor.y,92,rect.height-28);
              npcDialogueRef.current.style.transform=
                `translate3d(${rect.left+screenX}px,${rect.top+screenY}px,0) translate(-50%,calc(-100% - 14px))`;
              npcDialogueRef.current.style.opacity=String(opacity);
              npcDialogueRef.current.style.visibility=opacity>.005?"visible":"hidden";
            }else{
              npcDialogueRef.current.style.opacity="0";
              npcDialogueRef.current.style.visibility="hidden";
            }
          }else{
            npcDialogueRef.current.style.opacity="0";
            npcDialogueRef.current.style.visibility="hidden";
            npcDialogueTextRef.current.textContent="";
          }
        }
        bindMesh(gl,program,armedThreatBodyMesh,viewProjection,view,bodyModel);
        if(armedThreatArmsMesh){
          const jitterGain=stageRef.current==="escape"?0:(.035+.105*smooth(0,2.7,threatAge))*nervousness;
          const weaponPitch=.72*(1-aimProgress)
            +(Math.sin(now*.031)+Math.sin(now*.047+.8)*.42)*jitterGain;
          const weaponYaw=(Math.sin(now*.019+.6)+Math.sin(now*.041)*.32)*jitterGain*.85;
          const shoulderPivot=multiply(bodyModel,translation(0,1.43,0));
          const armsModel=multiply(
            multiply(
              multiply(shoulderPivot,rotationY(weaponYaw)),
              rotationX(weaponPitch),
            ),
            translation(0,-1.43,0),
          );
          bindMesh(gl,program,armedThreatArmsMesh,viewProjection,view,armsModel);
        }
        if(threatAngryBrowsMesh&&anger>.01){
          gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
          bindMesh(gl,program,threatAngryBrowsMesh,viewProjection,view,bodyModel,anger);
          gl.depthMask(true);gl.disable(gl.BLEND);
        }
      }
      if(npcImpactAt>0&&bloodMesh){
        const bloodAge=(now-npcImpactAt)/1000,opacity=1-smooth(.7,2.1,bloodAge);
        if(opacity>.01){
          const bloodX=npcImpactX+1.0,bloodZ=npcImpactZ+.5;
          const bloodModel=multiply(translation(bloodX,roadHeightAt(bloodZ)+.13,bloodZ),scaling(1.45,.7,1.45));
          bindMesh(gl,program,bloodMesh,viewProjection,view,bloodModel,opacity*.72);
        }
      }
      if (stageRef.current === "crashed" && crashExplosionMesh) {
        const age = Math.max(0, (now - crashStartedAt) / 1000);
        const flare = smooth(0, 0.12, age) * (1 - smooth(1.25, 2.0, age));
        const size = 0.8 + smooth(0, 0.25, age) * 1.55;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        const explosionModel = multiply(
          translation(carX, carY + 0.08, carZ - 1.9),
          scaling(size, size * 1.28, size),
        );
        bindMesh(gl, program, crashExplosionMesh, viewProjection, view, explosionModel, flare);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
      }
      if (stageRef.current !== "crashed" && aerialVisibility > 0.01) {
        bindMesh(gl, program, carMesh, viewProjection, view, carModel);
      }
      const lightVisibility = smooth(4.8, 5.65, elapsed);
      if (stageRef.current !== "crashed" && lightVisibility > 0.01) {
        bindMesh(gl, program, lightMesh, viewProjection, view, carModel, 0.045);
        bindMesh(gl, program, cockpitMesh, viewProjection, view, carModel);
        const steeringModel = multiply(
          multiply(
            multiply(carModel, translation(0, 1.03, -0.88)),
            rotationZ(steeringAngle * 2.25),
          ),
          translation(0, -1.03, 0.88),
        );
        bindMesh(gl, program, steeringAssemblyMesh, viewProjection, view, steeringModel);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        bindMesh(gl, program, windshieldMesh, viewProjection, view, carModel, 0.19);
        if(npcImpactAt>0&&windshieldCracksMesh){
          bindMesh(gl,program,windshieldCracksMesh,viewProjection,view,carModel,.88);
        }
        gl.depthMask(true);
        gl.disable(gl.BLEND);
      }
      }

      if (engineAudioRef.current) {
        if (stageRef.current === "campApproach") {
          engineAudioRef.current.setThrottle(0.16 + (campSpeed / 8.4) * 0.58);
          engineAudioRef.current.setRoadSpeed(campSpeed / 8.4);
        } else if ((stageRef.current === "driving" || stageRef.current === "climbing" || stageRef.current === "escape") &&
          (stageRef.current === "climbing" || stageRef.current === "escape" || elapsed >= DURATION)) {
          const accelerating = keys.has("w") && !keys.has("s");
          const throttle = stageRef.current === "escape" ? 0.98 : accelerating
            ? 0.24 + (driveSpeed / 5.4) * 0.76
            : keys.has("s") ? 0.1 : 0.14 + (driveSpeed / 5.4) * 0.24;
          engineAudioRef.current.setThrottle(throttle);
          engineAudioRef.current.setRoadSpeed(driveSpeed / 5.4);
        } else {
          engineAudioRef.current.stop();
        }
      }

      if (titleRef.current) {
        titleRef.current.style.opacity = String(smooth(0.28, 0.9, elapsed) * (1 - smooth(4.1, 4.7, elapsed)));
      }
      if (locationRef.current) {
        const locationOpacity = smooth(DURATION + 0.02, DURATION + 0.42, elapsed) *
          (1 - smooth(DURATION + 4.6, DURATION + 5.2, elapsed));
        locationRef.current.style.opacity = String(locationOpacity);
      }
      const impactElapsed = npcImpactAt > 0 ? (now - npcImpactAt) / 1000 : -1;
      if (driverReactionRef.current) {
        const reactionOpacity = impactElapsed >= 0
          ? smooth(0.08, 0.28, impactElapsed) * (1 - smooth(2.7, 3.25, impactElapsed))
          : 0;
        driverReactionRef.current.style.opacity = String(reactionOpacity);
      }
      if (starIndicatorRef.current) {
        const starOpacity = impactElapsed >= 0
          ? smooth(0.12, 0.48, impactElapsed) * (1 - smooth(5.7, 6.6, impactElapsed))
          : 0;
        const starSlide = 1 - smooth(0.12, 0.55, impactElapsed);
        starIndicatorRef.current.style.opacity = String(starOpacity);
        starIndicatorRef.current.style.transform = `translate3d(0,${-12 * starSlide}px,0) scale(${0.92 + 0.08 * smooth(0.12, 0.55, impactElapsed)})`;
      }
      if (campEndingShadeRef.current && campEndingTextRef.current) {
        const endingElapsed = endingStartedAt > 0 ? (now - endingStartedAt) / 1000 : -1;
        campEndingShadeRef.current.style.opacity = String(smooth(0.1, 2.0, endingElapsed) * 0.88);
        campEndingTextRef.current.style.opacity = String(smooth(0.72, 1.9, endingElapsed));
        campEndingTextRef.current.style.transform = `translateY(${(1 - smooth(0.72, 1.9, endingElapsed)) * 14}px)`;
      }
      if (timeJumpRef.current) {
        const timeJumpOpacity = impactElapsed >= 0
          ? smooth(10, 10.65, impactElapsed) * (1 - smooth(13.75, 14.45, impactElapsed))
          : 0;
        timeJumpRef.current.style.opacity = String(timeJumpOpacity);
      }
      if (gameHudRef.current) {
        gameHudRef.current.style.opacity = String(
          smooth(DURATION + 0.1, DURATION + 0.9, elapsed) *
          (stageRef.current === "driving" || stageRef.current === "climbing" || stageRef.current === "escape" || stageRef.current === "campApproach" ? 1 : 0),
        );
      }
      if (progressRef.current) {
        const progress = stageRef.current === "campApproach"
          ? campDistance / CAMP_STOP_DISTANCE
          : stageRef.current === "escape"
            ? (npcImpactAt>0?(now-npcImpactAt)/15500:(now-escapeStartedAt)/18500)
            : stageRef.current === "climbing" ? climbElapsed/8.6 : driveElapsed/20;
        progressRef.current.style.width = String(clamp(progress, 0, 1) * 100) + "%";
      }
      if (speedRef.current) speedRef.current.textContent = String(Math.round((stageRef.current === "campApproach" ? campSpeed : driveSpeed) * 19));

      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);
    return () => {
      active = false;
      keys.clear();
      interactionActionRef.current = null;
      campAmbientStop?.();
      engineAudioRef.current?.destroy();
      engineAudioRef.current = null;
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("pointerlockerror", onPointerLockError);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      window.cancelAnimationFrame(frame);
      if (worldMesh) gl.deleteBuffer(worldMesh.buffer);
      if (campingCarExteriorMesh) gl.deleteBuffer(campingCarExteriorMesh.buffer);
      if (campingTrunkClosedMesh) gl.deleteBuffer(campingTrunkClosedMesh.buffer);
      if (destinationSignMesh) gl.deleteBuffer(destinationSignMesh.buffer);
      if (skyMesh) gl.deleteBuffer(skyMesh.buffer);
      if (carMesh) gl.deleteBuffer(carMesh.buffer);
      if (lightMesh) gl.deleteBuffer(lightMesh.buffer);
      if (cockpitMesh) gl.deleteBuffer(cockpitMesh.buffer);
      if (steeringAssemblyMesh) gl.deleteBuffer(steeringAssemblyMesh.buffer);
      if (windshieldMesh) gl.deleteBuffer(windshieldMesh.buffer);
      if (windshieldCracksMesh) gl.deleteBuffer(windshieldCracksMesh.buffer);
      if (crashExplosionMesh) gl.deleteBuffer(crashExplosionMesh.buffer);
      if(armedThreatBodyMesh)gl.deleteBuffer(armedThreatBodyMesh.buffer);
      if(armedThreatArmsMesh)gl.deleteBuffer(armedThreatArmsMesh.buffer);
      if(threatAngryBrowsMesh)gl.deleteBuffer(threatAngryBrowsMesh.buffer);
      if(signalRedMesh)gl.deleteBuffer(signalRedMesh.buffer);
      if(bloodMesh)gl.deleteBuffer(bloodMesh.buffer);
      for(const player of footballActors) gl.deleteBuffer(player.mesh.buffer);
      if(footballBallMesh) gl.deleteBuffer(footballBallMesh.buffer);
      for(const actor of pathActors) gl.deleteBuffer(actor.mesh.buffer);
      for(const car of trafficActors) gl.deleteBuffer(car.mesh.buffer);
      if (program) gl.deleteProgram(program);
    };
  }, []);

  if (fallback) return <CanvasFallback />;

  return (
    <div className="fixed inset-0 z-[2000] h-[100svh] w-screen overflow-hidden bg-[#17212a] text-white">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 52% 58%, rgba(247,147,91,.32), transparent 43%), linear-gradient(180deg, #202b42 0%, #555164 38%, #b86d59 72%, #e5a36d 100%)",
        }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        role="img"
        aria-label="Cinemática 3D low poly de La Señal en la Ruta 40: un auto atraviesa una carretera patagónica con pinos geométricos y el Piltriquitrón reconstruido como una montaña de polígonos."
      />
      <div
        ref={titleRef}
        className="pointer-events-none absolute inset-x-4 top-[11%] z-10 text-center"
        style={{ opacity: 0 }}
      >
        <p className="font-serif text-xl tracking-[0.12em] text-[#eee0cc] drop-shadow-[0_3px_12px_rgba(0,0,0,0.85)] sm:text-3xl">
          Gennaro Montecino Presenta
        </p>
        <div className="mx-auto mt-4 h-px w-40 bg-[#d8b68f]/65 shadow-[0_0_12px_rgba(218,171,126,0.3)]" />
      </div>
      <div className="pointer-events-none absolute inset-0 z-10 opacity-[0.14] mix-blend-screen" style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.45) 0px, rgba(0,0,0,0.45) 1px, transparent 1px, transparent 4px)" }} />
      <div className="pointer-events-none absolute inset-0 z-10 opacity-[0.12]" style={{ background: "linear-gradient(90deg, rgba(193,78,68,0.14), transparent 14%, transparent 86%, rgba(75,155,174,0.13)), radial-gradient(ellipse at center, transparent 48%, rgba(0,0,0,0.55) 100%)" }} />
      <div
        ref={locationRef}
        className="pointer-events-none absolute inset-x-0 top-[7%] z-30 text-center"
        style={{ opacity: 0 }}
      >
        <p className="inline-block border-y border-amber-100/25 px-5 py-2 font-serif text-lg tracking-[0.2em] text-[#f0dfc8] drop-shadow-[0_2px_14px_rgba(0,0,0,0.82)] sm:text-2xl">
          El Bolsón, Argentina
        </p>
      </div>
      <div
        ref={driverReactionRef}
        className="pointer-events-none absolute inset-x-4 bottom-[10%] z-40 flex justify-center text-center"
        style={{ opacity: 0 }}
      >
        <p className="max-w-2xl border-y border-amber-100/30 bg-[#101820]/72 px-6 py-4 font-serif text-xl tracking-[0.09em] text-[#fff0d8] shadow-[0_0_35px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:text-3xl">
          ¡MIERDA, MIERDA, MIERDA!
        </p>
      </div>
      <div
        ref={timeJumpRef}
        className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center px-5 text-center"
        style={{ opacity: 0 }}
      >
        <p className="font-serif text-3xl tracking-[0.12em] text-[#f4e4d1] drop-shadow-[0_3px_24px_rgba(0,0,0,0.9)] sm:text-5xl">
          30 minutos más tarde...
        </p>
      </div>
      <div
        ref={starIndicatorRef}
        className="pointer-events-none absolute left-5 top-5 z-40 flex items-center gap-1 rounded-md border border-white/15 bg-[#111820]/65 px-3 py-2 shadow-[0_5px_22px_rgba(0,0,0,.42)] backdrop-blur-sm"
        style={{ opacity: 0, transform: "translate3d(0,-12px,0) scale(.92)" }}
        aria-hidden="true"
      >
        <span className="text-xl leading-none text-amber-300 drop-shadow-[0_0_8px_rgba(255,195,88,.9)]">★</span>
        <span className="text-xl leading-none text-slate-500/45">★</span>
        <span className="text-xl leading-none text-slate-500/45">★</span>
        <span className="text-xl leading-none text-slate-500/45">★</span>
        <span className="text-xl leading-none text-slate-500/45">★</span>
      </div>
      <div
        ref={gameHudRef}
        className="pointer-events-none absolute inset-x-0 bottom-5 z-30 flex flex-col items-center gap-2 px-3 text-center transition-opacity duration-300"
        style={{ opacity: 0 }}
      >
        <div className="rounded-sm border border-amber-100/25 bg-[#101820]/70 px-4 py-2 font-mono text-[10px] tracking-[.12em] text-amber-50 shadow-[0_0_30px_rgba(255,176,105,.14)] backdrop-blur-md sm:text-xs">
          "W · ACELERAR"
          <span className="mx-2 text-amber-100/35">|</span>
          A / D · DIRECCIÓN
          <span className="mx-2 text-amber-100/35">|</span>
          S · FRENAR
          <span className="mx-2 text-amber-100/35">|</span>
          MOVÉ EL MOUSE PARA MIRAR · ESC PARA SOLTAR
          <span className="ml-3 border-l border-amber-100/20 pl-3 tabular-nums"><span ref={speedRef}>0</span> KM/H</span>
        </div>
        <div className="pointer-events-auto mx-auto hidden items-center gap-2 rounded-sm border border-amber-100/15 bg-[#101820]/65 px-3 py-1 font-mono text-[9px] tracking-[.12em] text-amber-50/80 md:flex">
          <label htmlFor="route40-mouse-sensitivity">SENSIBILIDAD</label>
          <input
            id="route40-mouse-sensitivity"
            type="range"
            min="0.001"
            max="0.006"
            step="0.00025"
            value={mouseSensitivity}
            onChange={(event) => {
              const value = Number(event.currentTarget.value);
              mouseSensitivityRef.current = value;
              setMouseSensitivity(value);
            }}
            className="w-24 accent-amber-200"
            aria-label="Sensibilidad de la cámara"
          />
        </div>
        <div className="h-1 w-44 overflow-hidden rounded-full bg-white/15">
          <div ref={progressRef} className="h-full w-0 bg-amber-200 shadow-[0_0_12px_rgba(255,206,137,.9)] transition-[width] duration-100" />
        </div>
        <div className="pointer-events-auto flex flex-col items-center gap-2 md:hidden">
          <p className="font-mono text-[9px] tracking-[.18em] text-amber-50/70">MANTENÉ W PARA AVANZAR · S PARA FRENAR · DESLIZÁ PARA MIRAR</p>
          <div className="flex items-center gap-3">
            {(["a", "w", "s", "d"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onContextMenu={(event) => event.preventDefault()}
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.currentTarget.setPointerCapture(event.pointerId);
                  keysRef.current.add(key);
                  if (key === "w") startEngineAudio();
                }}
                onPointerUp={() => keysRef.current.delete(key)}
                onLostPointerCapture={() => keysRef.current.delete(key)}
                onPointerCancel={() => keysRef.current.delete(key)}
                className="grid h-14 w-14 touch-none select-none place-items-center rounded-xl border border-amber-100/45 bg-[#101820]/85 font-mono text-lg font-black text-amber-50 shadow-[0_5px_22px_rgba(0,0,0,.4)] backdrop-blur-md active:translate-y-0.5 active:bg-amber-100/25"
                aria-label={key === "w" ? "Mantener para acelerar" : key === "s" ? "Mantener para frenar" : key === "a" ? "Mantener para girar a la izquierda" : "Mantener para girar a la derecha"}
              >
                {key === "a" ? "◀" : key === "d" ? "▶" : key === "s" ? "S" : "W"}
              </button>
            ))}
          </div>
        </div>
      </div>
      {interactionStage === "campStopped" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[13%] z-50 flex justify-center px-4">
          <div className="pointer-events-auto flex w-full max-w-sm flex-col items-center gap-2 border border-amber-100/30 bg-[#111b1e]/88 px-5 py-4 text-center shadow-[0_10px_40px_rgba(0,0,0,.5)] backdrop-blur-md">
            <p className="font-mono text-[9px] tracking-[.28em] text-amber-100/65">EL MOTOR SE APAGA</p>
            <button type="button" onClick={() => interactionActionRef.current?.()} className="min-h-12 w-full border border-amber-100/45 bg-[#344c3a] px-5 py-3 font-mono text-xs tracking-[.16em] text-[#fff2dc] shadow-[0_0_22px_rgba(211,177,120,.15)] transition hover:bg-[#456149] active:scale-[.98]">
              <span className="mr-2 text-amber-200">E</span> BAJARTE DEL AUTO
            </button>
            <p className="font-mono text-[9px] tracking-[.12em] text-white/55">TAMBIÉN PODÉS TOCAR EL BOTÓN</p>
          </div>
        </div>
      )}
      {interactionStage === "trunkPrompt" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[13%] z-50 flex justify-center px-4">
          <div className="pointer-events-auto flex w-full max-w-sm flex-col items-center gap-2 border border-amber-100/30 bg-[#111b1e]/88 px-5 py-4 text-center shadow-[0_10px_40px_rgba(0,0,0,.5)] backdrop-blur-md">
            <p className="font-mono text-[9px] tracking-[.28em] text-amber-100/65">EQUIPAMIENTO EN EL BAÚL</p>
            <button type="button" onClick={() => interactionActionRef.current?.()} className="min-h-12 w-full border border-amber-100/45 bg-[#344c3a] px-5 py-3 font-mono text-xs tracking-[.16em] text-[#fff2dc] shadow-[0_0_22px_rgba(211,177,120,.15)] transition hover:bg-[#456149] active:scale-[.98]">
              <span className="mr-2 text-amber-200">E</span> ABRIR BAÚL
            </button>
          </div>
        </div>
      )}
      {interactionStage === "ending" && (
        <div ref={campEndingRef} className="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center px-5 text-center">
          <div ref={campEndingShadeRef} className="absolute inset-0 bg-[#070b12]" style={{ opacity: 0 }} />
          <p ref={campEndingTextRef} className="relative font-serif text-4xl tracking-[.18em] text-[#f1e3cf] drop-shadow-[0_3px_24px_rgba(0,0,0,.9)] sm:text-6xl" style={{ opacity: 0, transform: "translateY(14px)" }}>
            CONTINUARÁ...
          </p>
        </div>
      )}
      <div
        ref={npcDialogueRef}
        className="pointer-events-none absolute left-0 top-0 z-50 w-[min(320px,calc(100vw-24px))]"
        style={{ opacity: 0, visibility: "hidden", transform: "translate3d(-1000px,-1000px,0) translate(-50%,-100%)" }}
        aria-live="polite"
      >
        <div className="relative rounded-md border border-amber-100/25 bg-[#101820]/88 px-4 py-3 text-center shadow-[0_10px_34px_rgba(0,0,0,.48)] backdrop-blur-md">
          <div className="mb-1.5 flex items-center justify-center gap-2">
            <span className="h-px w-5 bg-amber-200/45" />
            <span className="font-mono text-[9px] tracking-[.28em] text-amber-100/75">ADVERTENCIA</span>
            <span className="h-px w-5 bg-amber-200/45" />
          </div>
          <p className="font-serif text-[15px] leading-snug tracking-[.015em] text-[#fff0dc] sm:text-base">
            <span ref={npcDialogueTextRef} />
          </p>
          <div className="pointer-events-none absolute left-1/2 top-full flex -translate-x-1/2 flex-col items-center">
            <span className="h-2.5 w-px bg-gradient-to-b from-amber-100/45 to-amber-100/10" />
            <span className="h-1 w-1 rounded-full bg-amber-100/55 shadow-[0_0_8px_rgba(238,205,160,.55)]" />
          </div>
        </div>
      </div>
      {interactionStage === "crashed" && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#160b0b]/75 px-5 text-center backdrop-blur-sm">
          <div className="w-full max-w-lg border border-orange-200/30 bg-[#170f10]/95 px-8 py-10 shadow-[0_0_80px_rgba(244,89,43,.32)]">
            <p className="font-mono text-xs tracking-[.38em] text-orange-300">SINIESTRO VIAL</p>
            <h2 className="mt-4 font-serif text-5xl tracking-[.12em] text-white sm:text-6xl">MORISTE</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">Invadiste el carril contrario y chocaste de frente con otro vehículo.</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-8 min-h-12 w-full border border-orange-200/40 bg-[#a9432f] px-5 py-3 font-mono text-xs tracking-[.18em] text-white hover:bg-[#c45136]">
              VOLVER A INTENTAR
            </button>
          </div>
        </div>
      )}
      {interactionStage === "finished" && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-[#06101a]/35 px-5 text-center">
          <div className="border-y border-amber-100/25 bg-[#101820]/80 px-8 py-8 shadow-[0_0_65px_rgba(243,159,92,.2)] backdrop-blur-md">
            <p className="font-mono text-[10px] tracking-[.34em] text-amber-100/70">EL CAMINO SIGUE HACIA LA MONTAÑA</p>
            <p className="mt-4 font-serif text-3xl tracking-[.14em] text-[#f4dfc6] sm:text-5xl">CONTINUARÁ</p>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-3 right-4 z-40 font-mono text-[9px] tracking-[.2em] text-white/30">
        LA SEÑAL EN LA RUTA 40 · PLAY / SP
      </div>
    </div>
  );
}
