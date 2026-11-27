import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw } from "lucide-react";
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

function mountainProfile(x: number, amplitude = 1) {
  // Perfil inspirado en la cresta real del Piltriquitrón: hombro largo,
  // varios picos nevados concentrados y una ladera oriental más abrupta.
  const peaks: [number, number][] = [
    [-56, 0.5], [-51, 1.5], [-46, 3.8], [-41, 7.2], [-36, 10.8],
    [-32, 13.4], [-29, 11.7], [-26, 16.1], [-22, 14.2], [-18, 18.4],
    [-14, 16.8], [-10, 22.6], [-6, 20.4], [-2, 25.5], [2, 22.3],
    [6, 17.2], [10, 15.2], [13, 19.4], [17, 17.1], [21, 13.6],
    [26, 11.9], [31, 9.2], [36, 6.8], [42, 4.2], [48, 1.7], [55, 0.4],
  ];
  for (let i = 0; i < peaks.length - 1; i++) {
    const left = peaks[i]!, right = peaks[i + 1]!;
    if (x >= left[0] && x <= right[0]) {
      const t = (x - left[0]) / (right[0] - left[0]);
      return mix(left[1], right[1], t) * amplitude;
    }
  }
  return 0.5 * amplitude;
}


const PIXEL_GLYPHS: Record<string, string[]> = {
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

function addMountain(mesh: MeshBuilder, zCenter: number, amplitude: number, seed: number) {
  const random = randomSource(seed);
  const columns = 42, rows = 12;
  for (let zi = 0; zi < rows; zi++) {
    const z0 = zCenter - 15 + (zi / rows) * 30;
    const z1 = zCenter - 15 + ((zi + 1) / rows) * 30;
    for (let xi = 0; xi < columns; xi++) {
      const x0 = -53 + (xi / columns) * 106;
      const x1 = -53 + ((xi + 1) / columns) * 106;
      const heightAt = (x: number, z: number) => {
        const depth = Math.max(0, 1 - Math.abs(z - zCenter) / 16);
        const ridged = mountainProfile(x, amplitude);
        const erosion = Math.sin(x * 0.43 + z * 0.19 + seed) * 0.7 + Math.sin(x * 0.18 - z * 0.32) * 0.42;
        return terrainY(x * 0.34, z) + Math.max(0, ridged * depth + erosion * depth);
      };
      const a: V3 = [x0, heightAt(x0, z0), z0];
      const b: V3 = [x0, heightAt(x0, z1), z1];
      const c: V3 = [x1, heightAt(x1, z1), z1];
      const d: V3 = [x1, heightAt(x1, z0), z0];
      const avg = (a[1] + b[1] + c[1] + d[1]) / 4;
      let palette: V3;
      if (avg > 15.5) palette = hex(random() > 0.45 ? "#9da8a7" : "#b3b9b4");
      else if (avg > 10) palette = hex(random() > 0.5 ? "#657274" : "#78817d");
      else palette = hex(random() > 0.5 ? "#455355" : "#596462");
      const shade = 0.86 + random() * 0.22;
      const color: V3 = [palette[0] * shade, palette[1] * shade, palette[2] * shade];
      mesh.quad(a, b, c, d, color);
    }
  }
}

function buildWorld() {
  const world = new MeshBuilder();
  const random = randomSource(4081);
  const destinationSignZ = -53;

  // Terreno patagónico irregular: una malla triangulada, no una imagen de fondo.
  const xSteps = 34, zSteps = 54;
  for (let zi = 0; zi < zSteps; zi++) {
    const z0 = -148 + (zi / zSteps) * 166;
    const z1 = -148 + ((zi + 1) / zSteps) * 166;
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

  // Dos cordones de montaña y el Piltriquitrón al fondo, todos con relieve real.
  addMountain(world, -135, 0.63, 17);
  addMountain(world, -101, 1, 91);

  // Banquinas, asfalto, marcas viales y pequeños parches de pavimento.
  for (let z = -148; z < 17; z += 2.5) {
    const next = z + 2.5;
    const c0 = roadCenter(z), c1 = roadCenter(next);
    const left0 = c0 - 4.15, right0 = c0 + 4.15;
    const left1 = c1 - 4.15, right1 = c1 + 4.15;
    world.quad([left0, 0.18, z], [left1, 0.18, next], [right1, 0.18, next], [right0, 0.18, z], hex("#383d40"));
    world.quad([c0 - 5.25, 0.13, z], [c1 - 5.25, 0.13, next], [left1, 0.13, next], [left0, 0.13, z], hex("#716d5e"));
    world.quad([right0, 0.13, z], [right1, 0.13, next], [c1 + 5.25, 0.13, next], [c0 + 5.25, 0.13, z], hex("#716d5e"));
    // Doble línea central amarilla, continua y gastada.
    for (const offset of [-0.105, 0.105]) {
      world.quad(
        [c0 + offset - 0.035, 0.195, z], [c1 + offset - 0.035, 0.195, next],
        [c1 + offset + 0.035, 0.195, next], [c0 + offset + 0.035, 0.195, z],
        hex("#b7a16e"),
      );
    }
    for (const offset of [-3.92, 3.92]) {
      world.quad(
        [c0 + offset - 0.045, 0.198, z], [c1 + offset - 0.045, 0.198, next],
        [c1 + offset + 0.045, 0.198, next], [c0 + offset + 0.045, 0.198, z],
        hex("#a9aaa0"),
      );
    }
    if (Math.floor((z + 148) / 2.5) % 3 === 0) {
      world.quad([c0 - 3.8, 0.205, z], [c1 - 3.8, 0.205, next], [c1 - 3.55, 0.205, next], [c0 - 3.55, 0.205, z], hex("#4a4b48"));
    }
  }

  // Guardarraíles metálicos con postes separados y sombras propias.
  for (const side of [-1, 1]) {
    for (let z = -88; z < 15; z += 4.2) {
      const x = roadCenter(z) + side * 4.72;
      const ground = terrainY(x, z);
      world.box([x, ground + 0.49, z], [0.14, 0.98, 0.14], hex("#555d5e"));
    }
    for (let z = -88; z < 14; z += 4.2) {
      const mid = z + 2.1, x = roadCenter(mid) + side * 4.72;
      world.box([x, terrainY(x, mid) + 0.92, mid], [0.19, 0.18, 4.3], hex("#727a79"), hex("#424c50"));
    }
  }

  // Pinos patagónicos con variaciones de altura, copa y separación.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 30; i++) {
      const z = 10 - i * 5.25 - random() * 2.7;
      if (side === 1 && Math.abs(z - destinationSignZ) < 10) continue;
      const x = roadCenter(z) + side * (6.1 + random() * 8.5);
      const height = 4.2 + random() * 6.4;
      addPine(world, x, z, terrainY(x, z), height, Math.floor(random() * 1000));
    }
    for (let i = 0; i < 21; i++) {
      const z = 7 - i * 6.9 - random() * 3;
      if (side === 1 && Math.abs(z - destinationSignZ) < 10) continue;
      const x = roadCenter(z) + side * (16 + random() * 23);
      const height = 5.5 + random() * 8;
      addPine(world, x, z, terrainY(x, z), height, Math.floor(random() * 1000));
    }
  }

  // Matorrales y rocas facetadas junto a las banquinas.
  for (let i = 0; i < 85; i++) {
    const side = random() > 0.5 ? 1 : -1;
    const z = 12 - random() * 135;
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
    for (let i = 0; i < 9; i++) {
      const z = 7 - i * 15;
      const x = roadCenter(z) + poleOffset;
      const y = terrainY(x, z);
      world.box([x, y + 4.3, z], [0.24, 8.6, 0.24], hex("#40372d"));
      world.box([x, y + 7.7, z], [2.7, 0.16, 0.16], hex("#4a4035"));
      world.box([x - 0.78, y + 7.45, z], [0.1, 0.7, 0.1], hex("#3d352d"));
      world.box([x + 0.78, y + 7.45, z], [0.1, 0.7, 0.1], hex("#3d352d"));
      if (i < 8) {
        const nextZ = z - 15, nextX = roadCenter(nextZ) + poleOffset;
        world.beam([x - 0.8, y + 7.75, z], [nextX - 0.8, terrainY(nextX, nextZ) + 7.75, nextZ], 0.045, hex("#232c31"));
        world.beam([x + 0.8, y + 7.75, z], [nextX + 0.8, terrainY(nextX, nextZ) + 7.75, nextZ], 0.045, hex("#30373a"));
      }
    }
  }

  // Cartel de advertencia existente y un cartel verde de distancia a El Bolsón.
  const signX = roadCenter(-29) + 7.8, signZ = -29, signY = terrainY(signX, signZ);
  world.box([signX, signY + 1.18, signZ], [0.13, 2.36, 0.13], hex("#514435"));
  world.box([signX, signY + 2.38, signZ], [1.25, 0.98, 0.16], hex("#9b8a6e"), hex("#5d5448"));
  world.cone(signX, signY + 2.1, signZ - 0.11, 0.31, 0.55, 3, hex("#a94f3f"));

  const destinationX = roadCenter(destinationSignZ) + 11.2;
  const destinationGround = terrainY(destinationX, destinationSignZ);
  const destinationY = destinationGround + 3.55;
  for (const dx of [-2.72, 2.72]) {
    world.box([destinationX + dx, destinationGround + 1.45, destinationSignZ], [0.18, 2.9, 0.18], hex("#4a4034"));
  }
  world.box([destinationX, destinationY, destinationSignZ], [7.15, 2.05, 0.2], hex("#104637"), hex("#1b5945"));
  world.box([destinationX, destinationY + 0.91, destinationSignZ + 0.115], [6.95, 0.045, 0.035], hex("#83a99a"));
  world.box([destinationX, destinationY - 0.91, destinationSignZ + 0.115], [6.95, 0.045, 0.035], hex("#83a99a"));
  addPixelText(world, "EL BOLSÓN", destinationX, destinationY + 0.43, destinationSignZ + 0.14, 0.1, hex("#f0eee0"));
  addPixelText(world, "2 KILÓMETROS", destinationX, destinationY - 0.48, destinationSignZ + 0.14, 0.08, hex("#f0eee0"));

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
  const warm = hex("#625b46");
  lights.triangle([-0.45, 0.2, -2.1], [-5.3, 0.16, -39], [-0.2, 0.16, -39], warm);
  lights.triangle([0.45, 0.2, -2.1], [0.2, 0.16, -39], [5.3, 0.16, -39], warm);
  return lights;
}

function buildCockpit() {
  const cockpit = new MeshBuilder();
  const dark = hex("#171d22");
  const lighter = hex("#30373b");
  const skin = hex("#9c725b");
  const sleeve = hex("#2c353d");
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

  // Brazos con mangas, puños y ambas manos agarrando el aro del volante.
  cockpit.beam([-1.3, 0.78, -1.05], [-0.38, 1.18, -0.86], 0.29, sleeve);
  cockpit.beam([1.3, 0.78, -1.05], [0.38, 1.18, -0.86], 0.29, sleeve);
  cockpit.beam([-0.48, 1.17, -0.83], [-0.34, 1.23, -0.87], 0.2, hex("#4c4b47"));
  cockpit.beam([0.48, 1.17, -0.83], [0.34, 1.23, -0.87], 0.2, hex("#4c4b47"));
  cockpit.box([-0.34, 1.21, -0.79], [0.22, 0.18, 0.18], skin, hex("#725342"));
  cockpit.box([0.34, 1.21, -0.79], [0.22, 0.18, 0.18], skin, hex("#725342"));
  cockpit.box([-0.29, 1.24, -0.72], [0.12, 0.10, 0.12], hex("#b88b70"));
  cockpit.box([0.29, 1.24, -0.72], [0.12, 0.10, 0.12], hex("#b88b70"));

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
  float light = 0.66 + floor(diffuse * 3.0) * 0.105;
  vec3 color = vColor * light;
  float fog = smoothstep(53.0, 142.0, vDepth);
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

export function Route40LowPolyOpening() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const blackRef = useRef<HTMLDivElement | null>(null);
  const endingTitleRef = useRef<HTMLDivElement | null>(null);
  const [replay, setReplay] = useState(0);
  const [finished, setFinished] = useState(false);
  const [fallback, setFallback] = useState(false);

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
    let ended = false;
    let worldMesh: Mesh | null = null;
    let carMesh: Mesh | null = null;
    let lightMesh: Mesh | null = null;
    let cockpitMesh: Mesh | null = null;
    let windshieldMesh: Mesh | null = null;
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
    gl.uniform3fv(fogLocation, new Float32Array([0.31, 0.35, 0.36]));
    const resolutionLocation = gl.getUniformLocation(program, "uResolution");
    const timeLocation = gl.getUniformLocation(program, "uTime");

    setFinished(false);
    setFallback(false);

    const animate = (now: number) => {
      if (!active || !program || !worldMesh || !carMesh || !lightMesh || !cockpitMesh || !windshieldMesh) return;
      if (!started) {
        startedAt = now;
        started = true;
      }
      const elapsed = Math.min(DURATION, Math.max(0, (now - startedAt) / 1000));
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

      const carZ = -elapsed * 4.1;
      const transition = smooth(4.48, 5.95, elapsed);
      const aerialEye: V3 = [0, 38, carZ + 13];
      const aerialTarget: V3 = [0, 0, carZ - 1.5];
      const driverEye: V3 = [Math.sin(elapsed * 1.3) * 0.035, 1.57, carZ + 0.56];
      const driverTarget: V3 = [Math.sin(elapsed * 0.44) * 0.35, 2.6, carZ - 39];
      const eye: V3 = [
        mix(aerialEye[0], driverEye[0], transition),
        mix(aerialEye[1], driverEye[1], transition),
        mix(aerialEye[2], driverEye[2], transition),
      ];
      const target: V3 = [
        mix(aerialTarget[0], driverTarget[0], transition),
        mix(aerialTarget[1], driverTarget[1], transition),
        mix(aerialTarget[2], driverTarget[2], transition),
      ];
      const fov = mix(49, 66, transition) * Math.PI / 180;
      const projection = perspective(fov, width / height, 0.1, 240);
      const view = lookAt(eye, target, [0, 1, 0]);
      const viewProjection = multiply(projection, view);
      const identity = translation(0, 0, 0);
      bindMesh(gl, program, worldMesh, viewProjection, view, identity);

      const carModel = translation(0, 0, carZ);
      const aerialVisibility = 1 - smooth(5.1, 5.95, elapsed);
      if (aerialVisibility > 0.01) {
        bindMesh(gl, program, carMesh, viewProjection, view, carModel);
      }
      const lightVisibility = smooth(4.8, 5.65, elapsed);
      if (lightVisibility > 0.01) {
        bindMesh(gl, program, lightMesh, viewProjection, view, carModel);
        bindMesh(gl, program, cockpitMesh, viewProjection, view, carModel);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        bindMesh(gl, program, windshieldMesh, viewProjection, view, carModel, 0.13);
        gl.depthMask(true);
        gl.disable(gl.BLEND);
      }

      if (titleRef.current) {
        titleRef.current.style.opacity = String(smooth(0.28, 0.9, elapsed) * (1 - smooth(4.1, 4.7, elapsed)));
      }
      if (blackRef.current) {
        blackRef.current.style.opacity = String(smooth(11.55, 12.95, elapsed) * 0.985);
      }
      if (endingTitleRef.current) {
        endingTitleRef.current.style.opacity = String(smooth(12.65, 13.5, elapsed));
      }

      if (elapsed >= DURATION) {
        ended = true;
        setFinished(true);
        return;
      }
      if (!ended) frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);
    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      if (worldMesh) gl.deleteBuffer(worldMesh.buffer);
      if (carMesh) gl.deleteBuffer(carMesh.buffer);
      if (lightMesh) gl.deleteBuffer(lightMesh.buffer);
      if (cockpitMesh) gl.deleteBuffer(cockpitMesh.buffer);
      if (windshieldMesh) gl.deleteBuffer(windshieldMesh.buffer);
      if (program) gl.deleteProgram(program);
    };
  }, [replay]);

  if (fallback) return <CanvasFallback />;

  return (
    <div className="fixed inset-0 z-[2000] h-[100svh] w-screen overflow-hidden bg-[#17212a] text-white">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #111923 0%, #26323a 37%, #827160 67%, #50594f 100%)",
        }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
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
          <p className="font-serif text-4xl tracking-[0.18em] text-[#e8d2b6] drop-shadow-[0_0_24px_rgba(202,126,84,0.35)] sm:text-6xl">
            CONTINUARÁ
          </p>
          <div className="mx-auto mt-5 h-px w-28 bg-[#c28e69]/70" />
        </div>
      </div>
      {finished && (
        <div className="absolute inset-x-0 bottom-[max(28px,env(safe-area-inset-bottom))] z-40 flex flex-wrap items-center justify-center gap-3 px-4">
          <button
            type="button"
            onClick={() => setReplay((value) => value + 1)}
            className="inline-flex min-h-11 items-center gap-2 border border-amber-100/35 bg-black/55 px-5 py-3 font-mono text-[11px] tracking-[.18em] text-amber-100 backdrop-blur-md transition hover:border-amber-100/80 hover:bg-black/80"
          >
            <RotateCcw size={14} /> REPETIR CINEMÁTICA
          </button>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 border border-white/20 bg-black/40 px-5 py-3 font-mono text-[11px] tracking-[.18em] text-white/75 backdrop-blur-md transition hover:border-white/60 hover:text-white"
          >
            <ArrowLeft size={14} /> VOLVER AL INICIO
          </Link>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-3 right-4 z-40 font-mono text-[9px] tracking-[.2em] text-white/30">
        LA SEÑAL EN LA RUTA 40 · PLAY / SP
      </div>
    </div>
  );
}
