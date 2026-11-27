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

function mountainProfile(x: number, amplitude = 1) {
  // Silueta reconstruida a partir de piltri.jpg: crestas irregulares,
  // varias agujas nevadas y un macizo rocoso más alto hacia la derecha.
  const ridge: [number, number][] = [
    [-56, 4], [-52, 7], [-48, 10], [-44, 9], [-40, 12], [-36, 15],
    [-32, 12], [-28, 10], [-24, 14], [-20, 17], [-17, 15], [-14, 19],
    [-10, 16], [-7, 20], [-3, 18], [1, 22], [5, 19], [8, 24],
    [12, 27], [16, 25], [19, 30], [22, 26], [25, 23], [29, 24],
    [33, 20], [37, 18], [41, 15], [45, 13], [50, 9], [56, 5],
  ];
  for (let i = 0; i < ridge.length - 1; i++) {
    const left = ridge[i]!, right = ridge[i + 1]!;
    if (x >= left[0] && x <= right[0]) {
      const t = (x - left[0]) / (right[0] - left[0]);
      const base = mix(left[1], right[1], t);
      const sharpness = Math.sin(t * Math.PI) * (i % 3 === 0 ? 0.8 : 0.34);
      return (base + sharpness) * amplitude;
    }
  }
  return 4 * amplitude;
}


const PIXEL_GLYPHS: Record<string, string[]> = {
  "A": ["01110","10001","10001","11111","10001","10001","10001"],
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

function addMountain(mesh: MeshBuilder, zCenter: number, amplitude: number, seed: number) {
  const random = randomSource(seed);
  const columns = 84;
  const rows = 18;
  for (let zi = 0; zi < rows; zi++) {
    const z0 = zCenter - 20 + (zi / rows) * 40;
    const z1 = zCenter - 20 + ((zi + 1) / rows) * 40;
    for (let xi = 0; xi < columns; xi++) {
      const x0 = -56 + (xi / columns) * 112;
      const x1 = -56 + ((xi + 1) / columns) * 112;
      const heightAt = (x: number, z: number) => {
        const depth = 0.78 + 0.22 * Math.max(0, 1 - Math.abs(z - zCenter) / 20);
        const rough = Math.sin(x * 0.47 + z * 0.16 + seed) * 0.62
          + Math.sin(x * 0.21 - z * 0.37 + seed * 0.2) * 0.36
          + Math.sin(x * 0.91 + z * 0.12) * 0.16;
        return terrainY(x * 0.34, z) + Math.max(0, mountainProfile(x, amplitude) * depth + rough);
      };
      const a: V3 = [x0, heightAt(x0, z0), z0];
      const b: V3 = [x0, heightAt(x0, z1), z1];
      const c: V3 = [x1, heightAt(x1, z1), z1];
      const d: V3 = [x1, heightAt(x1, z0), z0];
      const avg = (a[1] + b[1] + c[1] + d[1]) / 4;
      const snowLine = 14.2 + Math.sin((x0 + x1) * 0.075) * 1.55;
      const snowPatch = avg > snowLine && random() > 0.19;
      let base: V3;
      if (snowPatch) {
        base = hex(random() > 0.48 ? "#d9e0df" : "#b9c8ce");
      } else if (avg > 18) {
        base = hex(random() > 0.5 ? "#4c5962" : "#394851");
      } else if (avg > 11) {
        base = hex(random() > 0.5 ? "#56666b" : "#657477");
      } else {
        base = hex(random() > 0.5 ? "#354449" : "#45565a");
      }
      const shadeA = 0.82 + random() * 0.34;
      const shadeB = 0.76 + random() * 0.38;
      const colorA: V3 = [base[0] * shadeA, base[1] * shadeA, base[2] * shadeA];
      const colorB: V3 = [base[0] * shadeB, base[1] * shadeB, base[2] * shadeB];
      // Triángulos alternados para conseguir caras rocosas y nieve facetada.
      mesh.triangle(a, b, c, colorA);
      mesh.triangle(a, c, d, colorB);
    }
  }
}


function addTown(mesh: MeshBuilder) {
  const addShop = (
    x: number,
    z: number,
    width: number,
    height: number,
    depth: number,
    wall: V3,
    roof: V3,
    label: string,
    open = false,
  ) => {
    const ground = terrainY(x, z);
    const front = z + depth / 2 + 0.08;
    mesh.box([x, ground + height / 2, z], [width, height, depth], wall, hex("#333b3c"));
    mesh.box([x, ground + height + 0.22, z], [width + 0.5, 0.42, depth + 0.35], roof);
    mesh.box([x, ground + height * 0.78, front], [width * 0.76, 0.12, 0.08], hex("#c2a17a"));
    mesh.box([x - width * 0.24, ground + height * 0.49, front], [width * 0.27, height * 0.34, 0.09], hex("#c6d4d1"), hex("#526d74"));
    mesh.box([x + width * 0.11, ground + height * 0.49, front], [width * 0.27, height * 0.34, 0.09], hex("#c6d4d1"), hex("#526d74"));
    mesh.box([x + width * 0.31, ground + height * 0.31, front + 0.015], [width * 0.17, height * 0.58, 0.13], hex("#4d382b"), hex("#211b17"));
    mesh.box([x + width * 0.31, ground + height * 0.31, front + 0.09], [0.045, 0.045, 0.035], hex("#e6c18e"));
    const signY = ground + height * 0.84;
    mesh.box([x, signY, front + 0.12], [Math.max(3.1, width * 0.63), 0.75, 0.12], hex("#342d28"), hex("#51443a"));
    addPixelText(mesh, label, x, signY + 0.02, front + 0.2, label.length > 5 ? 0.065 : 0.1, hex("#f0dfbd"));
    if (open) {
      mesh.box([x, ground + height * 0.61, front + 0.14], [3.6, 0.5, 0.1], hex("#1d4938"), hex("#245e45"));
      addPixelText(mesh, "ABIERTO", x, ground + height * 0.61 + 0.01, front + 0.205, 0.062, hex("#d5f0c7"));
      mesh.box([x - width * 0.24, ground + height * 0.49, front + 0.11], [width * 0.27, height * 0.34, 0.035], hex("#f1bd74"));
      mesh.box([x + width * 0.11, ground + height * 0.49, front + 0.11], [width * 0.27, height * 0.34, 0.035], hex("#eab56d"));
      mesh.box([x, ground + height + 0.64, front + 0.04], [0.2, 0.75, 0.2], hex("#39312a"));
      mesh.box([x, ground + height + 1.03, front + 0.04], [0.72, 0.18, 0.48], hex("#ffd28d"));
    }
  };

  const addHouse = (x: number, z: number, wall: V3, roof: V3) => {
    const ground = terrainY(x, z);
    const width = 7.4;
    const height = 3.7;
    const depth = 6.8;
    const front = z + depth / 2 + 0.05;
    mesh.box([x, ground + height / 2, z], [width, height, depth], wall, hex("#554f46"));
    mesh.triangle(
      [x - width / 2 - 0.35, ground + height, front],
      [x, ground + height + 2.1, front],
      [x + width / 2 + 0.35, ground + height, front],
      roof,
    );
    mesh.triangle(
      [x - width / 2 - 0.35, ground + height, z - depth / 2],
      [x + width / 2 + 0.35, ground + height, z - depth / 2],
      [x, ground + height + 2.1, z - depth / 2],
      hex("#394348"),
    );
    mesh.box([x - 1.75, ground + 2.1, front + 0.08], [1.35, 1.25, 0.09], hex("#b7ced0"), hex("#526f76"));
    mesh.box([x + 1.2, ground + 2.1, front + 0.08], [1.25, 1.25, 0.09], hex("#e5bb79"), hex("#806247"));
    mesh.box([x + 2.45, ground + 1.1, front + 0.1], [0.9, 2.2, 0.12], hex("#49372c"));
  };

  // Cartel de ingreso, grande y aislado de los árboles de la banquina.
  const welcomeX = roadCenter(-146) - 10.8;
  const welcomeZ = -146;
  const welcomeGround = terrainY(welcomeX, welcomeZ);
  mesh.box([welcomeX, welcomeGround + 2.38, welcomeZ], [10.2, 2.65, 0.28], hex("#263d43"), hex("#38585d"));
  mesh.box([welcomeX, welcomeGround + 2.38, welcomeZ + 0.17], [9.8, 2.27, 0.08], hex("#174c43"));
  mesh.box([welcomeX - 4.35, welcomeGround + 1.25, welcomeZ], [0.22, 2.5, 0.24], hex("#4b4033"));
  mesh.box([welcomeX + 4.35, welcomeGround + 1.25, welcomeZ], [0.22, 2.5, 0.24], hex("#4b4033"));
  addPixelText(mesh, "BIENVENIDO", welcomeX, welcomeGround + 2.85, welcomeZ + 0.23, 0.115, hex("#f2e9d6"));
  addPixelText(mesh, "A EL BOLSÓN", welcomeX, welcomeGround + 1.97, welcomeZ + 0.23, 0.1, hex("#f2e9d6"));

  addShop(-13.5, -164, 7.8, 4.6, 6.8, hex("#74604d"), hex("#34383a"), "CAFE");
  addHouse(14.8, -160, hex("#8a715d"), hex("#34383a"));
  addShop(13.2, -176, 7.2, 4.1, 6.2, hex("#69594b"), hex("#3c4243"), "TIENDA");
  addHouse(-14.2, -181, hex("#78634f"), hex("#34383a"));
  addShop(10.7, -190, 10.2, 5.0, 8.0, hex("#60483b"), hex("#2f3338"), "BAR", true);

  // Faroles encendidos al atardecer y reflejo cálido sobre la calle.
  for (const z of [-154, -170, -186, -202]) {
    for (const side of [-1, 1]) {
      const x = roadCenter(z) + side * 6.5;
      const y = terrainY(x, z);
      mesh.box([x, y + 3.0, z], [0.15, 6.0, 0.15], hex("#3d3932"));
      mesh.beam([x, y + 5.6, z], [x - side * 1.2, y + 5.6, z - 0.35], 0.1, hex("#4c4940"));
      mesh.box([x - side * 1.2, y + 5.48, z - 0.35], [0.56, 0.22, 0.45], hex("#ffd08a"));
      mesh.box([x - side * 1.2, y + 5.32, z - 0.35], [0.8, 0.08, 0.66], hex("#e5a95f"));
    }
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

  // Dos cordones de montaña y el Piltriquitrón al fondo, todos con relieve real.
  addMountain(world, -135, 0.63, 17);
  addMountain(world, -101, 1, 91);

  // Banquinas, asfalto, marcas viales y pequeños parches de pavimento.
  for (let z = -292; z < 17; z += 2.5) {
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
    for (let z = -146; z < 15; z += 4.2) {
      const x = roadCenter(z) + side * 4.72;
      const ground = terrainY(x, z);
      world.box([x, ground + 0.49, z], [0.14, 0.98, 0.14], hex("#555d5e"));
    }
    for (let z = -146; z < 14; z += 4.2) {
      const mid = z + 2.1, x = roadCenter(mid) + side * 4.72;
      world.box([x, terrainY(x, mid) + 0.92, mid], [0.19, 0.18, 4.3], hex("#727a79"), hex("#424c50"));
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
    for (let i = 0; i < 13; i++) {
      const z = 7 - i * 15;
      const x = roadCenter(z) + poleOffset;
      const y = terrainY(x, z);
      world.box([x, y + 4.3, z], [0.24, 8.6, 0.24], hex("#40372d"));
      world.box([x, y + 7.7, z], [2.7, 0.16, 0.16], hex("#4a4035"));
      world.box([x - 0.78, y + 7.45, z], [0.1, 0.7, 0.1], hex("#3d352d"));
      world.box([x + 0.78, y + 7.45, z], [0.1, 0.7, 0.1], hex("#3d352d"));
      if (i < 12) {
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
  addTown(world);

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

  // Brazos con mangas, puños y ambas manos agarrando el aro del volante.
  cockpit.beam([-1.3, 0.78, -1.05], [-0.38, 1.18, -0.86], 0.31, sleeve);
  cockpit.beam([1.3, 0.78, -1.05], [0.38, 1.18, -0.86], 0.31, sleeve);
  for (const side of [-1, 1]) {
    const palmX = side * 0.34;
    const cuff = hex("#66717a");
    cockpit.beam([side * 0.52, 1.17, -0.84], [palmX, 1.22, -0.79], 0.22, cuff);
    cockpit.box([palmX, 1.22, -0.79], [0.28, 0.2, 0.18], skin, hex("#855b49"));
    for (let finger = 0; finger < 4; finger++) {
      const fingerY = 1.13 + finger * 0.035;
      const startX = palmX + side * (finger * 0.055 - 0.08);
      const endX = startX + side * 0.045;
      cockpit.beam([startX, fingerY, -0.72], [endX, fingerY - 0.025, -0.64], 0.062, skin);
      cockpit.box([startX, fingerY, -0.715], [0.075, 0.065, 0.065], hex("#c49372"));
    }
    cockpit.beam([palmX - side * 0.1, 1.25, -0.76], [palmX - side * 0.18, 1.18, -0.7], 0.085, hex("#ad785d"));
    cockpit.beam([palmX - side * 0.09, 1.16, -0.695], [palmX + side * 0.07, 1.16, -0.695], 0.018, hex("#d3a183"));
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

export function Route40LowPolyOpening() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const blackRef = useRef<HTMLDivElement | null>(null);
  const endingTitleRef = useRef<HTMLDivElement | null>(null);
  const gameHudRef = useRef<HTMLDivElement | null>(null);
  const arrivalRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const [arrived, setArrived] = useState(false);
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
    let previousFrame = 0;
    let driveElapsed = 0;
    let travelled = 0;
    let driveSpeed = 0;
    let laneOffset = 0;
    let lookYaw = 0;
    let lookPitch = 0;
    let arrivedLocal = false;
    const keys = keysRef.current;
    keys.clear();
    setArrived(false);

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (["w", "a", "d", "arrowleft", "arrowright", "arrowup", "arrowdown", "q", "e"].includes(key)) {
        if (key.startsWith("arrow")) event.preventDefault();
        keys.add(key);
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
    gl.uniform3fv(fogLocation, new Float32Array([0.53, 0.36, 0.30]));
    const resolutionLocation = gl.getUniformLocation(program, "uResolution");
    const timeLocation = gl.getUniformLocation(program, "uTime");

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

      if (elapsed >= DURATION && !arrivedLocal) {
        if (keys.has("w")) {
          driveSpeed = Math.min(5.4, driveSpeed + dt * 3.8);
          driveElapsed += dt;
        } else {
          driveSpeed = Math.max(0, driveSpeed - dt * 7.0);
        }
        if (keys.has("a")) laneOffset = clamp(laneOffset - dt * 2.15, -2.35, 2.35);
        if (keys.has("d")) laneOffset = clamp(laneOffset + dt * 2.15, -2.35, 2.35);
        if (keys.has("arrowleft") || keys.has("q")) lookYaw = clamp(lookYaw - dt * 1.15, -1.18, 1.18);
        if (keys.has("arrowright") || keys.has("e")) lookYaw = clamp(lookYaw + dt * 1.15, -1.18, 1.18);
        if (keys.has("arrowup")) lookPitch = clamp(lookPitch + dt * 0.7, -0.42, 0.42);
        if (keys.has("arrowdown")) lookPitch = clamp(lookPitch - dt * 0.7, -0.42, 0.42);
        travelled += driveSpeed * dt;
        if (driveElapsed >= 20) {
          arrivedLocal = true;
          driveSpeed = 0;
          setArrived(true);
        }
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
      const transition = smooth(4.48, 5.95, elapsed);
      const aerialEye: V3 = [0, 38, carZ + 13];
      const aerialTarget: V3 = [0, 0, carZ - 1.5];
      const driverEye: V3 = [carX, 1.57, carZ + 0.56];
      const driverTarget: V3 = elapsed < DURATION
        ? [Math.sin(elapsed * 0.44) * 0.35, 2.6, carZ - 39]
        : [
            carX + Math.sin(lookYaw) * 39,
            2.6 + lookPitch * 18,
            carZ + 0.56 - Math.cos(lookYaw) * 39,
          ];
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
      const projection = perspective(fov, width / height, 0.1, 340);
      const view = lookAt(eye, target, [0, 1, 0]);
      const viewProjection = multiply(projection, view);
      const identity = translation(0, 0, 0);
      bindMesh(gl, program, worldMesh, viewProjection, view, identity);

      const carModel = translation(carX, 0, carZ);
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
          smooth(DURATION + 0.1, DURATION + 0.9, elapsed) * (arrivedLocal ? 0.32 : 1),
        );
      }
      if (progressRef.current) {
        progressRef.current.style.width = String(clamp(driveElapsed / 20, 0, 1) * 100) + "%";
      }
      if (arrivalRef.current) {
        arrivalRef.current.style.opacity = arrivedLocal ? "1" : "0";
      }

      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);
    return () => {
      active = false;
      keys.clear();
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
        <div className="rounded-sm border border-amber-100/25 bg-[#101820]/70 px-4 py-2 font-mono text-[10px] tracking-[.14em] text-amber-50 shadow-[0_0_30px_rgba(255,176,105,.14)] backdrop-blur-md sm:text-xs">
          W · AVANZAR
          <span className="mx-3 text-amber-100/35">|</span>
          A / D · MOVERSE POR LA RUTA
          <span className="mx-3 text-amber-100/35">|</span>
          ARRASTRÁ EL MOUSE · MIRAR
        </div>
        <div className="h-1 w-44 overflow-hidden rounded-full bg-white/15">
          <div ref={progressRef} className="h-full w-0 bg-amber-200 shadow-[0_0_12px_rgba(255,206,137,.9)] transition-[width] duration-100" />
        </div>
        <div className="pointer-events-auto flex items-center gap-3 md:hidden">
          {(["a", "w", "d"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onPointerDown={(event) => { event.preventDefault(); keysRef.current.add(key); }}
              onPointerUp={() => keysRef.current.delete(key)}
              onPointerLeave={() => keysRef.current.delete(key)}
              onPointerCancel={() => keysRef.current.delete(key)}
              className="grid h-12 w-12 place-items-center rounded border border-amber-100/35 bg-black/60 font-mono text-sm font-bold text-amber-50 shadow-lg backdrop-blur-md active:bg-amber-100/25"
              aria-label={key === "w" ? "Avanzar" : key === "a" ? "Moverse a la izquierda" : "Moverse a la derecha"}
            >
              {key.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      {arrived && (
      <div
        ref={arrivalRef}
        className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-[#090d10]/20 px-5 text-center transition-opacity duration-700"
        style={{ opacity: 0 }}
      >
        <div className="border-y border-amber-100/25 bg-[#101820]/80 px-8 py-8 shadow-[0_0_70px_rgba(243,159,92,.2)] backdrop-blur-md">
          <p className="font-mono text-[10px] tracking-[.34em] text-amber-100/70">HAS LLEGADO</p>
          <p className="mt-3 font-serif text-3xl tracking-[.13em] text-[#f4dfc6] sm:text-5xl">EL BOLSÓN</p>
          <p className="mt-3 font-mono text-xs tracking-[.3em] text-amber-100">BAR ABIERTO</p>
          <div className="mx-auto mt-6 h-px w-20 bg-amber-100/45" />
          <p className="mt-5 font-serif text-2xl tracking-[.2em] text-[#eac9a8] sm:text-3xl">CONTINUARÁ</p>
        </div>
      </div>
      )}
      <div className="pointer-events-none absolute bottom-3 right-4 z-40 font-mono text-[9px] tracking-[.2em] text-white/30">
        LA SEÑAL EN LA RUTA 40 · PLAY / SP
      </div>
    </div>
  );
}
