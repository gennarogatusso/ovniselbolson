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
  return Math.sin(z * 0.023) * 1.7 + Math.sin(z * 0.061) * 0.5;
}

function roadHeightAt(z: number) {
  const progress = clamp((-z - 174) / 105, 0, 1);
  const eased = progress * progress * (3 - 2 * progress);
  return 0.18 + eased * 15.5;
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

  // Playero de YPF: uniforme con bolsillos, pantalón, botas, gorra y rostro definido.
  const attendantX = 16.1;
  const attendantZ = -164.7;
  const attendantGround = terrainY(attendantX, attendantZ);
  const skinTone = hex("#b98768");
  const skinLight = hex("#d2a184");
  const navy = hex("#064f83");
  const uniform = hex("#0875b9");
  const uniformLight = hex("#268dcc");
  const pants = hex("#24333e");
  const boots = hex("#141d25");
  const faceZ = attendantZ + 0.31;

  // Piernas, rodillas y zapatos de trabajo.
  mesh.box([attendantX - 0.2, attendantGround + 0.43, attendantZ], [0.27, 0.91, 0.34], pants);
  mesh.box([attendantX + 0.2, attendantGround + 0.43, attendantZ], [0.27, 0.91, 0.34], pants);
  mesh.box([attendantX - 0.22, attendantGround + 0.08, attendantZ + 0.13], [0.42, 0.18, 0.58], boots);
  mesh.box([attendantX + 0.22, attendantGround + 0.08, attendantZ + 0.13], [0.42, 0.18, 0.58], boots);

  // Torso del uniforme, cuello, solapas, cinturón y bolsillo.
  mesh.box([attendantX, attendantGround + 1.23, attendantZ], [0.92, 1.18, 0.53], uniform, navy);
  mesh.box([attendantX, attendantGround + 1.75, attendantZ + 0.03], [0.42, 0.18, 0.56], hex("#e3e9e8"));
  mesh.beam([attendantX - 0.12, attendantGround + 1.72, faceZ], [attendantX, attendantGround + 1.49, faceZ + 0.015], 0.045, hex("#e5eeee"));
  mesh.beam([attendantX + 0.12, attendantGround + 1.72, faceZ], [attendantX, attendantGround + 1.49, faceZ + 0.015], 0.045, hex("#e5eeee"));
  mesh.box([attendantX, attendantGround + 0.78, faceZ], [0.9, 0.11, 0.55], navy);
  mesh.box([attendantX - 0.27, attendantGround + 1.39, faceZ + 0.285], [0.23, 0.31, 0.035], uniformLight);
  mesh.box([attendantX - 0.27, attendantGround + 1.42, faceZ + 0.31], [0.16, 0.055, 0.025], white);
  addPixelText(mesh, "YPF", attendantX - 0.27, attendantGround + 1.4, faceZ + 0.34, 0.034, white);

  // Brazos: el derecho queda extendido hacia el cliente para recibir el pago.
  mesh.beam([attendantX - 0.43, attendantGround + 1.62, attendantZ], [attendantX - 0.76, attendantGround + 1.34, attendantZ + 0.08], 0.25, navy);
  mesh.beam([attendantX - 0.76, attendantGround + 1.34, attendantZ + 0.08], [attendantX - 1.25, attendantGround + 1.51, attendantZ + 0.16], 0.18, skinTone);
  mesh.box([attendantX - 1.31, attendantGround + 1.52, attendantZ + 0.18], [0.28, 0.16, 0.2], skinTone, skinLight);
  mesh.beam([attendantX + 0.43, attendantGround + 1.62, attendantZ], [attendantX + 0.7, attendantGround + 1.02, attendantZ + 0.1], 0.24, navy);
  mesh.beam([attendantX + 0.7, attendantGround + 1.02, attendantZ + 0.1], [attendantX + 0.72, attendantGround + 0.9, attendantZ + 0.25], 0.16, skinTone);
  mesh.box([attendantX + 0.72, attendantGround + 0.9, attendantZ + 0.29], [0.21, 0.14, 0.15], skinTone);

  // Cuello, cabeza, orejas, cabello, cejas, ojos, nariz y boca.
  mesh.box([attendantX, attendantGround + 1.9, attendantZ], [0.31, 0.31, 0.3], skinTone);
  mesh.box([attendantX, attendantGround + 2.3, attendantZ], [0.68, 0.77, 0.57], skinTone, hex("#a9765b"));
  mesh.box([attendantX - 0.37, attendantGround + 2.3, attendantZ], [0.13, 0.24, 0.18], skinLight);
  mesh.box([attendantX + 0.37, attendantGround + 2.3, attendantZ], [0.13, 0.24, 0.18], skinTone);
  mesh.box([attendantX, attendantGround + 2.61, attendantZ - 0.05], [0.64, 0.19, 0.52], hex("#42332e"));
  mesh.box([attendantX, attendantGround + 2.68, attendantZ - 0.06], [0.58, 0.13, 0.5], hex("#332a27"));
  mesh.box([attendantX - 0.15, attendantGround + 2.41, faceZ + 0.005], [0.12, 0.045, 0.045], hex("#64483d"));
  mesh.box([attendantX + 0.15, attendantGround + 2.41, faceZ + 0.005], [0.12, 0.045, 0.045], hex("#64483d"));
  mesh.box([attendantX - 0.15, attendantGround + 2.34, faceZ + 0.025], [0.06, 0.07, 0.045], hex("#242b30"));
  mesh.box([attendantX + 0.15, attendantGround + 2.34, faceZ + 0.025], [0.06, 0.07, 0.045], hex("#242b30"));
  mesh.box([attendantX, attendantGround + 2.24, faceZ + 0.06], [0.1, 0.16, 0.12], skinLight);
  mesh.box([attendantX, attendantGround + 2.08, faceZ + 0.055], [0.17, 0.035, 0.055], hex("#704b42"));

  // Gorra azul con visera y logo blanco de la estación.
  mesh.box([attendantX, attendantGround + 2.77, attendantZ], [0.77, 0.2, 0.63], uniform);
  mesh.box([attendantX, attendantGround + 2.69, faceZ + 0.18], [0.8, 0.07, 0.34], navy);
  mesh.box([attendantX, attendantGround + 2.78, faceZ + 0.32], [0.36, 0.1, 0.035], white);
  addPixelText(mesh, "YPF", attendantX, attendantGround + 2.78, faceZ + 0.35, 0.043, deepBlue);

  // Un detalle de reloj y una insignia en el uniforme.
  mesh.box([attendantX + 0.53, attendantGround + 1.32, attendantZ + 0.09], [0.12, 0.16, 0.12], hex("#aab7bd"));
  mesh.box([attendantX + 0.53, attendantGround + 1.32, attendantZ + 0.16], [0.08, 0.1, 0.025], hex("#273a46"));

  // Farol de playa y luminarias cálidas debajo de la marquesina.
  for (const x of [4.0, 18.8]) {
    mesh.box([x, ground + 5.1, stationZ], [0.08, 0.08, 0.9], hex("#f6dba8"));
  }
}


function buildWorld() {
  const world = new MeshBuilder();
  const random = randomSource(4081);
  const destinationSignZ = -53;

  // Terreno patagónico irregular: una malla triangulada, no una imagen de fondo.
  const xSteps = 36, zSteps = 106;
  for (let zi = 0; zi < zSteps; zi++) {
    const z0 = -304 + (zi / zSteps) * 322;
    const z1 = -304 + ((zi + 1) / zSteps) * 322;
    for (let xi = 0; xi < xSteps; xi++) {
      const x0 = -84 + (xi / xSteps) * 168;
      const x1 = -84 + ((xi + 1) / xSteps) * 168;
      const a: V3 = [x0, terrainY(x0, z0), z0];
      const b: V3 = [x0, terrainY(x0, z1), z1];
      const c: V3 = [x1, terrainY(x1, z1), z1];
      const d: V3 = [x1, terrainY(x1, z0), z0];
      const palette = random() > 0.56 ? hex("#29352f") : hex("#303a33");
      const shade = 0.88 + random() * 0.18;
      world.quad(a, b, c, d, [palette[0] * shade, palette[1] * shade, palette[2] * shade]);
    }
  }

  // Solo cordilleras laterales: el horizonte frontal queda despejado.
  addRoadsideMountainRange(world, -1, 31, 13, 46, 15);
  addRoadsideMountainRange(world, 1, 47, 13, 46, 15);
  addRoadsideMountainRange(world, -1, 71, 52, 84, 20);
  addRoadsideMountainRange(world, 1, 89, 52, 84, 20);

  // Banquinas, asfalto, marcas viales y pequeños parches de pavimento.
  for (let z = -292; z < 17; z += 2.5) {
    const next = z + 2.5;
    const c0 = roadCenter(z), c1 = roadCenter(next);
    const left0 = c0 - 4.15, right0 = c0 + 4.15;
    const left1 = c1 - 4.15, right1 = c1 + 4.15;
    const roadY0 = roadHeightAt(z);
    const roadY1 = roadHeightAt(next);
    world.quad([left0, roadY0, z], [left1, roadY1, next], [right1, roadY1, next], [right0, roadY0, z], hex("#383d40"));
    world.quad([c0 - 5.25, roadY0 - 0.05, z], [c1 - 5.25, roadY1 - 0.05, next], [left1, roadY1 - 0.05, next], [left0, roadY0 - 0.05, z], hex("#716d5e"));
    world.quad([right0, roadY0 - 0.05, z], [right1, roadY1 - 0.05, next], [c1 + 5.25, roadY1 - 0.05, next], [c0 + 5.25, roadY0 - 0.05, z], hex("#716d5e"));
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
      const x = roadCenter(z) + side * (6.1 + random() * 8.5);
      const height = 4.2 + random() * 6.4;
      addPine(world, x, z, terrainY(x, z), height, Math.floor(random() * 1000));
    }
    for (let i = 0; i < 21; i++) {
      const z = 7 - i * 6.9 - random() * 3;
      if (side === 1 && Math.abs(z - destinationSignZ) < 22) continue;
      const x = roadCenter(z) + side * (16 + random() * 23);
      const height = 5.5 + random() * 8;
      addPine(world, x, z, terrainY(x, z), height, Math.floor(random() * 1000));
    }
  }

  // Taludes rocosos que acompañan la pendiente y árboles pegados al camino.
  for (const side of [-1, 1]) {
    for (let z = -178; z >= -288; z -= 5.2) {
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
      const x = roadCenter(z) + side * (8.2 + random() * 2.6);
      const y = roadHeightAt(z) - 1.4 - random() * 0.8;
      const height = 5.2 + random() * 5.5;
      addPine(world, x, z, y, height, Math.floor(random() * 1000));
    }
    for (let z = -184; z >= -286; z -= 13.5) {
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
    const x = roadCenter(z) + side * (5.3 + random() * 9.5);
    const y = terrainY(x, z);
    if (i % 3 === 0) {
      world.cone(x, y, z, 0.5 + random() * 0.7, 0.55 + random() * 0.8, 5, hex("#28372d"));
    } else {
      const rock = hex(i % 2 ? "#545b57" : "#66675f");
      world.cone(x, y, z, 0.35 + random() * 0.65, 0.35 + random() * 0.65, 5, rock);
    }
  }

  // Postes de madera y cables a ambos lados de la Ruta 40.
  for (const side of [-1, 1]) {
    const poleOffset = side < 0 ? -11.5 : 15.8;
    for (let i = 0; i < 22; i++) {
      const z = 7 - i * 14;
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

  return world;
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
  const dark = hex("#171d22");
  const lighter = hex("#30373b");
  const skin = hex("#b78364");
  const sleeve = hex("#252f39");
  cockpit.box([0, 0.78, -1.78], [3.45, 0.52, 1.15], dark, lighter);
  cockpit.box([0, 0.99, -1.48], [3.35, 0.12, 0.72], hex("#252c31"));
  cockpit.box([0, 0.63, -3.6], [3.3, 0.32, 2.6], hex("#20282d"), hex("#141a20"));

  // Techo interior, parasol y espejo retrovisor.
  cockpit.box([0, 2.34, -3.35], [3.48, 0.17, 2.62], hex("#20272b"), hex("#11171c"));
  cockpit.box([0, 2.23, -2.22], [1.2, 0.09, 0.34], hex("#343a3d"));
  cockpit.box([0, 2.03, -4.42], [0.48, 0.12, 0.16], hex("#080d12"));
  cockpit.box([0, 1.93, -4.42], [0.62, 0.18, 0.08], hex("#30383c"));

  // Marco de parabrisas y pilares de las ventanillas.
  cockpit.beam([-1.62, 0.92, -2.15], [-1.78, 2.25, -4.65], 0.16, hex("#11181d"));
  cockpit.beam([1.62, 0.92, -2.15], [1.78, 2.25, -4.65], 0.16, hex("#11181d"));
  cockpit.beam([-1.78, 2.25, -4.65], [1.78, 2.25, -4.65], 0.16, hex("#11181d"));
  cockpit.beam([-1.62, 0.94, -2.15], [1.62, 0.94, -2.15], 0.11, hex("#1a2126"));
  cockpit.beam([-1.7, 1.05, -2.0], [-1.78, 1.68, -3.25], 0.055, hex("#47545a"));
  cockpit.beam([1.7, 1.05, -2.0], [1.78, 1.68, -3.25], 0.055, hex("#47545a"));

  // Volante y columna poligonales.
  cockpit.torusXY(0, 1.03, -0.88, 0.46, 0.055, hex("#080c10"));
  cockpit.beam([0, 1.03, -0.86], [0, 0.68, -0.88], 0.075, hex("#090d11"));
  cockpit.beam([0, 1.03, -0.86], [-0.3, 1.22, -0.88], 0.07, hex("#090d11"));
  cockpit.beam([0, 1.03, -0.86], [0.3, 1.22, -0.88], 0.07, hex("#090d11"));
  cockpit.box([0, 1.03, -0.88], [0.22, 0.2, 0.09], hex("#282f34"));

  // Brazos más naturales: mangas completas, costuras, puños, palmas y dedos separados.
  for (const side of [-1, 1]) {
    const palmX = side * 0.35;
    const sleeve = hex("#202b35");
    const sleeveLight = hex("#394753");
    const cuff = hex("#65727a");
    cockpit.beam([side * 1.42, 0.68, -1.03], [side * 0.53, 1.12, -0.87], 0.39, sleeve);
    cockpit.beam([side * 1.16, 0.82, -0.98], [side * 0.62, 1.10, -0.85], 0.11, sleeveLight);
    cockpit.box([side * 0.54, 1.13, -0.84], [0.19, 0.29, 0.3], cuff, hex("#39434a"));
    cockpit.beam([side * 0.52, 1.15, -0.84], [palmX, 1.19, -0.79], 0.18, hex("#a77a60"));
    cockpit.box([palmX, 1.2, -0.79], [0.34, 0.24, 0.2], skin, hex("#855b49"));
    // Nudillos y cuatro dedos que rodean el volante.
    for (let finger = 0; finger < 4; finger++) {
      const fingerX = palmX + side * ((finger - 1.5) * 0.075);
      const fingerTop = 1.24 - Math.abs(finger - 1.5) * 0.012;
      cockpit.beam([fingerX, fingerTop, -0.7], [fingerX + side * 0.018, 1.08, -0.59], 0.067, hex("#c18e70"));
      cockpit.box([fingerX, fingerTop - 0.015, -0.705], [0.074, 0.062, 0.065], hex("#d09b7a"));
      cockpit.box([fingerX + side * 0.018, 1.09, -0.59], [0.047, 0.038, 0.025], hex("#e1b596"));
    }
    // Pulgar por el lateral interno de cada mano.
    cockpit.beam([palmX - side * 0.13, 1.18, -0.73], [palmX - side * 0.19, 1.08, -0.64], 0.09, hex("#b17c60"));
    cockpit.box([palmX - side * 0.18, 1.08, -0.64], [0.09, 0.075, 0.06], hex("#d09b7a"));
    // Pliegues y costura del puño.
    cockpit.beam([side * 0.48, 1.08, -0.7], [side * 0.61, 1.1, -0.7], 0.018, hex("#87959a"));
  }

  // Tablero: dos relojes, velocímetro analógico y lectura digital en píxeles.
  cockpit.disc(-0.75, 0.92, -1.17, 0.22, hex("#090e12"));
  cockpit.disc(-0.75, 0.92, -1.155, 0.17, hex("#7b684d"));
  cockpit.disc(0.75, 0.92, -1.17, 0.22, hex("#090e12"));
  cockpit.disc(0.75, 0.92, -1.155, 0.17, hex("#7b684d"));
  for (let tick = 0; tick <= 10; tick++) {
    const angle = 0.12 + (tick / 10) * (Math.PI - 0.24);
    const outerX = 0.75 + Math.cos(angle) * 0.145;
    const outerY = 0.92 + Math.sin(angle) * 0.145;
    const innerX = 0.75 + Math.cos(angle) * 0.116;
    const innerY = 0.92 + Math.sin(angle) * 0.116;
    cockpit.beam([innerX, innerY, -1.125], [outerX, outerY, -1.125], 0.012, hex("#e0c89c"));
  }
  cockpit.beam([0.75, 0.92, -1.115], [0.64, 1.005, -1.105], 0.022, hex("#cf7756"));
  cockpit.disc(0.75, 0.92, -1.095, 0.025, hex("#d7c5a0"), 12);

  cockpit.box([0, 0.94, -1.16], [0.82, 0.36, 0.045], hex("#111b1f"));
  cockpit.box([0, 0.64, -1.13], [0.8, 0.08, 0.08], hex("#11171c"));
  // Número iluminado de velocidad: 064 km/h.
  addPixelText(cockpit, "064", 0, 1.0, -1.125, 0.027, hex("#dfc99b"));
  addPixelText(cockpit, "KM/H", 0, 0.81, -1.124, 0.014, hex("#a9b2a8"));
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
void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vec4 viewPosition = uView * world;
  vDepth = length(viewPosition.xyz);
  vNormal = mat3(uModel) * aNormal;
  vColor = aColor;
  gl_Position = uViewProjection * world;
}
`;

const FRAGMENT_SHADER = `
precision mediump float;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uFogColor;
uniform float uOpacity;
varying vec3 vColor;
varying vec3 vNormal;
varying float vDepth;
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
void main() {
  vec3 n = normalize(vNormal);
  vec3 sun = normalize(vec3(-0.38, 0.78, 0.42));
  float diffuse = max(dot(n, sun), 0.0);
  float ambient = 0.62 + max(n.y, 0.0) * 0.15;
  float light = ambient + diffuse * 0.48 + floor(diffuse * 4.0) * 0.035;
  vec3 color = vColor * light * vec3(1.11, 1.02, 0.91);
  color += vec3(0.045, 0.018, 0.004) * max(n.y, 0.0);
  float fog = smoothstep(76.0, 205.0, vDepth);
  color = mix(color, uFogColor, fog);
  float scan = 1.0 - 0.022 * (0.5 + 0.5 * sin(gl_FragCoord.y * 3.14159));
  float grain = (hash(floor(gl_FragCoord.xy * 0.72) + floor(uTime * 8.0)) - 0.5) * 0.022;
  float tearSeed = hash(vec2(floor(uTime * 0.82), 19.0));
  float tear = step(0.992, tearSeed) * step(0.0, 2.0 - abs(gl_FragCoord.y - mod(uTime * 53.0, max(uResolution.y, 1.0))));
  color = color * scan + grain + tear * 0.035;
  vec2 uv = gl_FragCoord.xy / max(uResolution, vec2(1.0));
  float vignette = 1.0 - smoothstep(0.2, 0.94, length((uv - 0.5) * vec2(1.0, 0.82)));
  color *= mix(0.66, 1.0, vignette);
  color += vec3(0.003, 0.0, 0.004);
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
  setThrottle: (value: number) => void; stop: () => void; destroy: () => void;
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
  return {
    context, oscillator, secondOscillator, filter, gain,
    setThrottle(value: number) {
      const amount = clamp(value, 0, 1), now = context.currentTime;
      oscillator.frequency.setTargetAtTime(48 + amount * 74, now, 0.09);
      secondOscillator.frequency.setTargetAtTime(31 + amount * 25, now, 0.12);
      filter.frequency.setTargetAtTime(150 + amount * 620, now, 0.14);
      gain.gain.setTargetAtTime(amount > 0 ? 0.035 + amount * 0.055 : 0, now, 0.18);
    },
    stop() { gain.gain.setTargetAtTime(0, context.currentTime, 0.24); },
    destroy() {
      try { oscillator.stop(); } catch { /* Ya detenido */ }
      try { secondOscillator.stop(); } catch { /* Ya detenido */ }
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
  const fuelProgressRef = useRef<HTMLDivElement | null>(null);
  const payingProgressRef = useRef<HTMLDivElement | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const stageRef = useRef<"driving" | "stopped" | "onFoot" | "fueling" | "payment" | "paying" | "warning" | "returning" | "climbing" | "finished">("driving");
  const fuelStartedAtRef = useRef(0);
  const exitStartedAtRef = useRef(0);
  const payingStartedAtRef = useRef(0);
  const warningStartedAtRef = useRef(0);
  const returnStartedAtRef = useRef(0);
  const engineAudioRef = useRef<EngineAudio | null>(null);
  const [interactionStage, setInteractionStage] = useState<"driving" | "stopped" | "onFoot" | "fueling" | "payment" | "paying" | "warning" | "returning" | "climbing" | "finished">("driving");
  const [fallback, setFallback] = useState(false);
  const setStage = (next: "driving" | "stopped" | "onFoot" | "fueling" | "payment" | "paying" | "warning" | "returning" | "climbing" | "finished") => {
    stageRef.current = next;
    if (next === "fueling") fuelStartedAtRef.current = performance.now();
    if (next === "onFoot") exitStartedAtRef.current = performance.now();
    if (next === "paying") payingStartedAtRef.current = performance.now();
    if (next === "warning") warningStartedAtRef.current = performance.now();
    if (next === "returning") returnStartedAtRef.current = performance.now();
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
    let driveSpeed = 0;
    let laneOffset = 0;
    let lookYaw = 0;
    let lookPitch = 0;
    let fuelingComplete = false;
    let payingComplete = false;
    const keys = keysRef.current;
    keys.clear();
    stageRef.current = "driving";
    setInteractionStage("driving");
    const advanceInteraction = () => {
      const stage = stageRef.current;
      if (stage === "stopped") setStage("onFoot");
      else if (stage === "onFoot") setStage("fueling");
      else if (stage === "payment") setStage("paying");
      else if (stage === "warning") setStage("returning");
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["w", "a", "d", "arrowleft", "arrowright", "arrowup", "arrowdown", "q", "e"].includes(key)) {
        if (key.startsWith("arrow")) event.preventDefault();
        keys.add(key);
      }
      if (key === "w" && (stageRef.current === "driving" || stageRef.current === "climbing") &&
        (stageRef.current === "climbing" || performance.now() - startedAt >= DURATION * 1000)) startEngineAudio();
      if (key === "e" && !event.repeat && ["stopped", "onFoot", "payment", "warning"].includes(stageRef.current)) {
        event.preventDefault(); advanceInteraction(); keys.delete("e");
      }
    };
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.key.toLowerCase());
    const onBlur = () => keys.clear();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);

    let dragging = false;
    let pointerX = 0;
    let pointerY = 0;
    const onPointerDown = (event: PointerEvent) => {
      dragging = true;
      pointerX = event.clientX;
      pointerY = event.clientY;
      try { canvas.setPointerCapture(event.pointerId); } catch { /* Captura opcional */ }
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging) return;
      const dx = event.clientX - pointerX;
      const dy = event.clientY - pointerY;
      pointerX = event.clientX;
      pointerY = event.clientY;
      lookYaw = clamp(lookYaw + dx * 0.0038, -1.18, 1.18);
      lookPitch = clamp(lookPitch - dy * 0.0023, -0.42, 0.42);
    };
    const onPointerUp = () => { dragging = false; };
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    let worldMesh: Mesh | null = null;
    let carMesh: Mesh | null = null;
    let lightMesh: Mesh | null = null;
    let cockpitMesh: Mesh | null = null;
    let windshieldMesh: Mesh | null = null;
    let fuelHoseMesh: Mesh | null = null;
    let paymentMesh: Mesh | null = null;
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
      carMesh = createMesh(gl, buildCar());
      lightMesh = createMesh(gl, buildHeadlights());
      cockpitMesh = createMesh(gl, buildCockpit());
      windshieldMesh = createMesh(gl, buildWindshield());
      fuelHoseMesh = createMesh(gl, buildRefuelHose());
      paymentMesh = createMesh(gl, buildMoneyHandover());
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
    gl.uniform3fv(fogLocation, new Float32Array([0.53, 0.36, 0.30]));
    const resolutionLocation = gl.getUniformLocation(program, "uResolution");
    const timeLocation = gl.getUniformLocation(program, "uTime");

    setFallback(false);

    const animate = (now: number) => {
      if (!active || !program || !worldMesh || !carMesh || !lightMesh || !cockpitMesh || !windshieldMesh || !fuelHoseMesh) return;
      if (!started) {
        startedAt = now;
        previousFrame = now;
        started = true;
      }
      const elapsed = Math.max(0, (now - startedAt) / 1000);
      const dt = clamp((now - previousFrame) / 1000, 0, 0.05);
      previousFrame = now;

      if (elapsed >= DURATION && stageRef.current === "driving") {
        if (keys.has("w")) {
          driveSpeed = Math.min(5.4, driveSpeed + dt * 3.8);
          driveElapsed += dt;
        } else {
          driveSpeed = Math.max(0, driveSpeed - dt * 7.0);
        }
        if (keys.has("a")) laneOffset = clamp(laneOffset - dt * 2.15, -2.35, 2.35);
        if (keys.has("d")) laneOffset = clamp(laneOffset + dt * 2.15, -2.35, 2.35);
        if (keys.has("arrowleft") || keys.has("q")) lookYaw = clamp(lookYaw - dt * 1.15, -1.18, 1.18);
        if (keys.has("arrowright")) lookYaw = clamp(lookYaw + dt * 1.15, -1.18, 1.18);
        if (keys.has("arrowup")) lookPitch = clamp(lookPitch + dt * 0.7, -0.42, 0.42);
        if (keys.has("arrowdown")) lookPitch = clamp(lookPitch - dt * 0.7, -0.42, 0.42);
        travelled += driveSpeed * dt;
        if (driveElapsed >= 20) {
          driveSpeed = 0; keys.clear(); setStage("stopped");
        }
      }
      if (stageRef.current === "climbing") {
        if (keys.has("w")) {
          driveSpeed = Math.min(5.4, driveSpeed + dt * 2.8);
          climbElapsed += dt;
        } else {
          driveSpeed = Math.max(0, driveSpeed - dt * 5.4);
        }
        if (keys.has("a")) laneOffset = clamp(laneOffset - dt * 1.85, -2.35, 2.35);
        if (keys.has("d")) laneOffset = clamp(laneOffset + dt * 1.85, -2.35, 2.35);
        if (keys.has("arrowleft") || keys.has("q")) lookYaw = clamp(lookYaw - dt * 1.1, -1.18, 1.18);
        if (keys.has("arrowright")) lookYaw = clamp(lookYaw + dt * 1.1, -1.18, 1.18);
        travelled += driveSpeed * dt;
        if (climbElapsed >= 14) {
          driveSpeed = 0; keys.clear(); setStage("finished");
        }
      }
      if (stageRef.current === "fueling" && !fuelingComplete && now - fuelStartedAtRef.current >= 3400) {
        fuelingComplete = true; setStage("payment");
      }
      if (stageRef.current === "paying" && !payingComplete && now - payingStartedAtRef.current >= 1900) {
        payingComplete = true;
        setStage("warning");
      }
      if (stageRef.current === "returning" && now - returnStartedAtRef.current >= 1450) {
        lookYaw = 0;
        lookPitch = 0;
        setStage("climbing");
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
      const transition = smooth(4.48, 5.95, elapsed);
      const aerialEye: V3 = [0, 38 + roadHeightAt(carZ), carZ + 13];
      const aerialTarget: V3 = [0, roadHeightAt(carZ), carZ - 1.5];
      const outsideStage = stageRef.current === "onFoot" || stageRef.current === "fueling" ||
        stageRef.current === "payment" || stageRef.current === "paying" ||
        stageRef.current === "warning" || stageRef.current === "returning";
      const shake = transition * (0.005 + driveSpeed * 0.0021) * (outsideStage ? 0 : 1);
      const shakeX = Math.sin(now * 0.024) * shake;
      const shakeY = Math.sin(now * 0.039) * shake * 0.62;
      const driverEye: V3 = [carX + shakeX, roadHeightAt(carZ) + 1.39 + shakeY, carZ + 0.56];
      const driverTarget: V3 = elapsed < DURATION
        ? [Math.sin(elapsed * 0.44) * 0.35 + shakeX * 0.7, roadHeightAt(carZ - 39) + 2.6 + shakeY, carZ - 39]
        : [
            carX + Math.sin(lookYaw) * 39 + shakeX,
            roadHeightAt(carZ - 39) + 2.6 + lookPitch * 18 + shakeY,
            carZ + 0.56 - Math.cos(lookYaw) * 39,
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
      const footEye: V3 = [11.2, roadHeightAt(carZ) + 1.62, carZ + 1.5];
      const warningLook = stageRef.current === "warning"
        ? smooth(0, 0.9, (now - warningStartedAtRef.current) / 1000)
        : stageRef.current === "returning"
          ? 1 - smooth(0, 0.55, (now - returnStartedAtRef.current) / 1000)
          : 0;
      const footTarget: V3 = [
        16.1,
        roadHeightAt(-164) + mix(2.25, 8.4, warningLook),
        mix(-164.2, -169.8, warningLook),
      ];
      const returnBlend = stageRef.current === "returning"
        ? 1 - smooth(0, 1.45, (now - returnStartedAtRef.current) / 1000)
        : 0;
      const exitBlend = stageRef.current === "returning"
        ? returnBlend
        : outsideStage
          ? smooth(0, 0.9, (now - exitStartedAtRef.current) / 1000)
          : 0;
      const eye: V3 = [
        mix(cockpitEye[0], footEye[0], exitBlend),
        mix(cockpitEye[1], footEye[1], exitBlend),
        mix(cockpitEye[2], footEye[2], exitBlend),
      ];
      const target: V3 = [
        mix(cockpitTarget[0], footTarget[0], exitBlend),
        mix(cockpitTarget[1], footTarget[1], exitBlend),
        mix(cockpitTarget[2], footTarget[2], exitBlend),
      ];
      const fov = mix(49, 66, transition) * Math.PI / 180;
      const projection = perspective(fov, width / height, 0.1, 340);
      const cameraUp: V3 = [
        Math.sin(now * 0.021) * shake * 0.16,
        1,
        Math.sin(now * 0.017) * shake * 0.12,
      ];
      const view = lookAt(eye, target, cameraUp);
      const viewProjection = multiply(projection, view);
      const identity = translation(0, 0, 0);
      bindMesh(gl, program, worldMesh, viewProjection, view, identity);

      const carModel = translation(carX, carY, carZ);
      const aerialVisibility = 1 - smooth(5.1, 5.95, elapsed);
      const returningToCar = stageRef.current === "returning";
      if (aerialVisibility > 0.01 || (outsideStage && !returningToCar)) {
        bindMesh(gl, program, carMesh, viewProjection, view, carModel);
      }
      const lightVisibility = smooth(4.8, 5.65, elapsed);
      if (lightVisibility > 0.01 && (!outsideStage || returningToCar)) {
        bindMesh(gl, program, lightMesh, viewProjection, view, carModel);
        bindMesh(gl, program, cockpitMesh, viewProjection, view, carModel);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        bindMesh(gl, program, windshieldMesh, viewProjection, view, carModel, 0.13);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
      }

      if (stageRef.current === "fueling") {
        bindMesh(gl, program, fuelHoseMesh, viewProjection, view, carModel);
      }
      if (stageRef.current === "paying" && paymentMesh) {
        const handover = smooth(0, 1, (now - payingStartedAtRef.current) / 1900);
        const handX = mix(11.2, 14.7, handover);
        const handY = roadHeightAt(-164) + 1.8 + Math.sin(handover * Math.PI) * 0.2;
        const handZ = mix(-162.4, -164.25, handover);
        bindMesh(gl, program, paymentMesh, viewProjection, view, translation(handX, handY, handZ));
      }
      if (engineAudioRef.current) {
        if ((stageRef.current === "driving" || stageRef.current === "climbing") &&
          (stageRef.current === "climbing" || elapsed >= DURATION)) {
          const throttle = keys.has("w") ? 0.2 + (driveSpeed / 5.4) * 0.8 : 0.12;
          engineAudioRef.current.setThrottle(throttle);
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
          (stageRef.current === "driving" || stageRef.current === "climbing" ? 1 : 0),
        );
      }
      if (progressRef.current) {
        const progress = stageRef.current === "climbing" ? climbElapsed / 14 : driveElapsed / 20;
        progressRef.current.style.width = String(clamp(progress, 0, 1) * 100) + "%";
      }
      if (speedRef.current) speedRef.current.textContent = String(Math.round(driveSpeed * 19));
      if (fuelProgressRef.current) {
        const fill = clamp((now - fuelStartedAtRef.current) / 3400, 0, 1) * 100;
        fuelProgressRef.current.style.width = String(fill) + "%";
      }
      if (payingProgressRef.current) {
        const fill = clamp((now - payingStartedAtRef.current) / 1900, 0, 1) * 100;
        payingProgressRef.current.style.width = String(fill) + "%";
      }

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
      window.cancelAnimationFrame(frame);
      if (worldMesh) gl.deleteBuffer(worldMesh.buffer);
      if (carMesh) gl.deleteBuffer(carMesh.buffer);
      if (lightMesh) gl.deleteBuffer(lightMesh.buffer);
      if (cockpitMesh) gl.deleteBuffer(cockpitMesh.buffer);
      if (windshieldMesh) gl.deleteBuffer(windshieldMesh.buffer);
      if (fuelHoseMesh) gl.deleteBuffer(fuelHoseMesh.buffer);
      if (paymentMesh) gl.deleteBuffer(paymentMesh.buffer);
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
            "radial-gradient(ellipse at 76% 48%, rgba(255,190,126,.34), transparent 36%), linear-gradient(180deg, #182333 0%, #46545e 35%, #c37d5d 66%, #e0a776 100%)",
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
          {interactionStage === "climbing" ? "W · SUBIR LA CUESTA" : "W · ACELERAR"}
          <span className="mx-2 text-amber-100/35">|</span>
          A / D · MANTENERSE EN LA RUTA
          <span className="mx-2 text-amber-100/35">|</span>
          ARRASTRÁ PARA MIRAR
          <span className="ml-3 border-l border-amber-100/20 pl-3 tabular-nums"><span ref={speedRef}>0</span> KM/H</span>
        </div>
        <div className="h-1 w-44 overflow-hidden rounded-full bg-white/15">
          <div ref={progressRef} className="h-full w-0 bg-amber-200 shadow-[0_0_12px_rgba(255,206,137,.9)] transition-[width] duration-100" />
        </div>
        <div className="pointer-events-auto flex flex-col items-center gap-2 md:hidden">
          <p className="font-mono text-[9px] tracking-[.18em] text-amber-50/70">MANTENÉ W PARA AVANZAR · DESLIZÁ EL FONDO PARA MIRAR</p>
          <div className="flex items-center gap-3">
            {(["a", "w", "d"] as const).map((key) => (
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
                aria-label={key === "w" ? "Mantener para acelerar" : key === "a" ? "Mantener para girar a la izquierda" : "Mantener para girar a la derecha"}
              >
                {key === "a" ? "◀" : key === "d" ? "▶" : "W"}
              </button>
            ))}
          </div>
        </div>
      </div>
      {interactionStage !== "driving" && interactionStage !== "climbing" && interactionStage !== "finished" && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-end justify-center px-4 pb-[max(92px,env(safe-area-inset-bottom))] sm:items-center sm:pb-0">
          <div className="pointer-events-auto w-full max-w-lg border border-sky-200/25 bg-[#091b2b]/90 px-6 py-6 text-center shadow-[0_0_65px_rgba(24,117,185,.22)] backdrop-blur-xl">
            {interactionStage === "stopped" && (
              <>
                <p className="font-mono text-[10px] tracking-[.34em] text-sky-200/75">ESTACIÓN DE SERVICIO</p>
                <h2 className="mt-3 font-serif text-3xl tracking-[.12em] text-white">YPF · EL BOLSÓN</h2>
                <p className="mt-3 text-sm text-slate-200">Estacionaste junto a los surtidores. El motor se apaga.</p>
                <button type="button" onClick={() => setStage("onFoot")} className="mt-6 min-h-12 w-full border border-sky-200/40 bg-[#0875b9] px-5 py-3 font-mono text-xs tracking-[.18em] text-white shadow-[0_0_24px_rgba(8,117,185,.28)] hover:bg-[#0a88d2]">
                  BAJAR DEL AUTO <span className="text-sky-100/70">· E</span>
                </button>
              </>
            )}
            {interactionStage === "onFoot" && (
              <>
                <p className="font-mono text-[10px] tracking-[.34em] text-sky-200/75">JUNTO AL SURTIDOR</p>
                <h2 className="mt-3 font-serif text-3xl tracking-[.12em] text-white">CARGAR NAFTA</h2>
                <p className="mt-3 text-sm text-slate-200">El playero se acerca y prepara la manguera.</p>
                <button type="button" onClick={() => setStage("fueling")} className="mt-6 min-h-12 w-full border border-sky-200/40 bg-[#0875b9] px-5 py-3 font-mono text-xs tracking-[.18em] text-white hover:bg-[#0a88d2]">
                  PEDIR QUE CARGUE NAFTA <span className="text-sky-100/70">· E</span>
                </button>
              </>
            )}
            {interactionStage === "fueling" && (
              <>
                <p className="font-mono text-[10px] tracking-[.34em] text-sky-200/75">YPF · CARGA DE COMBUSTIBLE</p>
                <h2 className="mt-3 font-serif text-2xl text-white">El playero está cargando nafta...</h2>
                <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
                  <div ref={fuelProgressRef} className="h-full w-0 bg-sky-300 shadow-[0_0_16px_rgba(125,211,252,.8)]" />
                </div>
              </>
            )}
            {interactionStage === "payment" && (
              <>
                <p className="font-mono text-[10px] tracking-[.34em] text-sky-200/75">TANQUE LLENO</p>
                <h2 className="mt-3 font-serif text-3xl text-white">Es hora de pagar</h2>
                <p className="mt-2 text-sm text-slate-200">Sacás unos billetes del bolsillo para pagarle al playero.</p>
                <div className="mx-auto mt-5 flex h-16 w-40 rotate-[-4deg] items-center justify-center border-2 border-emerald-100/60 bg-emerald-900/80 font-serif text-2xl text-emerald-100 shadow-lg">
                  $ · PESOS
                </div>
                <button type="button" onClick={() => setStage("paying")} className="mt-6 min-h-12 w-full border border-sky-200/40 bg-[#0875b9] px-5 py-3 font-mono text-xs tracking-[.18em] text-white hover:bg-[#0a88d2]">
                  SACAR BILLETES Y PAGAR <span className="text-sky-100/70">· E</span>
                </button>
              </>
            )}
            {interactionStage === "paying" && (
              <>
                <p className="font-mono text-[10px] tracking-[.34em] text-sky-200/75">PAGO EN EFECTIVO</p>
                <h2 className="mt-3 font-serif text-2xl text-white">Le entregás los billetes al playero</h2>
                <p className="mt-2 text-sm text-slate-200">El playero estira la mano y recibe el dinero.</p>
                <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
                  <div ref={payingProgressRef} className="h-full w-0 bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,.8)]" />
                </div>
              </>
            )}
            {interactionStage === "warning" && (
              <>
                <p className="font-mono text-[10px] tracking-[.34em] text-amber-200/75">EL PLAYERO</p>
                <div className="relative mt-4 border border-amber-100/20 bg-[#101820] px-5 py-6 shadow-[0_0_36px_rgba(255,190,126,.12)]">
                  <span className="absolute -top-3 left-6 bg-[#101820] px-2 font-serif text-sm text-amber-100">Te mira hacia el cielo, preocupado</span>
                  <p className="font-serif text-xl leading-relaxed text-white sm:text-2xl">“Hay algo raro en el cielo. Ten cuidado.”</p>
                </div>
                <button type="button" onClick={() => setStage("returning")} className="mt-6 min-h-12 w-full border border-sky-200/40 bg-[#0875b9] px-5 py-3 font-mono text-xs tracking-[.18em] text-white hover:bg-[#0a88d2]">
                  VOLVER AL AUTO <span className="text-sky-100/70">· E</span>
                </button>
              </>
            )}
            {interactionStage === "returning" && (
              <>
                <p className="font-mono text-[10px] tracking-[.34em] text-sky-200/75">ESTACIÓN YPF</p>
                <h2 className="mt-3 font-serif text-2xl text-white">Volvés al auto...</h2>
                <p className="mt-2 text-sm text-slate-200">Cerrás la puerta y encendés el motor.</p>
                <div className="mx-auto mt-5 h-px w-24 bg-sky-200/60" />
              </>
            )}
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
