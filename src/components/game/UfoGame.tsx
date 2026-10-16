import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import bg from "@/assets/piltriquitron.png.asset.json";

/* OVNIS EN EL BOLSÓN — juego 2D lateral en Canvas. Finales futuros: agregar entradas a ENDINGS. */
const W = 960, H = 540, GROUND = 450, WORLD = 3200;
const ENDINGS = {
  revenge: { title: "¡FELICIDADES! MATASTE AL OVNI PERO NO RECUPERASTE TU GATO", sub: "FINAL N.º 1 — VENGANZA EN LA COMARCA" },
} as const;
type Ending = keyof typeof ENDINGS;
type Screen = "title" | "play" | "paused" | "win" | "lose";

type Shot = { x: number; y: number; vx: number; vy: number; life: number };
function newState() {
  return {
    t: 0, phase: "walk" as "walk" | "descend" | "beam" | "rise" | "noo" | "draw" | "fight" | "boom" | "over",
    pt: 0, cam: 0,
    p: { x: 200, y: GROUND, vy: 0, face: 1, hp: 100, hurt: 0, crouch: false, armed: 0, flash: 0, walk: 0 },
    cat: { x: 150, y: GROUND, gone: false, walk: 0 },
    u: { x: 600, y: -80, hp: 100, hit: 0, tx: 600, cd: 2, vis: false },
    shots: [] as Shot[], lasers: [] as Shot[], fx: [] as { x: number; y: number; life: number; c: string }[],
    msg: "", msgT: 0, keys: {} as Record<string, boolean>, fire: false, fireCd: 0,
  };
}
type S = ReturnType<typeof newState>;

export function UfoGame() {
  const cv = useRef<HTMLCanvasElement>(null);
  const st = useRef<S>(newState());
  const img = useRef<HTMLImageElement | null>(null);
  const [screen, setScreen] = useState<Screen>("title");
  const [ending, setEnding] = useState<Ending | null>(null);
  const [touch, setTouch] = useState(false);
  const screenRef = useRef(screen);
  screenRef.current = screen;

  useEffect(() => {
    const i = new Image(); i.src = bg.url; img.current = i;
    setTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  // teclado
  useEffect(() => {
    const map: Record<string, string> = { a: "l", arrowleft: "l", d: "r", arrowright: "r", w: "j", arrowup: "j", " ": "j", s: "c", arrowdown: "c" };
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "escape") { setScreen((s) => (s === "play" ? "paused" : s === "paused" ? "play" : s)); return; }
      if (map[k]) { st.current.keys[map[k]] = true; if (screenRef.current === "play") e.preventDefault(); }
    };
    const up = (e: KeyboardEvent) => { const k = map[e.key.toLowerCase()]; if (k) st.current.keys[k] = false; };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  // bucle
  useEffect(() => {
    if (screen !== "play") return;
    const ctx = cv.current!.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const r = update(st.current, dt);
      draw(ctx, st.current, img.current);
      if (r) { setEnding(r === "win" ? "revenge" : null); setScreen(r); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [screen]);

  const start = () => { st.current = newState(); setEnding(null); setScreen("play"); };
  const hold = (k: string) => ({
    onPointerDown: (e: React.PointerEvent) => { e.preventDefault(); st.current.keys[k] = true; },
    onPointerUp: () => { st.current.keys[k] = false; },
    onPointerLeave: () => { st.current.keys[k] = false; },
    onPointerCancel: () => { st.current.keys[k] = false; },
  });

  return (
    <div className="relative flex h-full w-full items-center justify-center bg-background select-none">
      <div className="relative w-full max-h-full" style={{ aspectRatio: "16/9", maxWidth: "calc(100svh * 16 / 9)" }}>
        <canvas
          ref={cv} width={W} height={H}
          className="h-full w-full border border-border [image-rendering:pixelated]"
          onPointerDown={(e) => { if (e.pointerType === "mouse" && e.button === 0) st.current.fire = true; }}
          onPointerUp={() => { st.current.fire = false; }}
          onContextMenu={(e) => e.preventDefault()}
        />
        {screen === "play" && (
          <button onClick={() => setScreen("paused")} className="label-mono absolute right-3 top-3 border border-silver/40 bg-background/60 px-3 py-1.5 !text-foreground">
            Pausa
          </button>
        )}
        {screen === "play" && touch && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-3">
            <div className="pointer-events-auto flex gap-3">
              <TBtn {...hold("l")}>◀</TBtn><TBtn {...hold("r")}>▶</TBtn>
            </div>
            <div className="pointer-events-auto flex items-end gap-3">
              <TBtn {...hold("j")}>▲</TBtn>
              <button
                onPointerDown={(e) => { e.preventDefault(); st.current.fire = true; }}
                onPointerUp={() => { st.current.fire = false; }} onPointerLeave={() => { st.current.fire = false; }}
                className="h-20 w-20 rounded-full border-2 border-celeste/70 bg-celeste/25 font-mono text-xs text-foreground"
              >FUEGO</button>
            </div>
          </div>
        )}
        {screen !== "play" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/75 px-6 text-center backdrop-blur-sm">
            {screen === "title" && <>
              <p className="label-mono !text-celeste">APFAA · Juego test</p>
              <h1 className="display-serif text-4xl md:text-7xl">OVNIS EN EL BOLSÓN</h1>
              <p className="font-serif text-lg italic text-foreground/80 md:text-2xl">Una noche tranquila en la Patagonia…</p>
              <button onClick={start} className="mt-2 bg-foreground px-10 py-4 font-mono text-lg tracking-widest text-background hover:bg-celeste">JUGAR</button>
              <p className="label-mono mt-2 max-w-md">{touch ? "Botones en pantalla · girá el celular en horizontal" : "A/D moverse · W saltar · S agacharse · clic izquierdo disparar · ESC pausa"}</p>
            </>}
            {screen === "paused" && <>
              <h2 className="display-serif text-5xl">Pausa</h2>
              <button onClick={() => setScreen("play")} className="bg-foreground px-8 py-3 font-mono text-background hover:bg-celeste">CONTINUAR</button>
              <Link to="/" className="label-mono hover:!text-celeste">Volver a APFAA</Link>
            </>}
            {screen === "win" && ending && <>
              <h2 className="display-serif max-w-3xl text-2xl md:text-5xl">{ENDINGS[ending].title}</h2>
              <p className="label-mono !text-celeste md:!text-sm">{ENDINGS[ending].sub}</p>
              <EndButtons start={start} />
            </>}
            {screen === "lose" && <>
              <h2 className="display-serif text-4xl md:text-6xl">TE DERROTARON</h2>
              <p className="label-mono">El gato sigue a bordo del platillo.</p>
              <EndButtons start={start} />
            </>}
          </div>
        )}
      </div>
    </div>
  );
}

function TBtn(p: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...p} className="h-16 w-16 rounded-full border border-silver/50 bg-foreground/15 text-xl text-foreground touch-none" />;
}
function EndButtons({ start }: { start: () => void }) {
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-3">
      <button onClick={start} className="bg-foreground px-6 py-3 font-mono text-background hover:bg-celeste">VOLVER A JUGAR</button>
      <Link to="/" className="border border-silver/50 px-6 py-3 font-mono hover:border-celeste hover:text-celeste">VOLVER A APFAA</Link>
    </div>
  );
}

/* ---------- lógica ---------- */
function say(s: S, m: string, d = 2.2) { s.msg = m; s.msgT = d; }

function update(s: S, dt: number): "win" | "lose" | null {
  const { p, cat, u, keys } = s;
  s.t += dt; s.pt += dt; s.msgT -= dt;
  const canMove = s.phase === "walk" || s.phase === "fight" || s.phase === "descend";
  // jugador
  p.crouch = canMove && !!keys.c && p.y >= GROUND;
  let vx = 0;
  if (canMove && !p.crouch) vx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
  if (vx) p.face = vx;
  const speed = s.phase === "fight" ? 260 : 150;
  p.x = Math.max(40, Math.min(WORLD - 40, p.x + vx * speed * dt));
  p.walk = vx ? p.walk + dt * 10 : 0;
  if (canMove && keys.j && p.y >= GROUND) p.vy = -560;
  p.vy += 1500 * dt; p.y = Math.min(GROUND, p.y + p.vy * dt); if (p.y >= GROUND) p.vy = 0;
  p.hurt -= dt; p.flash -= dt; u.hit -= dt;
  s.cam += (Math.max(0, Math.min(WORLD - W, p.x - W * 0.4)) - s.cam) * Math.min(1, dt * 5);

  // gato
  if (!cat.gone && (s.phase === "walk" || s.phase === "descend")) {
    const tx = p.x - p.face * 50;
    const d = tx - cat.x;
    if (Math.abs(d) > 4) { cat.x += Math.sign(d) * Math.min(Math.abs(d), 200 * dt); cat.walk += dt * 12; }
  }

  switch (s.phase) {
    case "walk":
      if (s.pt > 3.5 || p.x > 520) { s.phase = "descend"; s.pt = 0; u.vis = true; u.x = cat.x + 300; u.y = -60; say(s, "¿Qué es esa luz en el cielo…?"); }
      break;
    case "descend":
      u.x += (cat.x - u.x) * dt * 2; u.y += (240 - u.y) * dt * 1.8;
      if (s.pt > 2.2) { s.phase = "beam"; s.pt = 0; }
      break;
    case "beam":
      u.x += (cat.x - u.x) * dt * 3;
      if (s.pt > 0.6) cat.y = GROUND - (GROUND - u.y - 20) * Math.min(1, (s.pt - 0.6) / 1.6);
      if (s.pt > 2.3) { cat.gone = true; s.phase = "rise"; s.pt = 0; }
      break;
    case "rise":
      u.y += (110 - u.y) * dt * 2; u.x += 160 * dt;
      if (s.pt > 0.4 && s.msgT <= 0) say(s, "¡NOOO! ¡SE LLEVARON A MI GATO!", 2.2);
      if (s.pt > 2.4) { s.phase = "draw"; s.pt = 0; say(s, "Se metieron con el gato equivocado…", 2.2); }
      break;
    case "draw":
      p.armed = Math.min(1, s.pt / 1.2);
      if (s.pt > 2.2) { s.phase = "fight"; s.pt = 0; u.tx = p.x + 200; say(s, "RECUPERÁ A TU GATO", 1.6); }
      break;
    case "fight": {
      // IA OVNI
      if (Math.abs(u.x - u.tx) < 20) u.tx = Math.max(100, Math.min(WORLD - 100, p.x + (Math.random() * 2 - 1) * 380));
      u.x += Math.sign(u.tx - u.x) * Math.min(Math.abs(u.tx - u.x), (140 + (100 - u.hp)) * dt);
      u.y = 120 + Math.sin(s.t * 2) * 25;
      u.cd -= dt;
      if (u.cd <= 0) {
        const ax = p.x + (Math.random() * 2 - 1) * 60, ay = GROUND - 30;
        const dx = ax - u.x, dy = ay - u.y, L = Math.hypot(dx, dy), sp = 330;
        s.lasers.push({ x: u.x, y: u.y + 15, vx: (dx / L) * sp, vy: (dy / L) * sp, life: 4 });
        u.cd = u.hp < 40 ? 0.9 : 1.4;
      }
      // disparo jugador
      s.fireCd -= dt;
      if (s.fire && s.fireCd <= 0) {
        const gx = p.x + p.face * 22, gy = p.y - (p.crouch ? 30 : 46);
        const dx = u.x - gx, dy = u.y - gy, L = Math.hypot(dx, dy);
        s.shots.push({ x: gx, y: gy, vx: (dx / L) * 700, vy: (dy / L) * 700, life: 1.5 });
        p.face = dx >= 0 ? 1 : -1; p.flash = 0.08; s.fireCd = 0.22;
      }
      break;
    }
    case "boom":
      if (s.pt > 1.6) { s.phase = "over"; return "win"; }
      break;
  }

  for (const b of s.shots) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (s.phase === "fight" && Math.abs(b.x - u.x) < 55 && Math.abs(b.y - u.y) < 22) {
      b.life = 0; u.hp -= 4; u.hit = 0.12; s.fx.push({ x: b.x, y: b.y, life: 0.3, c: "#9fd8ff" });
      if (u.hp <= 0) {
        u.hp = 0; s.phase = "boom"; s.pt = 0; s.lasers = [];
        for (let i = 0; i < 26; i++) s.fx.push({ x: u.x + (Math.random() - 0.5) * 120, y: u.y + (Math.random() - 0.5) * 50, life: 0.5 + Math.random(), c: i % 2 ? "#ffb347" : "#fff3c4" });
      }
    }
  }
  for (const l of s.lasers) {
    l.x += l.vx * dt; l.y += l.vy * dt; l.life -= dt;
    const top = p.y - (p.crouch ? 36 : 62);
    if (l.x > p.x - 14 && l.x < p.x + 14 && l.y > top && l.y < p.y && p.hurt <= 0) {
      l.life = 0; p.hp -= 12; p.hurt = 0.6; s.fx.push({ x: l.x, y: l.y, life: 0.35, c: "#5dff7a" });
      if (p.hp <= 0) { p.hp = 0; return "lose"; }
    }
    if (l.y >= GROUND) { l.life = 0; s.fx.push({ x: l.x, y: GROUND, life: 0.3, c: "#5dff7a" }); }
  }
  s.shots = s.shots.filter((b) => b.life > 0);
  s.lasers = s.lasers.filter((b) => b.life > 0);
  s.fx = s.fx.filter((f) => (f.life -= dt) > 0);
  return null;
}

/* ---------- dibujo ---------- */
function rect(c: CanvasRenderingContext2D, col: string, x: number, y: number, w: number, h: number) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); }

function draw(c: CanvasRenderingContext2D, s: S, im: HTMLImageElement | null) {
  const { p, cat, u, cam } = s;
  // cielo + Piltriquitrón (fondo fijo permanente)
  const g = c.createLinearGradient(0, 0, 0, GROUND);
  g.addColorStop(0, "#070b18"); g.addColorStop(1, "#1b2540");
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  if (im && im.complete && im.naturalWidth) {
    const ih = 360, iw = (im.naturalWidth / im.naturalHeight) * ih;
    const ox = -((cam * 0.08) % 1) - cam * 0.08 * 0; // casi fijo
    c.globalAlpha = 0.95;
    for (let x = ox - iw; x < W + iw; x += iw) c.drawImage(im, Math.round(x - cam * 0.05 % iw), GROUND - ih + 20, iw, ih);
    c.globalAlpha = 1;
  }
  c.fillStyle = "rgba(7,11,24,0.25)"; c.fillRect(0, 0, W, GROUND);
  // estrellas
  c.fillStyle = "#e8e6df";
  for (let i = 0; i < 40; i++) c.fillRect((i * 137) % W, (i * 53) % 90, 2, 2);

  c.save(); c.translate(-Math.round(cam), 0);
  // árboles y casas (capa media reutilizada)
  for (let x = 0; x < WORLD; x += 260) {
    const k = (x / 260) % 3;
    if (k === 0) { // casa
      rect(c, "#3a2e2a", x + 20, GROUND - 90, 120, 90); rect(c, "#5b2b26", x + 10, GROUND - 110, 140, 22);
      rect(c, "#f4d27a", x + 40, GROUND - 70, 22, 22); rect(c, "#f4d27a", x + 95, GROUND - 70, 22, 22);
      rect(c, "#20180f", x + 66, GROUND - 50, 22, 50);
    } else if (k === 1) { // árbol
      rect(c, "#2b1d14", x + 60, GROUND - 60, 12, 60);
      rect(c, "#1c3a2a", x + 36, GROUND - 130, 60, 80); rect(c, "#244a35", x + 46, GROUND - 160, 40, 40);
    } else { // poste
      rect(c, "#2a2a2a", x + 80, GROUND - 150, 6, 150); rect(c, "#2a2a2a", x + 60, GROUND - 150, 46, 5);
      rect(c, "#ffe9a8", x + 62, GROUND - 145, 10, 6);
    }
  }
  // calle
  rect(c, "#23242a", 0, GROUND, WORLD, H - GROUND);
  for (let x = 0; x < WORLD; x += 80) rect(c, "#8a8576", x, GROUND + 40, 40, 4);
  rect(c, "#3a3b40", 0, GROUND, WORLD, 6);

  // rayo de abducción
  if (u.vis && s.phase === "beam") {
    c.fillStyle = `rgba(160,230,255,${0.25 + Math.sin(s.t * 20) * 0.08})`;
    c.beginPath(); c.moveTo(u.x - 20, u.y + 14); c.lineTo(u.x + 20, u.y + 14); c.lineTo(u.x + 55, GROUND); c.lineTo(u.x - 55, GROUND); c.fill();
  }
  // gato
  if (!cat.gone) drawCat(c, cat.x, cat.y, cat.walk, s.phase === "beam");
  // restos tras explosión
  if (s.phase === "boom" || s.phase === "over") {
    rect(c, "#6b7280", u.x - 40, GROUND - 8, 30, 8); rect(c, "#9ca3af", u.x + 10, GROUND - 6, 24, 6); rect(c, "#4b5563", u.x - 5, GROUND - 12, 14, 12);
  }
  drawPlayer(c, s);
  // OVNI
  if (u.vis && s.phase !== "boom" && s.phase !== "over") drawUfo(c, u.x, u.y, s.t, u.hit > 0);
  // proyectiles
  for (const b of s.shots) { rect(c, "#9fd8ff", b.x - 4, b.y - 2, 8, 4); }
  c.strokeStyle = "#5dff7a"; c.lineWidth = 4;
  for (const l of s.lasers) { c.beginPath(); c.moveTo(l.x, l.y); c.lineTo(l.x - l.vx * 0.06, l.y - l.vy * 0.06); c.stroke(); }
  for (const f of s.fx) { const r = 6 + (1 - f.life) * 18; c.fillStyle = f.c; c.globalAlpha = Math.min(1, f.life * 2); c.fillRect(f.x - r / 2, f.y - r / 2, r, r); }
  c.globalAlpha = 1;
  c.restore();

  // HUD
  c.font = "14px 'IBM Plex Mono', monospace"; c.textBaseline = "top";
  c.fillStyle = "#e8e6df"; c.fillText("SALUD", 20, 18);
  rect(c, "#333", 80, 20, 160, 12); rect(c, p.hp > 30 ? "#7cc6ff" : "#ff6b6b", 80, 20, 1.6 * p.hp, 12);
  if (s.phase === "fight" || s.phase === "boom") {
    c.fillText("OVNI", W / 2 - 150, 18);
    rect(c, "#333", W / 2 - 100, 20, 250, 12); rect(c, "#5dff7a", W / 2 - 100, 20, 2.5 * u.hp, 12);
    c.fillStyle = "#9fd8ff"; c.fillText("OBJETIVO: RECUPERÁ A TU GATO", 20, 42);
  }
  if (s.phase === "walk" && s.t < 3.4) { c.fillStyle = "rgba(232,230,223,0.7)"; c.fillText("A / D o flechas para caminar", 20, 42); }
  if (s.msgT > 0) {
    c.font = "bold 30px 'IBM Plex Mono', monospace"; c.textAlign = "center";
    c.fillStyle = "rgba(0,0,0,0.6)"; c.fillRect(0, 150, W, 56);
    c.fillStyle = "#fff"; c.fillText(s.msg, W / 2, 162); c.textAlign = "left";
  }
}

function drawCat(c: CanvasRenderingContext2D, x: number, y: number, w: number, floating: boolean) {
  const leg = floating ? 0 : Math.round(Math.sin(w) * 2);
  rect(c, "#d9822b", x - 12, y - 14, 22, 9); // cuerpo
  rect(c, "#d9822b", x + 8, y - 20, 10, 10); // cabeza
  rect(c, "#d9822b", x + 8, y - 23, 3, 3); rect(c, "#d9822b", x + 15, y - 23, 3, 3);
  rect(c, "#111", x + 14, y - 17, 2, 2);
  rect(c, "#d9822b", x - 16, y - 22, 4, 10); // cola
  rect(c, "#b56a1f", x - 10, y - 5 + leg, 3, 5); rect(c, "#b56a1f", x + 5, y - 5 - leg, 3, 5);
}

function drawPlayer(c: CanvasRenderingContext2D, s: S) {
  const p = s.p;
  if (p.hurt > 0 && Math.floor(p.hurt * 20) % 2) return;
  const x = p.x, y = p.y, f = p.face, cr = p.crouch ? 18 : 0;
  const leg = Math.round(Math.sin(p.walk) * 5);
  // piernas + zapatillas
  if (!p.crouch) {
    rect(c, "#15161a", x - 8 + leg, y - 26, 7, 22); rect(c, "#15161a", x + 1 - leg, y - 26, 7, 22);
    rect(c, "#f2f2f2", x - 10 + leg, y - 5, 11, 5); rect(c, "#f2f2f2", x - leg, y - 5, 11, 5);
  } else { rect(c, "#15161a", x - 10, y - 12, 20, 8); rect(c, "#f2f2f2", x - 12, y - 5, 24, 5); }
  // torso hoodie
  rect(c, "#0c0c0f", x - 11, y - 50 + cr, 22, 26);
  rect(c, "#7cc6ff", x - 11, y - 38 + cr, 22, 2); // franja
  // cabeza
  rect(c, "#c99a72", x - 7, y - 64 + cr, 14, 14);
  rect(c, "#111", x - 8, y - 68 + cr, 16, 6); rect(c, "#111", x - 8 * f - (f > 0 ? 0 : 2), y - 64 + cr, 4, 6);
  rect(c, "#111", x + 3 * f, y - 59 + cr, 2, 2);
  // brazo + arma
  const ay = y - 44 + cr;
  if (p.armed > 0) {
    const ext = 12 * p.armed;
    rect(c, "#0c0c0f", f > 0 ? x + 8 : x - 8 - ext, ay, ext, 5);
    const gx = f > 0 ? x + 8 + ext : x - 8 - ext - 14;
    rect(c, "#9ca3af", gx, ay - 3, 14, 6); rect(c, "#7cc6ff", f > 0 ? gx + 12 : gx - 2, ay - 2, 4, 4);
    if (p.flash > 0) rect(c, "#fff6b0", f > 0 ? gx + 16 : gx - 10, ay - 6, 10, 12);
  } else rect(c, "#0c0c0f", x - 2 + 8 * f, ay, 5, 18);
}

function drawUfo(c: CanvasRenderingContext2D, x: number, y: number, t: number, hit: boolean) {
  c.fillStyle = hit ? "#ffffff" : "#aeb6c2";
  c.beginPath(); c.ellipse(x, y, 60, 14, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = hit ? "#ffd0d0" : "rgba(160,230,255,0.85)";
  c.beginPath(); c.ellipse(x, y - 10, 24, 16, 0, Math.PI, 0); c.fill();
  for (let i = 0; i < 6; i++) {
    c.fillStyle = (i + Math.floor(t * 6)) % 2 ? "#5dff7a" : "#ffe066";
    c.fillRect(x - 45 + i * 18, y - 2, 5, 5);
  }
}
