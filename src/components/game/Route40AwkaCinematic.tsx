import { useEffect, useRef } from "react";
import { playAwkaSirenAudio } from "./route40-awka-audio";

type V3 = [number, number, number];
type Mesh = { buffer: WebGLBuffer; count: number };

const DURATION = 15;
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const smooth = (a: number, b: number, n: number) => {
  const t = clamp((n - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mix3 = (a: V3, b: V3, t: number): V3 => [
  mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t),
];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: V3, n: number): V3 => [a[0] * n, a[1] * n, a[2] * n];
const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a: V3): V3 => {
  const length = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
};
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
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

  cone(x: number, y: number, z: number, radius: number, height: number, sides: number, color: V3) {
    const top: V3 = [x, y + height, z];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      const b = ((i + 1) / sides) * Math.PI * 2;
      this.triangle(
        top,
        [x + Math.cos(a) * radius, y, z + Math.sin(a) * radius],
        [x + Math.cos(b) * radius, y, z + Math.sin(b) * radius],
        color,
      );
    }
  }

  data() {
    return new Float32Array(this.values);
  }
}

const GLYPHS: Record<string, string[]> = {
  "A": ["01110","10001","10001","11111","10001","10001","10001"],
  "W": ["10001","10001","10001","10101","10101","10101","01010"],
  "K": ["10001","10010","10100","11000","10100","10010","10001"],
};

function addPixelText(mesh: MeshBuilder, text: string, cx: number, cy: number, z: number, cell: number, color: V3) {
  const chars = Array.from(text);
  const width = chars.length * 5 * cell + Math.max(0, chars.length - 1) * cell;
  let cursor = cx - width / 2;
  for (const character of chars) {
    const glyph = GLYPHS[character] ?? GLYPHS["A"]!;
    for (let row = 0; row < 7; row++) {
      const line = glyph[row] ?? "00000";
      for (let column = 0; column < 5; column++) {
        if (line[column] !== "1") continue;
        mesh.box(
          [cursor + column * cell + cell / 2, cy + (3 - row) * cell, z],
          [cell * 0.8, cell * 0.8, Math.max(0.025, cell * 0.2)],
          color,
        );
      }
    }
    cursor += 6 * cell;
  }
}

function buildAwkaWorld() {
  const world = new MeshBuilder();
  const black = hex("#080b0e");
  const blackMetal = hex("#101419");
  const darkRib = hex("#171c20");
  const wood = hex("#59402c");
  const woodLight = hex("#79583a");
  const woodDark = hex("#35281f");

  // Noche patagónica: patio de hormigón con pequeños paños de grava.
  world.box([0, -0.22, -1.5], [25, 0.35, 27], hex("#262a31"), hex("#38343a"));
  for (let i = 0; i < 26; i++) {
    const x = -11.5 + (i % 13) * 1.9;
    const z = -11 + Math.floor(i / 13) * 16;
    world.box([x, -0.025, z], [0.18, 0.025, 0.22], i % 2 ? hex("#292b29") : hex("#34312b"));
  }
  // Charcos geométricos que reflejan el cielo naranja y las luces del local.
  world.quad([-6.8, -0.025, -4.2], [-4.5, -0.025, -4.0], [-4.0, -0.025, -2.8], [-6.4, -0.025, -2.7], hex("#46505a"));
  world.quad([5.6, -0.024, 1.5], [7.4, -0.024, 1.65], [7.8, -0.024, 2.45], [5.8, -0.024, 2.3], hex("#414c56"));
  world.quad([-1.2, -0.023, 3.6], [0.9, -0.023, 3.5], [1.25, -0.023, 4.0], [-1.0, -0.023, 4.15], hex("#414952"));

  // Cervecería construida como un contenedor marítimo negro.
  world.box([0, 2.25, -10], [16, 4.5, 5.6], black, hex("#14181d"));
  world.box([0, 4.55, -10], [16.28, 0.18, 5.83], hex("#05070a"), hex("#20252a"));
  world.box([0, 0.18, -7.17], [15.7, 0.26, 0.18], hex("#07090c"));
  // Nervaduras metálicas verticales y esquinas del contenedor.
  for (let x = -7.55; x <= 7.56; x += 0.58) {
    world.box([x, 2.27, -7.13], [0.075, 4.28, 0.105], darkRib);
  }
  for (const x of [-7.82, 7.82]) {
    world.box([x, 2.25, -7.1], [0.22, 4.48, 0.22], hex("#24282c"));
  }
  // Puerta industrial y pequeño paño de ventana oscura.
  world.box([-3.55, 1.65, -7.03], [2.2, 3.25, 0.14], hex("#090d10"), hex("#24282b"));
  world.box([3.7, 2.85, -7.015], [3.55, 1.55, 0.12], hex("#080d13"), hex("#151e26"));
  world.box([3.7, 2.85, -6.92], [3.32, 1.32, 0.025], hex("#0c151c"));
  // Cartel AWKA con letras modeladas en polígonos, no texto de interfaz.
  world.box([0, 3.72, -7.015], [3.85, 0.9, 0.16], hex("#030507"), hex("#202328"));
  addPixelText(world, "AWKA", 0, 3.72, -6.91, 0.105, hex("#e0d6c2"));
  world.box([-5.6, 4.18, -6.96], [0.18, 0.12, 0.08], hex("#a27a4c"));
  // Apliques cálidos industriales y pequeñas sombras de luz sobre el patio.
  for (const x of [-6.9, 6.9]) {
    world.box([x, 3.78, -6.91], [0.34, 0.38, 0.2], hex("#34312d"));
    world.box([x, 3.77, -6.77], [0.22, 0.21, 0.08], hex("#d4a36b"));
    world.triangle([x - 0.12, 3.64, -6.72], [x - 1.3, 0.02, -3.4], [x + 1.25, 0.02, -3.4], hex("#4b3c35"));
  }

  // Dos banquetas/bancos rústicos junto al frente del contenedor.
  for (const x of [-4.2, 4.55]) {
    for (const z of [-5.2, -3.9]) {
      world.box([x, 0.48, z], [1.35, 0.16, 0.42], wood, woodLight);
      for (const dx of [-0.5, 0.5]) {
        world.box([x + dx, 0.24, z], [0.12, 0.5, 0.12], woodDark);
      }
    }
  }

  // Mesa de madera y banquito del protagonista.
  const tableX = 2.3, tableZ = -3.25;
  world.box([tableX, 0.91, tableZ], [2.05, 0.16, 1.12], woodLight, wood);
  for (const dx of [-0.78, 0.78]) {
    for (const dz of [-0.36, 0.36]) {
      world.box([tableX + dx, 0.43, tableZ + dz], [0.13, 0.88, 0.13], woodDark);
    }
  }
  world.box([tableX, 0.77, tableZ + 0.35], [1.6, 0.1, 0.1], wood);
  world.box([tableX, 0.77, tableZ - 0.35], [1.6, 0.1, 0.1], wood);

  // Banquito individual: asiento grueso, cuatro patas y travesaños.
  const stoolX = 2.3, stoolZ = -0.72;
  world.box([stoolX, 0.78, stoolZ], [1.05, 0.16, 0.72], wood, woodLight);
  for (const dx of [-0.38, 0.38]) {
    for (const dz of [-0.25, 0.25]) {
      world.box([stoolX + dx, 0.38, stoolZ + dz], [0.12, 0.78, 0.12], woodDark);
    }
  }
  world.box([stoolX, 0.3, stoolZ], [0.85, 0.1, 0.55], wood);

  // Reja perimetral negra: postes, barrotes y travesaños.
  const fenceZ = 5.4;
  world.box([0, 1.55, fenceZ], [17.4, 0.16, 0.16], blackMetal);
  world.box([0, 0.18, fenceZ], [17.4, 0.16, 0.16], blackMetal);
  for (let x = -8.55; x <= 8.56; x += 0.42) {
    world.box([x, 0.89, fenceZ], [0.075, 1.45, 0.09], hex("#080a0d"));
    world.cone(x, 1.63, fenceZ, 0.052, 0.16, 4, hex("#171c22"));
  }
  for (const x of [-8.7, 0, 8.7]) {
    world.box([x, 0.9, fenceZ], [0.2, 1.9, 0.2], hex("#171b20"));
  }
  // Laterales de la reja, formando un pequeño patio cerrado.
  for (const side of [-1, 1]) {
    const x = side * 8.65;
    world.box([x, 0.16, -0.5], [0.16, 0.16, 11.8], blackMetal);
    world.box([x, 1.5, -0.5], [0.16, 0.16, 11.8], blackMetal);
    for (let z = -6.2; z < 5.4; z += 0.46) {
      world.box([x, 0.88, z], [0.09, 1.4, 0.09], blackMetal);
    }
  }
  // Pinos y sombras en el exterior, apenas visibles en la noche.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const x = side * (10.2 + i * 1.5);
      const z = 8 - i * 4.2;
      world.box([x, 1.4, z], [0.22, 2.8, 0.22], hex("#241f1c"));
      world.cone(x, 2.5, z, 1.2, 3.4, 5, hex("#1c292e"));
      world.cone(x, 3.4, z, 0.88, 2.4, 5, hex("#28333a"));
    }
  }

  return world;
}

function buildTwilightSky() {
  const sky = new MeshBuilder();
  const z = -38;
  const bands = [
    { y0: -4, y1: 1, color: hex("#9d5b48") },
    { y0: 1, y1: 5, color: hex("#c07859") },
    { y0: 5, y1: 9, color: hex("#bd8068") },
    { y0: 9, y1: 14, color: hex("#555b72") },
    { y0: 14, y1: 23, color: hex("#222d46") },
    { y0: 23, y1: 34, color: hex("#151f35") },
  ];
  for (const band of bands) {
    sky.quad([-70, band.y0, z], [70, band.y0, z], [70, band.y1, z], [-70, band.y1, z], band.color);
  }
  return sky;
}

function buildMoonAndUfo() {
  const sky = new MeshBuilder();
  const moonX = -10.5, moonY = 15.2, moonZ = -35, moonR = 1.22;
  const center: V3 = [moonX, moonY, moonZ];
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    const b = ((i + 1) / 32) * Math.PI * 2;
    sky.triangle(center,
      [moonX + Math.cos(a) * moonR, moonY + Math.sin(a) * moonR, moonZ],
      [moonX + Math.cos(b) * moonR, moonY + Math.sin(b) * moonR, moonZ],
      hex("#d9d4c1"));
  }
  sky.box([moonX - 0.34, moonY + 0.22, moonZ + 0.012], [0.21, 0.12, 0.018], hex("#b7b7aa"));
  sky.box([moonX + 0.28, moonY - 0.28, moonZ + 0.012], [0.28, 0.16, 0.018], hex("#aaa99f"));
  sky.box([moonX + 0.12, moonY + 0.48, moonZ + 0.012], [0.13, 0.09, 0.018], hex("#c2c1b5"));

  // OVNI facetado, visible por encima del techo del contenedor.
  const ufoX = -3.9, ufoY = 10.7, ufoZ = -17.5;
  sky.box([ufoX, ufoY, ufoZ], [2.75, 0.28, 1.05], hex("#303c49"), hex("#78818b"));
  sky.box([ufoX, ufoY + 0.13, ufoZ], [1.72, 0.18, 0.76], hex("#8c9999"), hex("#4e6069"));
  sky.cone(ufoX, ufoY + 0.16, ufoZ, 0.58, 0.66, 7, hex("#9da9a5"));
  sky.beam([ufoX - 1.23, ufoY - 0.08, ufoZ], [ufoX + 1.23, ufoY - 0.08, ufoZ], 0.045, hex("#b3c7bd"));
  for (let i = 0; i < 7; i++) {
    const x = ufoX - 1.05 + i * 0.35;
    sky.box([x, ufoY - 0.18, ufoZ + 0.12], [0.12, 0.07, 0.1], i % 2 ? hex("#b3d2c6") : hex("#d3d2bd"));
  }
  sky.box([ufoX - 0.62, ufoY - 0.39, ufoZ], [0.12, 0.12, 0.12], hex("#b7c9bb"));
  sky.box([ufoX, ufoY - 0.43, ufoZ], [0.14, 0.14, 0.14], hex("#c6d4c8"));
  sky.box([ufoX + 0.62, ufoY - 0.39, ufoZ], [0.12, 0.12, 0.12], hex("#b7c9bb"));
  return sky;
}

type FirstPersonAction = "idle" | "climb" | "walk" | "seated" | "bag" | "reach" | "freeze";

function buildFirstPersonHands(action: FirstPersonAction, stride = 1) {
  const hands = new MeshBuilder();
  const sleeve = hex("#242a31");
  const sleeveLight = hex("#3b4148");
  const skin = hex("#9c725b");
  const skinLight = hex("#b88b70");
  if (action === "climb") {
    hands.beam([-0.76, -0.72, -0.42], [-0.54, -0.16, -1.08], 0.34, sleeve);
    hands.beam([0.76, -0.72, -0.42], [0.54, -0.16, -1.08], 0.34, sleeveLight);
    hands.box([-0.54, -0.08, -1.08], [0.29, 0.24, 0.28], skin);
    hands.box([0.54, -0.08, -1.08], [0.29, 0.24, 0.28], skin);
    for (let i = 0; i < 4; i++) {
      const dx = (i - 1.5) * 0.065;
      hands.beam([-0.62 + dx, -0.1, -1.17], [-0.62 + dx, 0.05, -1.17], 0.045, skinLight);
      hands.beam([0.46 + dx, -0.1, -1.17], [0.46 + dx, 0.05, -1.17], 0.045, skinLight);
    }
    return hands;
  }
  if (action === "seated" || action === "bag" || action === "reach" || action === "freeze") {
    const leftEnd: V3 = action === "reach" ? [-0.56, -0.83, -1.9] : [-0.43, -0.56, -1.35];
    const rightEnd: V3 = action === "bag" ? [0.48, -0.43, -1.35]
      : action === "reach" ? [0.55, -0.88, -2.1]
      : action === "freeze" ? [0.56, -0.35, -1.15]
      : [0.43, -0.56, -1.35];
    hands.beam([-0.9, -1.0, -0.08], leftEnd, 0.34, sleeve);
    hands.beam([0.9, -1.0, -0.08], rightEnd, 0.34, sleeveLight);
    hands.box([leftEnd[0], leftEnd[1] - 0.02, leftEnd[2]], [0.22, 0.18, 0.2], skin);
    hands.box([rightEnd[0], rightEnd[1] - 0.02, rightEnd[2]], [0.22, 0.18, 0.2], skinLight);
    for (let i = 0; i < 4; i++) {
      const dx = (i - 1.5) * 0.052;
      hands.beam([rightEnd[0] + dx, rightEnd[1] - 0.03, rightEnd[2] - 0.08],
        [rightEnd[0] + dx, rightEnd[1] - 0.1, rightEnd[2] - 0.16], 0.038, skin);
    }
    if (action === "freeze") hands.beam([0.56, -0.28, -1.14], [0.68, -0.1, -1.12], 0.11, skin);
    return hands;
  }
  const swing = action === "walk" ? 0.17 * stride : 0;
  hands.beam([-0.84, -1.02, -0.06], [-0.48, -0.56 + swing, -1.08], 0.34, sleeve);
  hands.beam([0.84, -1.02, -0.06], [0.48, -0.56 - swing, -1.08], 0.34, sleeveLight);
  hands.box([-0.48, -0.58 + swing, -1.12], [0.23, 0.18, 0.2], skin);
  hands.box([0.48, -0.58 - swing, -1.12], [0.23, 0.18, 0.2], skinLight);
  return hands;
}

function buildHeldBag() {
  const bag = new MeshBuilder();
  bag.box([0.48, -0.28, -1.43], [0.22, 0.035, 0.18], hex("#e9e7e0"), hex("#c9c6bd"));
  bag.triangle([0.37, -0.26, -1.48], [0.49, -0.18, -1.4], [0.59, -0.26, -1.35], hex("#f5f3eb"));
  bag.beam([0.39, -0.27, -1.38], [0.57, -0.27, -1.47], 0.022, hex("#ffffff"));
  return bag;
}

function buildTableProps() {
  const props = new MeshBuilder();
  // Bolsa blanca pequeña, cerrada y ligeramente arrugada.
  props.box([2.12, 1.025, -3.15], [0.26, 0.035, 0.21], hex("#e4e2d9"), hex("#bdbbb3"));
  props.triangle([2.0, 1.045, -3.22], [2.11, 1.11, -3.12], [2.24, 1.045, -3.08], hex("#f1eee6"));
  props.beam([2.03, 1.052, -3.13], [2.2, 1.052, -3.17], 0.025, hex("#ffffff"));
  return props;
}

function buildPowderLine() {
  const line = new MeshBuilder();
  // Trazo fino y discreto sobre la madera; se muestra sin un primer plano de consumo.
  line.beam([2.32, 1.012, -3.0], [2.86, 1.012, -3.0], 0.024, hex("#e6e4dc"));
  line.beam([2.34, 1.018, -2.99], [2.82, 1.018, -2.99], 0.012, hex("#ffffff"));
  return line;
}

function buildPoliceHeadlights() {
  const lights = new MeshBuilder();
  const white = hex("#f7f4e9");
  // Dos haces largos provenientes de un vehículo que permanece fuera de cuadro.
  lights.triangle([-3.45, 0.12, 9.8], [-1.5, 0.12, -7.4], [-7.4, 0.12, -7.4], hex("#8a8f8b"));
  lights.triangle([3.45, 0.12, 9.8], [7.4, 0.12, -7.4], [1.5, 0.12, -7.4], hex("#8a8f8b"));
  lights.box([-3.45, 1.1, 10.1], [0.9, 0.34, 0.16], white);
  lights.box([3.45, 1.1, 10.1], [0.9, 0.34, 0.16], white);
  return lights;
}

function makeShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("No se pudo crear el shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "Error de shader";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

const VERTEX_SHADER = [
  "attribute vec3 aPosition;",
  "attribute vec3 aNormal;",
  "attribute vec3 aColor;",
  "uniform mat4 uViewProjection;",
  "uniform mat4 uView;",
  "uniform mat4 uModel;",
  "varying vec3 vColor;",
  "varying vec3 vNormal;",
  "varying float vDepth;",
  "varying vec3 vWorld;",
  "void main(){",
  "vec4 world=uModel*vec4(aPosition,1.0);",
  "vec4 viewPosition=uView*world;",
  "vWorld=world.xyz;",
  "vDepth=length(viewPosition.xyz);",
  "vNormal=mat3(uModel)*aNormal;",
  "vColor=aColor;",
  "gl_Position=uViewProjection*world;",
  "}",
].join("\n");

const FRAGMENT_SHADER = [
  "precision mediump float;",
  "uniform vec2 uResolution;",
  "uniform float uTime;",
  "uniform float uOpacity;",
  "uniform float uPoliceLevel;",
  "varying vec3 vColor;",
  "varying vec3 vNormal;",
  "varying float vDepth;",
  "varying vec3 vWorld;",
  "float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
  "void main(){",
  "vec3 n=normalize(vNormal);",
  "vec3 moon=normalize(vec3(-0.35,0.82,0.4));",
  "float diffuse=max(dot(n,moon),0.0);",
  "float light=0.43+floor(diffuse*3.0)*0.095;",
  "vec3 color=vColor*light;",
  "float fog=smoothstep(25.0,75.0,vDepth);",
  "color=mix(color,vec3(0.13,0.14,0.19),fog);",
  "float depth=max(0.0,10.2-vWorld.z);",
  "float width=0.85+depth*0.23;",
  "float leftSpot=exp(-pow((vWorld.x+3.45)/width,2.0)*1.9)*exp(-depth*0.022);",
  "float rightSpot=exp(-pow((vWorld.x-3.45)/width,2.0)*1.9)*exp(-depth*0.022);",
  "float headlight=clamp(leftSpot+rightSpot,0.0,1.0)*uPoliceLevel;",
  "float ufoDistance=distance(vWorld,vec3(-3.9,10.7,-17.5));",
  "float ufoHalo=exp(-ufoDistance*0.9)*0.21;",
  "color+=vec3(0.20,0.29,0.34)*ufoHalo;",
  "color=mix(color,vec3(0.91,0.92,0.88),headlight*0.88);",
  "float scan=1.0-0.023*(0.5+0.5*sin(gl_FragCoord.y*3.14159));",
  "float grain=(hash(floor(gl_FragCoord.xy*0.76)+floor(uTime*9.0))-0.5)*0.024;",
  "color=color*scan+grain;",
  "vec2 uv=gl_FragCoord.xy/max(uResolution,vec2(1.0));",
  "float vignette=1.0-smoothstep(0.25,0.92,length((uv-0.5)*vec2(1.0,0.84)));",
  "color*=mix(0.46,1.0,vignette);",
  "gl_FragColor=vec4(color,uOpacity);",
  "}",
].join("\n");

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

function modelMatrix(x: number, y: number, z: number, yaw = 0) {
  const matrix = new Float32Array(16);
  const c = Math.cos(yaw), s = Math.sin(yaw);
  matrix[0] = c; matrix[2] = -s;
  matrix[5] = 1;
  matrix[8] = s; matrix[10] = c;
  matrix[12] = x; matrix[13] = y; matrix[14] = z; matrix[15] = 1;
  return matrix;
}

function createMesh(gl: WebGLRenderingContext, builder: MeshBuilder): Mesh {
  const data = builder.data();
  const buffer = gl.createBuffer();
  if (!buffer) throw new Error("No se pudo crear una malla");
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return { buffer, count: data.length / 9 };
}

function drawMesh(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  mesh: Mesh,
  viewProjection: Float32Array,
  view: Float32Array,
  model: Float32Array,
  opacity: number,
  policeLevel: number,
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
  gl.uniform1f(gl.getUniformLocation(program, "uPoliceLevel"), policeLevel);
  gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
}

type CameraKey = { time: number; eye: V3; target: V3 };
const CAMERA_KEYS: CameraKey[] = [
  { time: 0, eye: [-3.2, 1.7, 10.5], target: [-3.2, 1.7, -8] },
  { time: 0.8, eye: [-3.2, 1.7, 10.45], target: [-7.5, 1.8, -5] },
  { time: 1.6, eye: [-3.2, 1.7, 10.35], target: [2.8, 1.8, -6] },
  { time: 2.45, eye: [-3.2, 1.7, 9.65], target: [-3.1, 1.8, -9] },
  { time: 3.15, eye: [-3.2, 1.7, 8.15], target: [-3.2, 1.85, 5.25] },
  { time: 3.85, eye: [-3.2, 1.78, 7.0], target: [-3.2, 2.6, 3.0] },
  { time: 4.55, eye: [-3.2, 2.02, 5.85], target: [-3.7, 6.6, -17.5] },
  { time: 5.2, eye: [-3.2, 2.18, 4.65], target: [-3.2, 3.0, -7] },
  { time: 5.85, eye: [-3.2, 1.72, 3.45], target: [-3.2, 1.7, -9] },
  { time: 6.45, eye: [-2.1, 1.68, 1.25], target: [0.2, 1.45, -6] },
  { time: 7.35, eye: [0.3, 1.68, -0.25], target: [2.2, 1.2, -4.5] },
  { time: 8.35, eye: [2.3, 1.82, -0.72], target: [2.3, 0.92, -3.25] },
  { time: 9.05, eye: [2.3, 1.82, -0.72], target: [2.3, 0.92, -3.25] },
  { time: 11.85, eye: [2.3, 1.82, -0.72], target: [2.3, 0.92, -3.25] },
  { time: 12.18, eye: [2.3, 1.82, -0.72], target: [0, 2.05, 12] },
  { time: 15, eye: [2.3, 1.82, -0.72], target: [0, 2.05, 12] },
];

function cameraAt(time: number) {
  for (let i = 0; i < CAMERA_KEYS.length - 1; i++) {
    const a = CAMERA_KEYS[i]!, b = CAMERA_KEYS[i + 1]!;
    if (time <= b.time) {
      const t = smooth(a.time, b.time, time);
      return { eye: mix3(a.eye, b.eye, t), target: mix3(a.target, b.target, t) };
    }
  }
  const last = CAMERA_KEYS[CAMERA_KEYS.length - 1]!;
  return { eye: last.eye, target: last.target };
}

function handsActionAt(time: number): FirstPersonAction {
  if (time < 3.1) return "idle";
  if (time < 5.9) return "climb";
  if (time < 8.25) return "walk";
  if (time < 9.05) return "seated";
  if (time < 9.65) return "bag";
  if (time < 12) return "reach";
  return "freeze";
}

function cameraYaw(eye: V3, target: V3) {
  return Math.atan2(-(target[0] - eye[0]), -(target[2] - eye[2]));
}

export function Route40AwkaCinematic() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cutRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: true,
      powerPreference: "low-power",
      preserveDrawingBuffer: false,
    });
    if (!canvas || !gl) return;

    let active = true;
    let started = false;
    let ended = false;
    let startedAt = 0;
    let frame = 0;
    let sirenPlayed = false;
    let program: WebGLProgram | null = null;
    const resources: Mesh[] = [];

    try {
      const vertex = makeShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
      const fragment = makeShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
      program = gl.createProgram();
      if (!program) throw new Error("No se pudo crear el programa gráfico");
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) || "No se pudo enlazar la escena");
      }

      const make = (builder: MeshBuilder) => {
        const mesh = createMesh(gl, builder);
        resources.push(mesh);
        return mesh;
      };
      const sky = make(buildTwilightSky());
      const celestial = make(buildMoonAndUfo());
      const world = make(buildAwkaWorld());
      const idleHands = make(buildFirstPersonHands("idle"));
      const climbHands = make(buildFirstPersonHands("climb"));
      const walkingHands = make(buildFirstPersonHands("walk", 1));
      const walkingHandsAlt = make(buildFirstPersonHands("walk", -1));
      const seatedHands = make(buildFirstPersonHands("seated"));
      const bagHands = make(buildFirstPersonHands("bag"));
      const reachHands = make(buildFirstPersonHands("reach"));
      const freezeHands = make(buildFirstPersonHands("freeze"));
      const bag = make(buildTableProps());
      const heldBag = make(buildHeldBag());
      const powder = make(buildPowderLine());
      const police = make(buildPoliceHeadlights());

      gl.useProgram(program);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.disable(gl.CULL_FACE);
      gl.clearColor(0.12, 0.075, 0.09, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const resolutionLocation = gl.getUniformLocation(program, "uResolution");
      const timeLocation = gl.getUniformLocation(program, "uTime");
      const policeMeshLocation = gl.getUniformLocation(program, "uPoliceLevel");

      const animate = (now: number) => {
        if (!active || !program) return;
        if (!started) {
          started = true;
          startedAt = now;
        }
        const elapsed = Math.min(DURATION, Math.max(0, (now - startedAt) / 1000));
        const rect = canvas.getBoundingClientRect();
        const width = Math.max(1, rect.width);
        const height = Math.max(1, rect.height);
        const dpr = Math.min(1.2, window.devicePixelRatio || 1);
        const pw = Math.max(1, Math.round(width * dpr));
        const ph = Math.max(1, Math.round(height * dpr));
        if (canvas.width !== pw || canvas.height !== ph) {
          canvas.width = pw;
          canvas.height = ph;
        }
        gl.viewport(0, 0, pw, ph);
        gl.clearColor(0.12, 0.075, 0.09, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(program);
        gl.uniform2f(resolutionLocation, pw, ph);
        gl.uniform1f(timeLocation, elapsed);

        const camera = cameraAt(elapsed);
        // Movimiento subjetivo: oscilación de cabeza mínima al caminar.
        const walkSway = elapsed > 5.8 && elapsed < 8.25 ? Math.sin(elapsed * 8.5) * 0.025 : 0;
        const eye: V3 = [camera.eye[0] + walkSway, camera.eye[1], camera.eye[2]];
        const view = lookAt(eye, camera.target, [0, 1, 0]);
        const projection = perspective(59 * Math.PI / 180, width / height, 0.1, 180);
        const viewProjection = multiply(projection, view);
        const identity = modelMatrix(0, 0, 0);
        const policeLevel = elapsed < 12 ? 0 : smooth(12.0, 12.16, elapsed) * (0.94 + 0.06 * Math.sin(elapsed * 13));
        gl.uniform1f(policeMeshLocation, policeLevel);

        // Fondo de atardecer, luna y OVNI geométrico, integrados al escenario.
        drawMesh(gl, program, sky, viewProjection, view, identity, 1, policeLevel);
        drawMesh(gl, program, celestial, viewProjection, view, identity, 1, policeLevel);
        drawMesh(gl, program, world, viewProjection, view, identity, 1, policeLevel);

        const yaw = cameraYaw(eye, camera.target);
        const handsAction = handsActionAt(elapsed);
        const handsMesh = handsAction === "idle" ? idleHands
          : handsAction === "climb" ? climbHands
          : handsAction === "walk" ? (Math.sin(elapsed * 9) > 0 ? walkingHands : walkingHandsAlt)
          : handsAction === "seated" ? seatedHands
          : handsAction === "bag" ? bagHands
          : handsAction === "reach" ? reachHands : freezeHands;
        const firstPersonModel = modelMatrix(eye[0], eye[1], eye[2], yaw);
        drawMesh(gl, program, handsMesh, viewProjection, view, firstPersonModel, 1, policeLevel);

        const heldBagOpacity = smooth(9.0, 9.12, elapsed) * (1 - smooth(9.38, 9.58, elapsed));
        if (heldBagOpacity > 0.01) {
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.depthMask(false);
          drawMesh(gl, program, heldBag, viewProjection, view, firstPersonModel, heldBagOpacity, policeLevel);
          gl.depthMask(true);
          gl.disable(gl.BLEND);
        }

        const bagOpacity = smooth(9.35, 9.78, elapsed);
        if (bagOpacity > 0.01) {
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.depthMask(false);
          drawMesh(gl, program, bag, viewProjection, view, identity, bagOpacity, policeLevel);
          gl.depthMask(true);
          gl.disable(gl.BLEND);
        }
        const lineOpacity = smooth(10.5, 11.15, elapsed);
        if (lineOpacity > 0.01) {
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.depthMask(false);
          drawMesh(gl, program, powder, viewProjection, view, identity, lineOpacity, policeLevel);
          gl.depthMask(true);
          gl.disable(gl.BLEND);
        }
        if (policeLevel > 0.01) {
          gl.enable(gl.BLEND);
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          gl.depthMask(false);
          drawMesh(gl, program, police, viewProjection, view, identity, 0.28 + policeLevel * 0.3, policeLevel);
          gl.depthMask(true);
          gl.disable(gl.BLEND);
        }

        if (elapsed >= DURATION && !ended) {
          ended = true;
          if (cutRef.current) cutRef.current.style.opacity = "1";
          if (!sirenPlayed) {
            sirenPlayed = true;
            playAwkaSirenAudio();
          }
          return;
        }
        frame = window.requestAnimationFrame(animate);
      };

      frame = window.requestAnimationFrame(animate);
    } catch (error) {
      console.error("No se pudo iniciar la cinemática AWKA", error);
      if (program) gl.deleteProgram(program);
    }

    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      for (const mesh of resources) gl.deleteBuffer(mesh.buffer);
      if (program) gl.deleteProgram(program);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[2100] h-[100svh] w-screen overflow-hidden bg-[#030609]">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="Cinemática de quince segundos en AWKA: un protagonista low poly entra al patio de una cervecería en un contenedor negro, se sienta en un banco de madera y es sorprendido por los faros de un vehículo policial."
      />
      <div
        ref={cutRef}
        className="pointer-events-none absolute inset-0 z-30 bg-black"
        style={{ opacity: 0, transition: "none" }}
      />
      <div className="pointer-events-none absolute inset-0 z-20 opacity-[0.12] mix-blend-screen" style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.58) 0px, rgba(0,0,0,0.58) 1px, transparent 1px, transparent 4px)" }} />
      <div className="pointer-events-none absolute inset-0 z-20 opacity-[0.18]" style={{ background: "linear-gradient(90deg, rgba(186,70,66,0.12), transparent 16%, transparent 84%, rgba(75,151,174,0.12)), radial-gradient(ellipse at center, transparent 46%, rgba(0,0,0,0.58) 100%)" }} />
    </div>
  );
}
