import { useEffect, useRef, useState } from "react";
import { Route40Opening as CanvasFallback } from "./Route40Opening";

type V3 = [number, number, number];
type Mesh = { buffer: WebGLBuffer; count: number };

const DURATION = 14.4;
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
  return natural + 8.2 * (turnIn - turnOut);
}

function roadDipAt(z: number) {
  const descentIn = smooth(3, 43, -z);
  const descentOut = smooth(78, 128, -z);
  return -6.2 * descentIn * (1 - descentOut);
}

function roadHeightAt(z: number) {
  const downhillDip = roadDipAt(z);
  const progress = clamp((-z - 174) / 105, 0, 1);
  const eased = progress * progress * (3 - 2 * progress);
  return 0.18 + downhillDip + eased * 15.5;
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
  const airportFieldZ = 1 - smooth(86, 103, Math.abs(z + 167));
  const airportField = airportFieldX * airportFieldZ;
  const pitchArea=(1-smooth(23,34,Math.abs(x+107)))*(1-smooth(39,52,Math.abs(z+166)));
  const schoolArea=(1-smooth(15,25,Math.abs(x+141)))*(1-smooth(15,26,Math.abs(z+166)));
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
function addPine(mesh: MeshBuilder, x: number, z: number, base: number, height: number, seed: number) {
  const trunk = hex(seed % 2 < 1 ? "#332b25" : "#292922");
  mesh.box([x, base + height * 0.13, z], [height * 0.075, height * 0.27, height * 0.075], trunk);
  const greens = [hex("#172b29"), hex("#1d3430"), hex("#263a34"), hex("#304139")];
  const layers = 3 + (Math.floor(seed) % 2);
  for (let layer = 0; layer < layers; layer++) {
    const fraction = layer / layers;
    const baseY = base + height * (0.22 + fraction * 0.58);
    const layerHeight = height * (0.48 - fraction * 0.12);
    const radius = height * (0.33 - fraction * 0.08) * (0.9 + (seed % 7) * 0.018);
    mesh.cone(x, baseY, z, radius, layerHeight, 5 + (layer % 2), greens[(Math.floor(seed + layer) % greens.length)]!, greens[(Math.floor(seed + layer + 1) % greens.length)]!);
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
  const sections = 30;
  const startZ = 14;
  const endZ = -292;
  const section = (z: number) => {
    const fade = z < -268 ? Math.max(0.12, (z + 292) / 24) : 1;
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

function addYPFStation(mesh: MeshBuilder) {
  const stationX = 11.2;
  const stationZ = -166;
  const ground = terrainY(stationX, stationZ);
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
  const runwayStart = -76;
  const runwayEnd = -258;
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
  const apronY = terrainSurfaceY(-68, -165) + 0.04;
  mesh.quad(
    [-74, apronY, -181], [-59, apronY, -181],
    [-59, apronY, -148], [-74, apronY, -148],
    hex("#51595d"),
  );
  mesh.quad(
    [-69, apronY + 0.012, -181], [-61, apronY + 0.012, -181],
    [-61, apronY + 0.012, -148], [-69, apronY + 0.012, -148],
    hex("#424c52"),
  );

  // Hangar bajo de chapa gris, con portón ancho orientado hacia la pista.
  const hangarGround = terrainSurfaceY(-78, -165);
  mesh.box([-78, hangarGround + 2.0, -165], [11.2, 4.0, 13.0], hex("#737b7c"), hex("#4b565c"));
  mesh.box([-78, hangarGround + 4.12, -165], [11.8, 0.34, 13.6], hex("#343f48"), hex("#202a31"));
  mesh.box([-72.34, hangarGround + 1.72, -165], [0.08, 3.2, 7.4], hex("#26343b"));
  mesh.box([-72.28, hangarGround + 3.25, -165], [0.12, 0.12, 7.8], hex("#a94f42"));
  for (const z of [-170.4, -159.6]) {
    mesh.box([-72.18, hangarGround + 1.75, z], [0.15, 3.3, 0.16], hex("#a6ada9"));
  }

  // Avioneta liviana estacionada en la plataforma; fuselaje, alas, cola y tren de aterrizaje.
  const planeX = -65.4, planeZ = -164.5;
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


function addSchoolAndFootballField(m:MeshBuilder){
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
    for(let z=ff;z<=fn;z+=6.5)m.box([x,terrainSurfaceY(x,z)+fh/2,z],[.1,fh,.1],hex("#4c5555"));
    for(const h of [.42,1.18,fh])m.beam([x,h,ff],[x,h,fn],.03,hex("#7c8580"));
    for(let z=ff;z<fn;z+=3.3){m.beam([x,.4,z],[x,fh,z+1.65],.018,hex("#9aa09a"));m.beam([x,fh,z],[x,.4,z+1.65],.018,hex("#9aa09a"));}
  }
  for(const z of [ff,fn]){
    for(let x=fl;x<=fr;x+=6)m.box([x,terrainSurfaceY(x,z)+fh/2,z],[.1,fh,.1],hex("#4c5555"));
    for(const h of [.42,1.18,fh])m.beam([fl,h,z],[fr,h,z],.03,hex("#7c8580"));
  }
  for(const x of [cx-3,cx+3])m.beam([x,0,ff],[x,2,ff],.06,hex("#d0d0c8"));
  for(const x of [l-4,r+4]){m.box([x,4,cz],[.16,8,.16],hex("#4a5053"));m.box([x,7.8,cz],[.42,.22,.32],hex("#f1d5a0"));}
  // Escuela barrial detrás de la cancha.
  const sx=-141,sz=-166,gy=terrainSurfaceY(sx,sz);
  m.box([sx,gy+2.45,sz],[24,4.9,28],hex("#d5c5a1"),hex("#b7aa8c"));
  m.box([sx,gy+4.98,sz],[24.8,.38,28.8],hex("#a5503d"),hex("#713f36"));
  m.box([sx+12.08,gy+.72,sz],[.16,1.44,27.2],hex("#78796c"));
  for(const z of [-176,-169,-161,-154]){m.box([sx+12.18,gy+2.85,z],[.11,1.42,2.15],hex("#344f60"));m.box([sx+12.25,gy+2.85,z],[.035,1.14,1.8],hex("#9bb6b9"));}
  m.box([sx+12.22,gy+1.45,sz+1],[.28,2.9,3],hex("#72513c"));m.box([sx+12.95,gy+2.95,sz],[1.5,.18,4.8],hex("#36566a"));
  for(let i=0;i<3;i++)m.box([sx+13+i*.38,gy+.12+i*.13,sz],[.8,.24,3.4],hex("#afa58e"));
  m.box([sx+12.36,gy+4.35,sz],[.14,.72,7.6],hex("#244b60"));addPixelTextYZ(m,"ESCUELA",gy+4.25,sz,sx+12.44,.075,hex("#f2eddb"));
  m.quad([sx+12.1,gy+.025,sz-11],[sx+12.1,gy+.025,sz+11],[sx+14.2,gy+.025,sz+11],[sx+14.2,gy+.025,sz-11],hex("#777466"));
  m.box([sx+16,gy+3.5,sz-12],[.12,7,.12],hex("#6a6656"));m.beam([sx+16,gy+6.7,sz-12],[sx+18.8,gy+6,sz-12],.12,hex("#f1e6cf"));
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

function buildRoadsideJuggler(){
  const m=new MeshBuilder(),shirt=hex("#bd6d3c"),pants=hex("#343947"),skin=hex("#c99576"),dark=hex("#272d31");
  m.box([0,1.12,0],[.48,.7,.32],shirt,dark);m.box([0,.76,0],[.4,.2,.29],pants);
  m.box([0,1.67,0],[.29,.32,.29],skin);m.box([0,1.84,-.025],[.31,.1,.29],hex("#3e302b"));
  m.beam([-.18,1.36,0],[-.48,1.72,-.02],.13,shirt);m.beam([-.48,1.72,-.02],[-.67,2.04,-.06],.085,skin);
  m.beam([.18,1.36,0],[.48,1.72,-.02],.13,shirt);m.beam([.48,1.72,-.02],[.67,2.04,-.06],.085,skin);
  m.beam([-.12,.68,0],[-.2,.2,-.08],.14,pants);m.beam([.12,.68,0],[.2,.2,.08],.14,pants);
  m.box([-.2,.1,-.15],[.27,.13,.38],dark);m.box([.2,.1,.13],[.27,.13,.38],dark);return m;
}
function buildJugglingBall(color:string){const m=new MeshBuilder();m.sphere(0,0,0,.135,hex(color),14,9);return m;}
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
  const destinationSignZ = -53;

  // Terreno patagónico nocturno: relieve poligonal y valores oscuros para que destaque la luz del auto.
  const xSteps = 48, zSteps = 106;
  for (let zi = 0; zi < zSteps; zi++) {
    const z0 = -304 + (zi / zSteps) * 322;
    const z1 = -304 + ((zi + 1) / zSteps) * 322;
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
  for (let z = -292; z < 17; z += 2.5) {
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
    for (let z = -289; z < 15; z += 4.2) {
      const x = roadCenter(z) + side * 4.72;
      world.box([x, roadHeightAt(z) + 0.49, z], [0.14, 0.98, 0.14], hex("#555d5e"));
    }
    for (let z = -289; z < 14; z += 4.2) {
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
    for (let z = -178; z >= -288; z -= 5.2) {
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
    for (let z = -180; z >= -287; z -= 8.4) {
      if (side < 0 && z < -74 && z > -258) continue;
      const x = roadCenter(z) + side * (8.2 + random() * 2.6);
      const y = roadHeightAt(z) - 1.4 - random() * 0.8;
      const height = 5.2 + random() * 5.5;
      addPine(world, x, z, y, height, Math.floor(random() * 1000));
    }
    for (let z = -184; z >= -286; z -= 13.5) {
      if (side < 0 && z < -74 && z > -258) continue;
      const x = roadCenter(z) + side * (18 + random() * 6.2);
      const y = roadHeightAt(z) - 6.2 - random() * 0.7;
      addPine(world, x, z, y, 6.5 + random() * 5.5, Math.floor(random() * 1000));
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
    for (let i = 0; i < 22; i++) {
      const z = 7 - i * 14;
      if (side < 0 && z < -74 && z > -258) continue;
      const x = roadCenter(z) + poleOffset;
      const y = roadHeightAt(z) - 0.18;
      world.box([x, y + 4.3, z], [0.24, 8.6, 0.24], hex("#40372d"));
      world.box([x, y + 7.7, z], [2.7, 0.16, 0.16], hex("#4a4035"));
      world.box([x - 0.78, y + 7.45, z], [0.1, 0.7, 0.1], hex("#3d352d"));
      world.box([x + 0.78, y + 7.45, z], [0.1, 0.7, 0.1], hex("#3d352d"));
      if (i < 21) {
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

  const destinationX = roadCenter(destinationSignZ) + 12.6;
  const destinationGround = terrainY(destinationX, destinationSignZ);
  const destinationY = destinationGround + 4.0;
  for (const dx of [-3.4, 3.4]) {
    world.box([destinationX + dx, destinationGround + 1.65, destinationSignZ], [0.24, 3.3, 0.24], hex("#514638"));
  }
  world.box([destinationX, destinationY, destinationSignZ], [9.25, 2.75, 0.32], hex("#102f35"), hex("#1c5a4a"));
  world.box([destinationX, destinationY + 1.18, destinationSignZ + 0.19], [8.95, 0.06, 0.04], hex("#d3c28f"));
  world.box([destinationX, destinationY - 1.18, destinationSignZ + 0.19], [8.95, 0.06, 0.04], hex("#d3c28f"));
  world.box([destinationX, destinationY + 1.4, destinationSignZ + 0.2], [1.0, 0.12, 0.08], hex("#f4d8a1"));
  addPixelText(world, "EL BOLSÓN", destinationX, destinationY + 0.48, destinationSignZ + 0.23, 0.145, hex("#fff3db"));
  addPixelText(world, "2 KILÓMETROS", destinationX, destinationY - 0.55, destinationSignZ + 0.23, 0.11, hex("#fff3db"));
  addYPFStation(world);

  const signalZ=-208,signalX=roadCenter(signalZ)+4.65,signalGround=roadHeightAt(signalZ)-.18;
  world.box([signalX,signalGround+3.1,signalZ],[.2,6.2,.2],hex("#42484a"));
  world.beam([signalX,signalGround+6.2,signalZ],[signalX-1.3,signalGround+6.2,signalZ],.18,hex("#42484a"));
  world.box([signalX,signalGround+5.45,signalZ],[.92,2.35,.66],hex("#20272b"),hex("#394044"));
  world.sphere(signalX,signalGround+6.12,signalZ+.36,.235,hex("#4b2020"),16,9);
  world.sphere(signalX,signalGround+5.45,signalZ+.36,.235,hex("#514425"),16,9);
  world.sphere(signalX,signalGround+4.78,signalZ+.36,.235,hex("#1d432c"),16,9);
  world.box([roadCenter(-213),roadHeightAt(-213)-.1,-213],[8.6,.055,.18],hex("#e7dfce"));
  return world;
}


function buildSkyDressing() {
  const sky=new MeshBuilder(),random=randomSource(9041);
  // Atardecer naranja con sol bajo y halo cálido.
  sky.disc(-45,52,-420,9.0,hex("#b94f3b"),48);sky.disc(-45,52,-419.7,6.8,hex("#e36f49"),48);
  sky.disc(-45,52,-419.4,4.7,hex("#f5a15f"),48);sky.disc(-45,52,-419.1,2.9,hex("#ffe0a4"),48);
  const clouds=[[-59,31,-278,22,4,4.8],[-43,34,-279,18,4.4,4.8],[-26,32,-280,18,3.4,4.2],[-5,34,-282,23,4.2,5],[20,36,-282,19,4.3,5],[41,33,-280,20,3.4,4.6],[61,29,-278,18,3,4.4]];
  for(let i=0;i<clouds.length;i++){const [x,y,z,w,h,d]=clouds[i]!;sky.box([x,y,z],[w,h,d],hex("#65515a"),hex("#514957"));sky.box([x-w*.18,y+h*.22,z-.08],[w*.52,h*.58,d*.88],hex("#bd735d"));sky.box([x+w*.22,y+h*.18,z+.05],[w*.48,h*.48,d*.9],i%2?hex("#e08a5d"):hex("#ca795d"));}
  const peaks=[[-154,-8],[-128,5],[-106,-4],[-82,23],[-61,-6],[-39,13],[-17,42],[8,5],[32,31],[56,-5],[77,20],[101,-5],[126,14],[154,-8]];
  for(let i=0;i<peaks.length-1;i++){const [x0,y0]=peaks[i]!,[x1,y1]=peaks[i+1]!,px=(x0+x1)*.5,py=Math.max(y0,y1)+11+random()*8,shade=i%3===0?hex("#3b354b"):i%3===1?hex("#514052"):hex("#414057");sky.triangle([x0,-11,-286],[px,py,-292],[x1,-11,-286],shade);sky.triangle([x0,-11,-286.2],[px,Math.max(0,py*.5),-291.9],[x1,-11,-286.2],hex("#6d5360"));}
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
    car.box([x, 0.57, -2.17], [0.33, 0.18, 0.12], hex("#e5d3a2"));
    car.box([x, 0.55, 2.2], [0.33, 0.16, 0.1], hex("#a4463d"));
  }
  car.box([0, 0.81, 2.18], [1.1, 0.08, 0.12], hex("#171e24"));
  return car;
}

function buildHeadlights() {
  const lights = new MeshBuilder();
  const warm = hex("#c4a77a");
  lights.triangle([-0.45, 0.2, -2.1], [-5.3, 0.16, -39], [-0.2, 0.16, -39], warm);
  lights.triangle([0.45, 0.2, -2.1], [0.2, 0.16, -39], [5.3, 0.16, -39], warm);
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

  // Volante poligonal más grueso, con radios, centro acolchado y costuras.
  cockpit.torusXY(0, 1.03, -0.88, 0.48, 0.075, hex("#080c10"));
  cockpit.torusXY(0, 1.03, -0.88, 0.48, 0.018, hex("#555a58"));
  cockpit.beam([0, 1.03, -0.87], [0, 0.66, -0.87], 0.095, hex("#11171b"));
  cockpit.beam([0, 1.03, -0.87], [-0.34, 1.22, -0.87], 0.085, hex("#11171b"));
  cockpit.beam([0, 1.03, -0.87], [0.34, 1.22, -0.87], 0.085, hex("#11171b"));
  cockpit.box([0, 1.03, -0.83], [0.29, 0.25, 0.12], hex("#30383b"), hex("#161d21"));
  cockpit.box([0, 1.03, -0.755], [0.17, 0.14, 0.035], hex("#77756a"));
  cockpit.box([0, 1.03, -0.73], [0.11, 0.09, 0.018], hex("#30383b"));
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const x1 = Math.cos(a) * 0.475;
    const y1 = 1.03 + Math.sin(a) * 0.475;
    const x2 = Math.cos(a + 0.055) * 0.475;
    const y2 = 1.03 + Math.sin(a + 0.055) * 0.475;
    cockpit.beam([x1, y1, -0.795], [x2, y2, -0.795], 0.012, hex("#8a8170"));
  }

  // Brazos más naturales: mangas, costuras, puños, palmas y dedos separados.
  for (const side of [-1, 1]) {
    const palmX = side * 0.37;
    const sleeveColor = hex("#202b35");
    const sleeveLight = hex("#394753");
    const cuff = hex("#65727a");
    const skin = hex("#b78364");
    const fingerSkin = hex("#c99575");
    cockpit.beam([side * 1.42, 0.68, -1.03], [side * 0.53, 1.11, -0.88], 0.37, sleeveColor);
    cockpit.beam([side * 1.16, 0.82, -0.98], [side * 0.62, 1.09, -0.86], 0.105, sleeveLight);
    cockpit.box([side * 0.54, 1.12, -0.84], [0.18, 0.25, 0.25], cuff, hex("#39434a"));
    cockpit.beam([side * 0.52, 1.13, -0.84], [palmX, 1.17, -0.79], 0.15, hex("#a77a60"));
    cockpit.box([palmX, 1.17, -0.79], [0.29, 0.19, 0.17], skin, hex("#855b49"));
    // Cuatro dedos articulados: falange proximal, distal y punta, separados entre sí.
    for (let finger = 0; finger < 4; finger++) {
      const fingerX = palmX + side * ((finger - 1.5) * 0.061);
      const length = 0.13 - Math.abs(finger - 1.5) * 0.012;
      const knuckle: V3 = [fingerX, 1.13, -0.69];
      const joint: V3 = [fingerX + side * 0.012, 1.07, -0.61];
      const tip: V3 = [fingerX + side * 0.018, 1.025 - (0.13 - length) * 0.35, -0.565];
      cockpit.beam(knuckle, joint, 0.052, fingerSkin);
      cockpit.beam(joint, tip, 0.045, hex("#d4a080"));
      cockpit.box([joint[0], joint[1], joint[2]], [0.052, 0.045, 0.045], fingerSkin);
      cockpit.box([tip[0], tip[1], tip[2]], [0.042, 0.035, 0.035], hex("#e1b596"));
    }
    // Pulgar enfrentado a los dedos, con dos segmentos y una articulación visible.
    const thumbBase: V3 = [palmX - side * 0.13, 1.16, -0.77];
    const thumbJoint: V3 = [palmX - side * 0.19, 1.1, -0.68];
    const thumbTip: V3 = [palmX - side * 0.16, 1.045, -0.62];
    cockpit.beam(thumbBase, thumbJoint, 0.075, skin);
    cockpit.beam(thumbJoint, thumbTip, 0.062, fingerSkin);
    cockpit.box(thumbTip, [0.07, 0.055, 0.05], hex("#d09b7a"));
    cockpit.beam([side * 0.48, 1.08, -0.7], [side * 0.61, 1.1, -0.7], 0.018, hex("#87959a"));
  }

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

  // Techo elevado y más fino: deja respirar el parabrisas y mantiene visible el marco al mirar 360°.
  cockpit.box([0, 2.57, -3.48], [3.48, 0.13, 1.72], hex("#303a40"), hex("#202930"));
  cockpit.box([0, 2.57, 0.55], [3.48, 0.13, 2.72], hex("#303a40"), hex("#202930"));
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
varying vec3 vColor;
varying vec3 vNormal;
varying float vDepth;
varying vec3 vWorldPosition;
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vec4 viewPosition = uView * world;
  vDepth = length(viewPosition.xyz);
  vNormal = mat3(uModel) * aNormal;
  vWorldPosition = world.xyz;
  vColor = aColor;
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
  float beamWidth = 0.72 + ahead * 0.19;
  float beamSide = 1.0 - smoothstep(beamWidth * 0.68, beamWidth, abs(fromHeadlight.x));
  float beamDistance = 1.0 - smoothstep(5.0, 48.0, ahead);
  float beamHeight = 1.0 - smoothstep(0.8, 5.8, fromHeadlight.y);
  float headlight = beamSide * beamDistance * beamHeight * smoothstep(0.0, 3.0, ahead);
  light += headlight * 1.12;

  vec3 color = vColor * light * vec3(1.10, 0.94, 0.83);
  color += vec3(1.0, 0.72, 0.43) * headlight * 0.46;
  float emissive = smoothstep(0.70, 0.96, max(max(vColor.r, vColor.g), vColor.b));
  color += vColor * emissive * 0.28;
  vec3 highlights = max(color - vec3(0.52, 0.56, 0.62), vec3(0.0));
  color += highlights * 0.24;
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
  gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
}


type EngineAudio = {
  context: AudioContext; oscillator: OscillatorNode; secondOscillator: OscillatorNode;
  filter: BiquadFilterNode; gain: GainNode;
  roadNoise: AudioBufferSourceNode; roadFilter: BiquadFilterNode; roadGain: GainNode;
  setThrottle: (value: number) => void; setRoadSpeed: (value: number) => void;
  stop: () => void; destroy: () => void;
};
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
  const blackRef = useRef<HTMLDivElement | null>(null);
  const endingTitleRef = useRef<HTMLDivElement | null>(null);
  const gameHudRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const speedRef = useRef<HTMLSpanElement | null>(null);
  const mouseSensitivityRef = useRef(0.00235);
  const [mouseSensitivity, setMouseSensitivity] = useState(0.00235);
  const keysRef = useRef<Set<string>>(new Set());
  const stageRef = useRef<"driving" | "climbing" | "signalJuggle" | "signalWarning" | "escape" | "finished" | "crashed">("driving");
  const engineAudioRef = useRef<EngineAudio | null>(null);
  const [interactionStage, setInteractionStage] = useState<"driving" | "climbing" | "signalJuggle" | "signalWarning" | "escape" | "finished" | "crashed">("driving");
  const [fallback, setFallback] = useState(false);
  const setStage = (next: "driving" | "climbing" | "signalJuggle" | "signalWarning" | "escape" | "finished" | "crashed") => {
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
    let signalJuggleStartedAt=0,signalWarningStartedAt=0,escapeStartedAt=0,npcImpactAt=0;
    let escapeStartCarZ=-202,escapeStartCarX=0,npcImpactX=0,npcImpactZ=-207;
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
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowleft", "arrowright", "arrowup", "arrowdown", "q"].includes(key)) {
        if (key.startsWith("arrow")) event.preventDefault();
        keys.add(key);
      }
      if (key === "w" && (stageRef.current === "driving" || stageRef.current === "climbing") &&
        (stageRef.current === "climbing" || performance.now() - startedAt >= DURATION * 1000)) startEngineAudio();
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
        if ((stageRef.current === "driving" && performance.now() - startedAt >= DURATION * 1000) || stageRef.current === "climbing") {
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
    let skyMesh: Mesh | null = null;
    let carMesh: Mesh | null = null;
    let lightMesh: Mesh | null = null;
    let cockpitMesh: Mesh | null = null;
    let windshieldMesh: Mesh | null = null;
    let pathActors: Array<{mesh:Mesh;baseZ:number;speed:number;lateral:number;reverse:boolean}> = [];
    let trafficActors: Array<{mesh:Mesh;baseZ:number;speed:number}> = [];
    let footballActors: Array<{mesh:Mesh;baseX:number;baseZ:number;phase:number;speed:number;radiusX:number;radiusZ:number}> = [];
    let footballBallMesh: Mesh | null = null;
    let jugglerMesh: Mesh | null = null;
    let jugglingBallMeshes: Mesh[] = [];
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
      skyMesh = createMesh(gl, buildSkyDressing());
      carMesh = createMesh(gl, buildCar());
      lightMesh = createMesh(gl, buildHeadlights());
      cockpitMesh = createMesh(gl, buildCockpit());
      windshieldMesh = createMesh(gl, buildWindshield());
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
        baseX:p.x,baseZ:p.z,phase:p.phase,speed:p.speed,radiusX:p.rx,radiusZ:p.rz,
      }));
      footballBallMesh=createMesh(gl,buildFootballBall());
      jugglerMesh=createMesh(gl,buildRoadsideJuggler());
      jugglingBallMeshes=[
        createMesh(gl,buildJugglingBall("#df5545")),
        createMesh(gl,buildJugglingBall("#e7bd50")),
        createMesh(gl,buildJugglingBall("#5c91b1")),
      ];
      signalRedMesh=createMesh(gl,buildJugglingBall("#ff312b"));
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
      if (!active || !program || !worldMesh || !carMesh || !lightMesh || !cockpitMesh || !windshieldMesh) return;
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
        if(throttle)driveSpeed=Math.min(5.4,driveSpeed+dt*(2.25-uphillPenalty));
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
        if(climbElapsed>=8.6){driveSpeed=0;signalJuggleStartedAt=now;keys.clear();engineAudioRef.current?.stop();setStage("signalJuggle");}
      }
      if(stageRef.current==="signalJuggle"){
        driveSpeed=0;
        if(now-signalJuggleStartedAt>=3000){signalWarningStartedAt=now;setStage("signalWarning");}
      }
      if(stageRef.current==="signalWarning"){
        driveSpeed=0;
        if(now-signalWarningStartedAt>=3200){
          escapeStartedAt=now;escapeStartCarZ=roadZForPhysics;escapeStartCarX=roadCenter(escapeStartCarZ)+laneOffset;
          npcImpactZ=escapeStartCarZ-4;npcImpactX=roadCenter(npcImpactZ)+laneOffset;
          driveSpeed=8.8;keys.clear();startEngineAudio();engineAudioRef.current?.setThrottle(.98);setStage("escape");
        }
      }
      if(stageRef.current==="escape"){
        const escapeAge=(now-escapeStartedAt)/1000;
        driveSpeed=Math.min(9.4,driveSpeed+dt*4.2);travelled+=driveSpeed*dt;
        if(npcImpactAt===0&&escapeAge>=.34)npcImpactAt=now;
        if(escapeAge>=10){driveSpeed=0;keys.clear();if(document.pointerLockElement)document.exitPointerLock();engineAudioRef.current?.stop();setStage("finished");}
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

      const carZ = elapsed < DURATION ? -elapsed * 4.1 : -DURATION * 4.1 - travelled;
      const carX = roadCenter(carZ) + laneOffset;
      const carY = roadHeightAt(carZ) - 0.18;
      gl.uniform3f(headlightLocation, carX, carY + 0.48, carZ - 2.08);

      // Choque por volumen de ambos autos: invadir el carril contrario puede terminar en accidente.
      if (crashStartedAt === 0 && elapsed >= DURATION &&
        (stageRef.current === "driving" || stageRef.current === "climbing" || stageRef.current === "escape")) {
        const collision = trafficActors.some((traffic) => {
          const span = 308;
          const raw = traffic.baseZ + elapsed * traffic.speed;
          const trafficZ = -294 + (((raw + 294) % span) + span) % span;
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
      const hitShake=npcImpactAt>0?(1-smooth(0,.62,(now-npcImpactAt)/1000))*.045:0;
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
      const eye = cockpitEye;
      const target = cockpitTarget;
      const fov = mix(49, 66, transition) * Math.PI / 180;
      const projection = perspective(fov, width / height, 0.1, 520);
      const cameraUp: V3 = [
        Math.sin(now * 0.021) * shake * 0.16,
        1,
        Math.sin(now * 0.017) * shake * 0.12,
      ];
      const view = lookAt(eye, target, cameraUp);
      const viewProjection = multiply(projection, view);
      const identity = translation(0, 0, 0);
      bindMesh(gl, program, worldMesh, viewProjection, view, identity);
      if (skyMesh) bindMesh(gl, program, skyMesh, viewProjection, view, identity);
      // Ciclistas, peatones y corredores recorren la bicisenda en ambos sentidos.
      for(const actor of pathActors){
        const span=168,raw=actor.baseZ+elapsed*actor.speed,z=-252+(((raw+252)%span)+span)%span;
        const x=roadCenter(z)-12.1+actor.lateral,y=terrainSurfaceY(x,z)+.035;
        const model=multiply(translation(x,y,z),rotationY(actor.reverse?Math.PI:0));
        bindMesh(gl,program,actor.mesh,viewProjection,view,model);
      }
      // Autos que vienen de frente por el carril opuesto.
      for(const traffic of trafficActors){
        const span=308,raw=traffic.baseZ+elapsed*traffic.speed,z=-294+(((raw+294)%span)+span)%span;
        const x=roadCenter(z)-2.15,y=roadHeightAt(z)-.16;
        const model=multiply(translation(x,y,z),rotationY(Math.PI));
        bindMesh(gl,program,traffic.mesh,viewProjection,view,model);
      }
      // Partido informal de dos equipos, con jugadores que se mueven por el campo.
      for(const player of footballActors){
        const phase=elapsed*player.speed+player.phase;
        const x=player.baseX+Math.sin(phase)*player.radiusX;
        const z=player.baseZ+Math.cos(phase*.82)*player.radiusZ;
        const y=terrainSurfaceY(x,z)+.035;
        const facing=Math.atan2(Math.cos(phase)*player.radiusX,-Math.sin(phase*.82)*player.radiusZ*.82);
        const model=multiply(translation(x,y,z),rotationY(facing));
        bindMesh(gl,program,player.mesh,viewProjection,view,model);
      }
      // Pelota que rueda y da pequeños saltos durante el partido.
      if(footballBallMesh){
        const ballX=-107+Math.sin(elapsed*1.08)*5.5;
        const ballZ=-166+Math.cos(elapsed*1.42)*8.5;
        const ballY=terrainSurfaceY(ballX,ballZ)+.24+Math.abs(Math.sin(elapsed*4.8))*.12;
        const ballModel=multiply(translation(ballX,ballY,ballZ),rotationY(elapsed*3.1));
        bindMesh(gl,program,footballBallMesh,viewProjection,view,ballModel);
      }

      const carRotation=multiply(rotationY(steeringAngle),rotationX(uphillPitch));
      const carModel=multiply(translation(carX,carY,carZ),carRotation);
      const aerialVisibility = 1 - smooth(5.1, 5.95, elapsed);
      const signalZ=-208,signalX=roadCenter(signalZ)+4.65,signalGround=roadHeightAt(signalZ)-.18;
      const signalActive=["signalJuggle","signalWarning","escape"].includes(stageRef.current);
      if(signalActive&&signalRedMesh){
        const redModel=multiply(translation(signalX,signalGround+6.12,signalZ+.39),scaling(1.75,1.75,1.75));
        bindMesh(gl,program,signalRedMesh,viewProjection,view,redModel);
      }
      if(["signalJuggle","signalWarning","escape"].includes(stageRef.current)&&jugglerMesh){
        const approach=stageRef.current==="signalWarning"?smooth(0,1.3,(now-signalWarningStartedAt)/1000):stageRef.current==="escape"?1:0;
        let npcX=mix(signalX,carX+2,approach),npcZ=mix(signalZ+1.65,carZ+.28,approach);
        let npcY=terrainSurfaceY(npcX,npcZ)+.04,npcRotation=rotationY(Math.PI);
        if(stageRef.current==="escape"){
          const escapeAge=Math.max(0,(now-escapeStartedAt)/1000);
          if(npcImpactAt===0){
            const crossing=smooth(.04,.34,escapeAge);
            npcX=mix(escapeStartCarX+2,npcImpactX,crossing);
            npcZ=mix(escapeStartCarZ+.28,npcImpactZ,crossing);
            npcY=terrainSurfaceY(npcX,npcZ)+.04;
          }else{
            const hitAge=(now-npcImpactAt)/1000,fall=smooth(0,.42,hitAge);
            npcX=npcImpactX+2.3*fall;npcZ=npcImpactZ+fall;
            npcY=terrainSurfaceY(npcX,npcZ)+.13+Math.sin(Math.min(hitAge,.58)/.58*Math.PI)*1.1*(1-smooth(.5,.95,hitAge));
            npcRotation=multiply(rotationY(Math.PI),rotationZ(1.42*fall));
          }
        }
        const npcModel=multiply(translation(npcX,npcY,npcZ),npcRotation);
        bindMesh(gl,program,jugglerMesh,viewProjection,view,npcModel);
        if(stageRef.current==="signalJuggle"){
          const routineAge=(now-signalJuggleStartedAt)/1000;
          for(let i=0;i<jugglingBallMeshes.length;i++){
            const phase=routineAge*5.8+i*Math.PI*2/3;
            const bx=signalX+Math.sin(phase)*.48,by=signalGround+2.2+Math.max(0,Math.sin(phase))*.72,bz=signalZ+1.55+Math.cos(phase)*.16;
            bindMesh(gl,program,jugglingBallMeshes[i]!,viewProjection,view,translation(bx,by,bz));
          }
        }
      }
      if(npcImpactAt>0&&bloodMesh){
        const bloodAge=(now-npcImpactAt)/1000,opacity=1-smooth(.7,2.1,bloodAge);
        if(opacity>.01){
          const bloodX=npcImpactX+1.15,bloodZ=npcImpactZ+1;
          const bloodModel=translation(bloodX,terrainSurfaceY(bloodX,bloodZ)+.045,bloodZ);
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
        bindMesh(gl, program, lightMesh, viewProjection, view, carModel, 0.10);
        bindMesh(gl, program, cockpitMesh, viewProjection, view, carModel);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        bindMesh(gl, program, windshieldMesh, viewProjection, view, carModel, 0.19);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
      }

      if (engineAudioRef.current) {
        if ((stageRef.current === "driving" || stageRef.current === "climbing" || stageRef.current === "escape") &&
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
      if (blackRef.current) {
        const fadeToPlay = smooth(11.6, 12.45, elapsed) * (1 - smooth(13.05, 13.9, elapsed));
        blackRef.current.style.opacity = String(fadeToPlay * 0.985);
      }
      if (endingTitleRef.current) {
        endingTitleRef.current.style.opacity = String(
          smooth(12.25, 12.75, elapsed) * (1 - smooth(13.28, 13.92, elapsed)),
        );
      }
      if (gameHudRef.current) {
        gameHudRef.current.style.opacity = String(
          smooth(DURATION + 0.1, DURATION + 0.9, elapsed) *
          (stageRef.current === "driving" || stageRef.current === "climbing" || stageRef.current === "escape" ? 1 : 0),
        );
      }
      if (progressRef.current) {
        const progress = stageRef.current === "escape" ? (now-escapeStartedAt)/10000 : stageRef.current === "climbing" ? climbElapsed/8.6 : driveElapsed/20;
        progressRef.current.style.width = String(clamp(progress, 0, 1) * 100) + "%";
      }
      if (speedRef.current) speedRef.current.textContent = String(Math.round(driveSpeed * 19));

      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);
    return () => {
      active = false;
      keys.clear();
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
      if (skyMesh) gl.deleteBuffer(skyMesh.buffer);
      if (carMesh) gl.deleteBuffer(carMesh.buffer);
      if (lightMesh) gl.deleteBuffer(lightMesh.buffer);
      if (cockpitMesh) gl.deleteBuffer(cockpitMesh.buffer);
      if (windshieldMesh) gl.deleteBuffer(windshieldMesh.buffer);
      if (crashExplosionMesh) gl.deleteBuffer(crashExplosionMesh.buffer);
      if(jugglerMesh)gl.deleteBuffer(jugglerMesh.buffer);
      for(const ball of jugglingBallMeshes)gl.deleteBuffer(ball.buffer);
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
        ref={blackRef}
        className="pointer-events-none absolute inset-0 z-20 bg-[#030507]"
        style={{ opacity: 0 }}
      />
      <div
        ref={endingTitleRef}
        className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
        style={{ opacity: 0 }}
      >
        <div className="text-center">
          <p className="font-serif text-4xl tracking-[0.16em] text-[#f0d8bd] drop-shadow-[0_0_32px_rgba(255,170,105,0.55)] sm:text-6xl">
            EL BOLSÓN · RÍO NEGRO
          </p>
          <div className="mx-auto mt-5 h-px w-28 bg-[#c28e69]/70" />
        </div>
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
      {interactionStage === "signalJuggle" && (
        <div className="pointer-events-none absolute inset-x-4 bottom-[13%] z-40 flex justify-center">
          <div className="border border-amber-100/25 bg-[#101820]/80 px-5 py-3 text-center font-mono text-[10px] tracking-[.22em] text-amber-50/90 shadow-[0_0_32px_rgba(0,0,0,.4)] backdrop-blur-md">
            EL SEMÁFORO ESTÁ EN ROJO
          </div>
        </div>
      )}
      {interactionStage === "signalWarning" && (
        <div className="pointer-events-none absolute inset-x-4 bottom-[10%] z-40 flex justify-center">
          <div className="w-full max-w-2xl border border-amber-100/35 bg-[#101820]/90 px-6 py-5 text-center shadow-[0_0_48px_rgba(0,0,0,.58)] backdrop-blur-md">
            <p className="font-mono text-[9px] tracking-[.34em] text-amber-200/80">EL HOMBRE SE ACERCA A LA VENTANILLA</p>
            <p className="mt-3 font-serif text-lg leading-relaxed text-[#fff0d8] sm:text-2xl">“TENE CUIDADO HOY A LA NOCHE VIENEN ELLOS, TIENES QUE ESCONDERTE”</p>
          </div>
        </div>
      )}
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
