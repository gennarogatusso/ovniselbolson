export const W = 960, H = 540, GROUND = 450, WORLD = 3200;
export const DIFFICULTY = { movement: 1.20, frequency: 1.20, aggression: 1.20 } as const;
export const ALIEN_MESSAGE = "#%3# indescifrable.... GATO....#%3 ME PERTENECE ... #%indescifrable";
export const ENDINGS = {
  revenge: { title: "¡FELICIDADES! MATASTE AL OVNI PERO NO RECUPERASTE TU GATO", sub: "FINAL N.º 1 — BAD ENDING" },
  continuation: { title: "CONTINUARÁ", sub: "FINAL N.º 2 — ALGO SALIÓ DE LA NAVE" },
} as const;
export type Ending = keyof typeof ENDINGS;
export type Screen = "title" | "play" | "paused" | "win" | "lose";
export const CINEMATIC = new Set(["help", "crash", "arrive", "reunion", "alien", "speech", "attack", "fade", "jets"]);
export function shotInterval(hp: number) { return (hp < 40 ? 0.9 : 1.4) / DIFFICULTY.frequency; }
export function projectileDamage(b: {kind?: string}) { return b.kind === "stone" ? 3 : 4; }
export type Shot = { x: number; y: number; vx: number; vy: number; life: number; kind?: "stone" };
type Jet = { x: number; y: number; start: number; fired: [boolean, boolean] };
type JetShot = { x: number; y: number; vx: number; vy: number; life: number; target: "ufo" | "alien" };
type Ally = {x:number;y:number;hp:number;hurt:number;cd:number;walk:number;dead:boolean};
export function newState() {
  return {
                t: 0, phase: "walk" as "awka" | "walk" | "descend" | "beam" | "rise" | "noo" | "draw" | "fight" | "boom" | "over" | "help" | "crash" | "arrive" | "reunion" | "alien" | "speech" | "attack" | "fade" | "jets",
     intro: { stage: 'opening' as 'opening' | 'beer' | 'drinking' | 'approach' | 'offer' | 'smoking' | 'warning' | 'rising' | 'leave' | 'depart' | 'done', time: 0, drinks: 0, npcX: -285, eHeld: false },
    pt: 0, cam: 0,
    p: { x: 200, y: GROUND, vy: 0, face: 1, hp: 100, hurt: 0, crouch: false, armed: 0, flash: 0, walk: 0 },
    cat: { x: 150, y: GROUND, gone: false, walk: 0 },
    u: { x: 600, y: -80, hp: 100, hit: 0, tx: 600, cd: 2, vis: false },
    shots: [] as Shot[], lasers: [] as Shot[], fx: [] as { x: number; y: number; life: number; c: string }[],
    allies: [{ x: 430, y: GROUND, hp: 100, hurt: 0, cd: 0.3, walk: 0, dead: false }, { x: 490, y: GROUND, hp: 100, hurt: 0, cd: 0.8, walk: 0, dead: false }] as [Ally, Ally],
        recruited: false, pendingHelp: false, crashX: 2820, crashStart: { x: 0, y: 0 }, jets: [{ x: 0, y: 125, start: 0.2, fired: [false, false] }, { x: 0, y: 185, start: 0.5, fired: [false, false] }] as Jet[], jetShots: [] as JetShot[], alien: { x: 2840, y: GROUND, reveal: 0, stand: 0, riseFrame: 0 }, alienHit: false, ufoHits: 0,
    msg: "", msgT: 0, keys: {} as { l?: boolean; r?: boolean; j?: boolean; c?: boolean; e?: boolean; [k: string]: boolean | undefined }, fire: false, fireCd: 0,
  };
}
export type S = ReturnType<typeof newState>;


export function canAskHelp(s: S) { return s.phase === "fight" && !s.recruited && Math.abs(s.p.x - 460) < 150; }
function recruit(s: S) { s.recruited = true; s.phase = "help"; s.pt = 0; s.shots = []; s.lasers = []; s.fire = false; s.keys.e = false; }
function next(s: S, phase: S["phase"]) { s.phase = phase; s.pt = 0; }
function approach(x: number, target: number, speed: number) { return x + Math.sign(target - x) * Math.min(Math.abs(target - x), speed); }
function updateCinematic(s: S, dt: number): "continue" | null {
  const {u,p,cat} = s;
  s.shots = []; s.lasers = []; s.fire = false;
    let cameraTarget = p.x - W * 0.4;
    if (["crash","arrive","reunion","alien","speech","attack","jets","fade"].includes(s.phase)) cameraTarget = (s.phase === "crash" ? u.x : s.crashX - 70) - W * 0.55;
  s.cam += (Math.max(0, Math.min(WORLD-W, cameraTarget)) - s.cam) * Math.min(1,dt*3);
  for (const a of s.allies) a.hurt = Math.max(0,a.hurt-dt);
    switch(s.phase) {
    
    case "help": if (s.pt >= 3) { next(s,"fight"); s.msgT=0; u.cd=1; } break;
    case "crash": {
      const q = Math.min(1,s.pt/5), ease = q*q*(3-2*q);
      u.x = s.crashStart.x + (s.crashX-s.crashStart.x)*ease;
      u.y = s.crashStart.y + (GROUND-65-s.crashStart.y)*q*q + Math.sin(s.pt*18)*8*(1-q);
      if (q >= 1) { for(let i=0;i<35;i++) s.fx.push({x:u.x+(Math.random()-.5)*120,y:u.y+(Math.random()-.5)*60,life:1+Math.random(),c:i%2?"gold":"smoke"}); next(s,"arrive"); }
      break;
    }
    case "arrive": {
      // El grupo aparece junto a la nave y camina unos pasos; avanza siempre por tiempo.
      if (s.pt <= dt + 1e-6) { p.x = s.crashX - 330; p.vy = 0; s.allies.forEach((a,i)=>{ a.x = s.crashX - 400 - i*65; a.y = GROUND; a.dead = false; }); }
      p.x=approach(p.x,s.crashX-175,160*dt); p.y=GROUND; p.walk+=dt*10; p.face=1;
      for (const [i,a] of s.allies.entries()) { a.x=approach(a.x,s.crashX-250-i*65,160*dt); a.walk+=dt*10; a.hp=Math.max(1,a.hp); }
      if (s.pt>=2.2) { p.x=s.crashX-175; s.allies.forEach((a,i)=>{a.x=s.crashX-250-i*65;}); p.walk=0; cat.gone=false; cat.x=u.x-25; cat.y=GROUND; next(s,"reunion"); }
      break;
    }
    case "reunion": cat.x=approach(cat.x,p.x+22,65*dt); cat.walk+=dt*10; p.crouch=Math.abs(cat.x-p.x)<45; if(s.pt>=6) next(s,"alien"); break;
    case "alien": s.alien.reveal=Math.min(1,s.pt/3); s.alien.x=approach(s.alien.x,s.crashX-75,14*dt); s.alien.stand=Math.max(0,Math.min(1,(s.pt-3)/2)); s.alien.riseFrame=Math.min(3,Math.floor(Math.max(0,s.pt-1.5)/1.1)); if(s.pt>=4.8){s.alien.riseFrame=3;next(s,"speech");} break;
    case "speech": if(s.pt>=10) next(s,"attack"); break;
    case "attack": {
      if(s.pt>1 && s.pt<1.6) s.alien.x=approach(s.alien.x,s.allies[0].x,1200*dt);
      if(s.pt>=1.6) { const a=s.allies[0]; a.dead=true; a.hp=0; }
      if(s.pt>2 && s.pt<2.6) s.alien.x=approach(s.alien.x,s.allies[1].x,1200*dt);
      if(s.pt>=2.6) { const a=s.allies[1]; a.dead=true; a.hp=0; }
      if(s.pt>=5){s.jets.forEach((j,i)=>{j.x=s.cam-150-i*170;j.fired=[false,false];});s.jetShots=[];s.ufoHits=0;s.alienHit=false;s.alien.y=GROUND;s.alien.reveal=1;next(s,"jets");} break;
    }
            
        case "jets": {
      for(const jet of s.jets){
        if(s.pt>=jet.start)jet.x+=900*dt;
        if(jet.x>=u.x-260&&!jet.fired[0]){
          jet.fired[0]=true;
          for(const [target,tx,ty] of [["ufo",u.x,u.y],["alien",s.alien.x,s.alien.y]] as const){const dx=tx-(jet.x+55),dy=ty-jet.y,L=Math.hypot(dx,dy)||1,sp=1050;s.jetShots.push({x:jet.x+55,y:jet.y,vx:dx/L*sp,vy:dy/L*sp,life:2,target});}
        }
      }
      for(const shot of s.jetShots){
        if(shot.target==="alien"&&s.alien.reveal>0){const dx=s.alien.x-shot.x,dy=s.alien.y-shot.y,L=Math.hypot(dx,dy)||1;shot.vx=dx/L*1050;shot.vy=dy/L*1050;}
        shot.x+=shot.vx*dt;shot.y+=shot.vy*dt;shot.life-=dt;
        const tx=shot.target==="ufo"?u.x:s.alien.x,ty=shot.target==="ufo"?u.y:s.alien.y;
        if(shot.life>0&&Math.abs(shot.x-tx)<48&&Math.abs(shot.y-ty)<42){
          shot.life=0;
          if(shot.target==="ufo"){s.ufoHits++;for(let i=0;i<10;i++)s.fx.push({x:u.x+(Math.random()-.5)*70,y:u.y+(Math.random()-.5)*30,life:.8+Math.random()*.7,c:i%2?"gold":"smoke"});}
          else if(!s.alienHit){s.alienHit=true;for(let i=0;i<8;i++)s.fx.push({x:s.alien.x+(Math.random()-.5)*36,y:s.alien.y-35+(Math.random()-.5)*30,life:.6+Math.random()*.5,c:i%2?"gold":"smoke"});}
        }
      }
      s.jetShots=s.jetShots.filter(shot=>shot.life>0);
      if(s.alienHit)s.alien.reveal=Math.max(0,s.alien.reveal-dt);
      if(s.pt>=5.2&&s.jets.every(jet=>jet.x>WORLD+100)&&s.jetShots.length===0&&s.ufoHits>0&&s.alienHit&&s.alien.reveal===0){u.vis=false;next(s,"fade");}
      break;
    }
    case "fade": if(s.pt>=3.5){next(s,"over");return "continue";} break;
    }
  s.fx=s.fx.filter(f=>(f.life-=dt)>0);
  return null;
}
function say(s: S, m: string, d = 2.2) { s.msg = m; s.msgT = d; }

// AWKA occupies the street left of the original world; combat coordinates stay unchanged.
export function newIntroState(): S {
  const s = newState(); s.phase = 'awka'; s.p.x = -650; s.cat.x = -585; s.cam = -1080; return s;
}
export function introAction(s: S): string | null {
  if (s.phase !== 'awka') return null;
  return s.intro.stage === 'beer' ? 'Beber cerveza' : s.intro.stage === 'offer' ? 'Aceptar' : s.intro.stage === 'leave' ? 'Irse de la cervecería' : null;
}
export function interactIntro(s: S) {
  if (!introAction(s)) return;
  s.intro.stage = s.intro.stage === 'beer' ? 'drinking' : s.intro.stage === 'offer' ? 'smoking' : 'depart';
  s.intro.time = 0;
}
function updateIntro(s: S, dt: number) {
  const a = s.intro; a.time += dt;
  if (s.keys.e && !a.eHeld) interactIntro(s);
  a.eHeld = Boolean(s.keys.e);
  s.fire = false;
  const advance = (stage: typeof a.stage) => { a.stage = stage; a.time = 0; };
  switch (a.stage) {
    case 'opening': if (a.time >= 1.6) advance('beer'); break;
    case 'drinking': if (a.time >= 1.5) { a.drinks++; advance(a.drinks === 2 ? 'approach' : 'beer'); } break;
    case 'approach': a.npcX = approach(a.npcX, s.p.x + 95, 95 * dt); if (a.time >= 3.1) advance('offer'); break;
    case 'smoking': if (a.time >= 4.8) advance('warning'); break;
    case 'warning': if (a.time >= 3) advance('rising'); break;
    case 'rising': if (a.time >= 1.2) advance('leave'); break;
    case 'depart':
      s.p.x = approach(s.p.x, 200, 150 * dt); s.p.walk += dt * 10; s.p.face = 1;
      s.cat.x = approach(s.cat.x, s.p.x - 50, 200 * dt); s.cat.walk += dt * 12;
      s.cam += (Math.min(0, s.p.x - W * .4) - s.cam) * Math.min(1, dt * 5);
      if (s.p.x >= 200) { advance('done'); next(s, 'walk'); s.keys = {}; }
      break;
  }
}

export function update(s: S, dt: number): "win" | "lose" | "continue" | null {
  const { p, cat, u, keys } = s;
  s.t += dt; s.pt += dt; s.msgT -= dt;
  if (s.phase === 'awka') { updateIntro(s, dt); return null; }
  const canMove = s.phase === "walk" || s.phase === "fight" || s.phase === "descend";
  if (CINEMATIC.has(s.phase)) return updateCinematic(s, dt);
  if (s.phase === "fight" && canAskHelp(s) && keys.e) { recruit(s); }
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
      if (s.pt > 2.4) { s.phase = "draw"; s.pt = 0; say(s, "Devolveme el gato lcdtm >:(", 2.2); }
      break;
    case "draw":
      p.armed = Math.min(1, s.pt / 1.2);
      if (s.pt > 2.2) { s.phase = "fight"; s.pt = 0; u.tx = p.x + 200; say(s, "RECUPERÁ A TU GATO", 1.6); }
      break;
    case "fight": {
      // IA OVNI
      if (Math.abs(u.x - u.tx) < 20) u.tx = Math.max(100, Math.min(WORLD - 100, p.x + (Math.random() * 2 - 1) * (380 / DIFFICULTY.aggression)));
      u.x += Math.sign(u.tx - u.x) * Math.min(Math.abs(u.tx - u.x), (140 + (100 - u.hp)) * DIFFICULTY.movement * dt);
      u.y = 120 + Math.sin(s.t * 2) * 25;
      u.cd -= dt;
      if (u.cd <= 0) {
        const targets = [p, ...s.allies.filter(a => s.recruited && a.hp > 0)];
        const target = targets[Math.floor(Math.random() * targets.length)] ?? p;
        const ax = target.x + (Math.random() * 2 - 1) * 60, ay = GROUND - 30;
        const dx = ax - u.x, dy = ay - u.y, L = Math.hypot(dx, dy), sp = 330;
        s.lasers.push({ x: u.x, y: u.y + 15, vx: (dx / L) * sp, vy: (dy / L) * sp, life: 4 });
        u.cd = shotInterval(u.hp);
      }
      if (s.recruited) for (const [i, a] of s.allies.entries()) {
        if (a.hp <= 0) continue;
        const targetX = p.x - 65 - i * 55;
        const step = Math.sign(targetX - a.x) * Math.min(Math.abs(targetX - a.x), 230 * dt);
        a.x += step; a.walk += Math.abs(step) * 0.05; a.hurt -= dt; a.cd -= dt;
        if (a.cd <= 0) {
          const dx = u.x - a.x, dy = u.y - (GROUND - 45), duration = Math.max(0.4, Math.hypot(dx,dy) / 510);
          s.shots.push({ x: a.x, y: GROUND - 45, vx: dx / duration, vy: dy / duration - 180 * duration, life: duration + 0.3, kind: "stone" });
          a.cd = 0.95 + i * 0.15;
        }
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
    if (b.kind === "stone") b.vy += 360 * dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (s.phase === "fight" && Math.abs(b.x - u.x) < 55 && Math.abs(b.y - u.y) < 22) {
      b.life = 0; u.hp -= projectileDamage(b); u.hit = 0.12; s.fx.push({ x: b.x, y: b.y, life: 0.3, c: "ice" });
      if (u.hp <= 0) {
        u.hp = 0; s.pt = 0; s.lasers = []; s.fire = false;
        if (s.recruited) { s.phase = "crash"; s.crashStart = { x: u.x, y: u.y }; s.shots = []; }
        else s.phase = "boom";
        for (let i = 0; i < 26; i++) s.fx.push({ x: u.x + (Math.random() - 0.5) * 120, y: u.y + (Math.random() - 0.5) * 50, life: 0.5 + Math.random(), c: i % 2 ? "gold" : "light" });
      }
    }
  }
  for (const l of s.lasers) {
    for (const a of s.allies) if (s.recruited && a.hp > 0 && a.hurt <= 0 && l.life > 0 && Math.abs(l.x - a.x) < 16 && l.y > GROUND - 65 && l.y < GROUND) { a.hp = Math.max(0, a.hp - 12); a.hurt = 0.65; l.life = 0; }
    l.x += l.vx * dt; l.y += l.vy * dt; l.life -= dt;
    const top = p.y - (p.crouch ? 36 : 62);
    if (l.life > 0 && l.x > p.x - 14 && l.x < p.x + 14 && l.y > top && l.y < p.y && p.hurt <= 0) {
      l.life = 0; p.hp -= 12; p.hurt = 0.6; s.fx.push({ x: l.x, y: l.y, life: 0.35, c: "laser" });
      if (p.hp <= 0) { p.hp = 0; return "lose"; }
    }
    if (l.y >= GROUND) { l.life = 0; s.fx.push({ x: l.x, y: GROUND, life: 0.3, c: "laser" }); }
  }
  if (s.phase === "crash") s.shots = [];
  s.shots = s.shots.filter((b) => b.life > 0);
  s.lasers = s.lasers.filter((b) => b.life > 0);
  s.fx = s.fx.filter((f) => (f.life -= dt) > 0);
  return null;
}

