export const W = 960, H = 540, GROUND = 450, WORLD = 3200;
export const DIFFICULTY = { movement: 1.20, frequency: 1.20, aggression: 1.20 } as const;
export const SPECIAL_ATTACK_ANIM_DURATION = 0.36;
export const SPECIAL_PROJECTILE_SPEED = 520;
export const ALIEN_MESSAGE = "#%3# indescifrable.... GATO....#%3 ME PERTENECE ... #%indescifrable";
export const ENDINGS = {
  revenge: { title: "¡FELICIDADES! MATASTE AL OVNI PERO NO RECUPERASTE TU GATO", sub: "FINAL N.º 1 — BAD ENDING" },
  continuation: { title: "CONTINUARÁ", sub: "FINAL N.º 2 — ALGO SALIÓ DE LA NAVE" },
  abduction: { title: "CONTINUARÁ", sub: "UFOCAT — ABDUCCIÓN EN EL BOSQUE" },
  cross: { title: "CONTINUARÁ...", sub: "UFOCAT — CERRO DE LA CRUZ · EL BOLSÓN" },
} as const;
export type Ending = keyof typeof ENDINGS;
export type Screen = "title" | "play" | "paused" | "win" | "lose";
export const CINEMATIC = new Set(["help", "crash", "arrive", "reunion", "alien", "speech", "attack", "fade", "jets", "aftermath", "bedroom"]);
export function shotInterval(hp: number) { return (hp < 40 ? 0.9 : 1.4) / DIFFICULTY.frequency; }
export function projectileDamage(b: {kind?: string}) { return b.kind === "stone" ? 3 : 4; }
export type Shot = { x: number; y: number; vx: number; vy: number; life: number; kind?: "stone" | "special"; specialTarget?: "ufo" | "shipEnemy"; targetIndex?: number };
type Jet = { x: number; y: number; start: number; fired: [boolean, boolean] };
type JetShot = { x: number; y: number; vx: number; vy: number; life: number; target: "ufo" | "alien" };
type Ally = {x:number;y:number;hp:number;hurt:number;cd:number;walk:number;dead:boolean};
export const SHIP = { floor: 452, left: 48, right: 910, boxX: 480, boxY: 185, boxHits: 4, reactorX: 847, reactorY: 282, chargeTime: 1.8, rollTime: .52, rollCooldown: 1.1 } as const;
export const FOREST = { deer: 1820, ship: 3640, abduction: 3900, top: 410, bottom: 490, speed: 260 } as const;
export function forestIsFree(s:S){return s.phase==='bedroom'&&['forestRun','burned','ship'].includes(s.chapter.stage);}
export function computerAvailable(s:S){return roomIsFree(s)&&!s.chapter.night&&Math.hypot(s.chapter.roomX-350,s.chapter.roomY-418)<80;}
export function closeComputer(s:S){s.chapter.computer=false;s.keys={};s.fire=false;}
export type ShipStage = 'dormant'|'awakening'|'verdict'|'catEntry'|'eyeCharge'|'rescue'|'rise'|'labFree'|'door'|'combat'|'pickup'|'overload'|'emergency'|'impact'|'crossRise'|'crossFree'|'contemplate'|'end';
type ShipEnemy = {x:number;y:number;hp:number;kind:'direct'|'psychic';cd:number;windup:number;hurt:number;deadTime:number;face:number};
function newShip(){return {stage:'dormant' as ShipStage,time:0,x:480,y:SHIP.floor as number,walk:0,face:1,hp:100,hurt:0,catX:70,catY:SHIP.floor as number,roll:0,rollCd:0,rollHeld:false,rollFace:1,push:'none' as 'none'|'lean'|'flight'|'wall'|'fall',pushTime:0,pushVx:0,pushVy:0,pushFrom:0,specialCd:0,specialAnim:0,aimX:SHIP.boxX as number,aimY:SHIP.boxY as number,aimActive:false,boxHp:SHIP.boxHits as number,boxBroken:false,weaponY:SHIP.boxY as number,weaponVy:0,armed:false,charge:0,beam:0,beamX:0,beamY:0,beamTx:0,beamTy:0,beamCd:0,fireCd:0,flash:0,shake:0,reactorHp:100,reactorHit:0,eHeld:false,shots:[] as Shot[],bolts:[] as Shot[],enemies:[] as ShipEnemy[],sounds:[] as string[],labDead:0};}
export function newState() {
  return {
                t: 0, phase: "walk" as "awka" | "walk" | "descend" | "beam" | "rise" | "noo" | "draw" | "fight" | "boom" | "over" | "help" | "crash" | "arrive" | "reunion" | "alien" | "speech" | "attack" | "fade" | "jets" | "aftermath" | "bedroom" | "spaceship",
    ship: newShip(),
      chapter: { enabled: false, computer: false, stage: 'truck' as 'truck' | 'unload' | 'trump' | 'approach' | 'milei' | 'leave' | 'roomFade' | 'feed' | 'meal' | 'sleepChoice' | 'toBed' | 'settle' | 'quiet' | 'light' | 'wakeChoice' | 'waking' | 'missing' | 'search' | 'exit' | 'forestFade' | 'forestRun' | 'deer' | 'burned' | 'ship' | 'beam' | 'lift' | 'vanished' | 'complete', time: 0, truckX: 0, roomX: 115, roomY: 435, roomWalk: 0, roomDirection: 'right' as 'right'|'left'|'up'|'down', moving: false, night: false, fed: false, searching: false, forestX: 0, forestY: GROUND, forestRunTime: 0, forestFace: 1, catGone: false, eHeld: false },
     intro: { stage: 'opening' as 'opening' | 'beer' | 'drinking' | 'approach' | 'offer' | 'smoking' | 'warning' | 'rising' | 'leave' | 'depart' | 'done', time: 0, drinks: 0, npcX: -285, eHeld: false },
    pt: 0, cam: 0,
    p: { x: 200, y: GROUND, vy: 0, face: 1, hp: 100, hurt: 0, crouch: false, armed: 0, flash: 0, walk: 0, roll: 0, rollCd: 0, rollHeld: false, rollFace: 1 },
    cat: { x: 150, y: GROUND, gone: false, walk: 0 },
    u: { x: 600, y: -80, hp: 100, hit: 0, tx: 600, cd: 2, vis: false },
    shots: [] as Shot[], lasers: [] as Shot[], fx: [] as { x: number; y: number; life: number; c: string }[],
    allies: [{ x: 430, y: GROUND, hp: 100, hurt: 0, cd: 0.3, walk: 0, dead: false }, { x: 490, y: GROUND, hp: 100, hurt: 0, cd: 0.8, walk: 0, dead: false }] as [Ally, Ally],
        recruited: false, pendingHelp: false, crashX: 2820, crashStart: { x: 0, y: 0 }, jets: [{ x: 0, y: 125, start: 0.2, fired: [false, false] }, { x: 0, y: 185, start: 0.5, fired: [false, false] }] as Jet[], jetShots: [] as JetShot[], alien: { x: 2840, y: GROUND, reveal: 0, stand: 0, riseFrame: 0 }, alienHit: false, ufoHits: 0,
    msg: "", msgT: 0, specialCd:0, specialAnim:0, keys: {} as { l?: boolean; r?: boolean; j?: boolean; c?: boolean; e?: boolean; [k: string]: boolean | undefined }, fire: false, fireCd: 0,
  };
}
export type S = ReturnType<typeof newState>;

export function triggerSpecial(s:S):boolean{
 if(s.phase==='fight'){
  if(s.specialCd>0||s.u.hp<=0||!s.u.vis)return false;
  const p=s.p;s.shots.push({x:p.x+p.face*28,y:p.y-50,vx:p.face*SPECIAL_PROJECTILE_SPEED,vy:0,life:3,kind:'special',specialTarget:'ufo'});
  s.specialCd=5;s.specialAnim=SPECIAL_ATTACK_ANIM_DURATION;return true;
 }
 if(s.phase==='spaceship'&&s.ship.stage==='combat'){
  const a=s.ship;if(a.specialCd>0)return false;
  let index=-1,best=Infinity;
  a.enemies.forEach((e,i)=>{if(e.hp<=0)return;const d=Math.hypot(e.x-a.x,(e.y-48)-(a.y-58));if(d<best){best=d;index=i;}});
  if(index<0)return false;
  a.shots.push({x:a.x+a.face*34,y:a.y-66,vx:a.face*SPECIAL_PROJECTILE_SPEED,vy:0,life:3,kind:'special',specialTarget:'shipEnemy',targetIndex:index});
  a.specialCd=5;a.specialAnim=SPECIAL_ATTACK_ANIM_DURATION;shipSound(s,'super');return true;
 }
 return false;
}

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
       if(s.pt>=5.2&&s.jets.every(jet=>jet.x>WORLD+100)&&s.jetShots.length===0&&s.ufoHits>0&&s.alienHit&&s.alien.reveal===0){u.vis=false;if(s.chapter.enabled){s.chapter.truckX=s.cam-190;next(s,"aftermath");}else next(s,"fade");}
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
  const s = newState(); s.phase = 'awka'; s.p.x = -650; s.cat.x = -585; s.cam = -1080; s.chapter.enabled = true; return s;
}
export function chapterAction(s: S): string | null {
  if(s.phase==='spaceship')return shipAction(s);
  if(s.phase!=='aftermath' && s.phase!=='bedroom')return null;
  const a=s.chapter;
  if(computerAvailable(s))return 'Usar computadora';
  switch(a.stage){
    case 'leave':return 'IRSE';
    case 'feed':return Math.hypot(a.roomX-775,a.roomY-451)<90?'ALIMENTAR AL GATO':null;
    case 'sleepChoice':return Math.hypot(a.roomX-520,a.roomY-360)<70?'ACOSTARSE':null;
    case 'settle':return 'DORMIR';
    case 'wakeChoice':return 'LEVANTARSE';
    case 'missing':return 'IR A BUSCAR AL GATO';
    case 'search':return a.roomX<150&&Math.abs(a.roomY-435)<65?'SALIR DE LA CASA':null;
    default:return null;
  }
}
export function interactChapter(s:S){
  if(s.phase==='spaceship'){interactShip(s);return;}
  if(!chapterAction(s))return;
  const a=s.chapter;
  if(computerAvailable(s)){a.computer=true;s.keys={};s.fire=false;return;}
  if(a.stage==='leave'){s.phase='bedroom';s.pt=0;a.stage='roomFade';}
  else if(a.stage==='feed'){a.stage='meal';a.fed=true;}
  else if(a.stage==='sleepChoice')a.stage='toBed';
  else if(a.stage==='settle'){a.stage='quiet';a.night=true;}
  else if(a.stage==='wakeChoice'){a.stage='waking';a.catGone=true;s.cat.gone=true;}
  else if(a.stage==='missing'){a.stage='search';a.searching=true;}
  else if(a.stage==='search')a.stage='exit';
  a.time=0;s.keys={};s.fire=false;
}
export function roomCanStand(x:number,y:number){
  // Feet inside the drawn floor polygon; furniture footprints remain solid.
  const polygon=[[45,435],[390,275],[665,320],[905,430],[600,535],[220,515]];
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const v=polygon[i],u=polygon[j];if(!v||!u)continue;
    const [xi=0,yi=0]=v,[xj=0,yj=0]=u;
    if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
  }
  return inside&&!(x>365&&x<655&&y<342)&&!(x<340&&y<402)&&!(x<440&&y>480)&&!(x>505&&x<725&&y>478)&&!(x>808&&y<465);
}
export function roomIsFree(s:S){return s.phase==='bedroom'&&['feed','meal','sleepChoice','search'].includes(s.chapter.stage);}
function moveRoom(s:S,dt:number,canStand=roomCanStand){
  const a=s.chapter,k=s.keys;let dx=Number(Boolean(k.r))-Number(Boolean(k.l)),dy=Number(Boolean(k.c))-Number(Boolean(k.j));
  a.moving=Boolean(dx||dy);if(!a.moving)return;
  a.roomDirection=Math.abs(dy)>0?(dy>0?'down':'up'):(dx>0?'right':'left');
  const length=Math.hypot(dx,dy)||1;dx=dx/length*145*dt;dy=dy/length*145*dt;
  if(canStand(a.roomX+dx,a.roomY))a.roomX+=dx;
  if(canStand(a.roomX,a.roomY+dy))a.roomY+=dy;
  a.roomWalk+=dt*9;
}
function updateChapter(s:S,dt:number): 'continue'|null {
  const a=s.chapter;if(a.computer)return null;a.time+=dt;s.fire=false;s.shots=[];s.lasers=[];
  a.moving=false;if(roomIsFree(s))moveRoom(s,dt);
  if(forestIsFree(s)){const dx=Number(Boolean(s.keys.r))-Number(Boolean(s.keys.l)),dy=Number(Boolean(s.keys.c))-Number(Boolean(s.keys.j)),length=Math.hypot(dx,dy)||1;a.moving=Boolean(dx||dy);if(a.moving){if(dx)a.forestFace=dx<0?-1:1;a.roomDirection=dy?(dy>0?'down':'up'):(dx>0?'right':'left');a.forestX=Math.max(0,Math.min(FOREST.abduction,a.forestX+dx/length*FOREST.speed*dt));a.forestY=Math.max(FOREST.top,Math.min(FOREST.bottom,a.forestY+dy/length*FOREST.speed*dt));a.roomWalk+=dt*10;}}
  if(s.keys.e&&!a.eHeld)interactChapter(s);a.eHeld=Boolean(s.keys.e);
  const advance=(stage:typeof a.stage)=>{a.stage=stage;a.time=0;};
  switch(a.stage){
    case 'truck': a.truckX=approach(a.truckX,s.crashX-440,145*dt);if(a.time>=4)advance('unload');break;
    case 'unload': if(a.time>=4.2)advance('trump');break;
    case 'trump': if(a.time>=4.8)advance('approach');break;
    case 'approach': if(a.time>=2.2)advance('milei');break;
    case 'milei': if(a.time>=4)advance('leave');break;
    case 'roomFade': if(a.time>=2.4)advance('feed');break;
    case 'feed': break;
    case 'meal': if(a.time>=3.5)advance('sleepChoice');break;
    case 'toBed': if(a.time>=1.6)advance('settle');break;
    case 'quiet': if(a.time>=3)advance('light');break;
    case 'light': if(a.time>=8)advance('wakeChoice');break;
    case 'waking': if(a.time>=2){a.roomX=520;a.roomY=360;advance('missing');}break;
    case 'search':break;
    case 'exit':a.roomX=approach(a.roomX,55,70*dt);a.roomY=approach(a.roomY,435,70*dt);a.moving=true;a.roomDirection='left';a.roomWalk+=dt*9;if(a.time>=2)advance('forestFade');break;
    case 'forestFade':if(a.time>=1.4)advance('forestRun');break;
    case 'forestRun':if(a.forestX>=FOREST.deer)advance('deer');break;
    case 'deer':if(a.time>=3.6)advance('burned');break;
    case 'burned':if(a.forestX>=FOREST.ship)advance('ship');break;
    case 'ship':if(a.forestX>=FOREST.abduction){a.forestY=GROUND;s.keys={};advance('beam');}break;
    case 'beam':if(a.time>=3)advance('lift');break;
    case 'lift':{const q=Math.min(1,a.time/6),ease=q*q*(3-2*q);a.forestY=GROUND-(GROUND-155)*ease;if(q===1)advance('vanished');break;}
    case 'vanished':if(a.time>=1.8){advance('complete');if(a.enabled)enterShip(s);else{s.phase='over';return 'continue';}}break;
  }
  return null;
}
export function introAction(s: S): string | null {
  if (s.phase !== 'awka') return null;
  return s.intro.stage === 'beer' ? 'Beber cerveza' : s.intro.stage === 'offer' ? 'Aceptar' : s.intro.stage === 'leave' ? 'Irse de la cervecería' : null;
}
export function enterShip(s:S){s.phase='spaceship';s.ship=newShip();s.ship.stage='awakening';s.keys={};s.fire=false;s.shots=[];s.lasers=[];s.cam=0;}
export function respawnAtShipCheckpoint(s:S){enterShip(s);}
export function shipIsCombat(s:S){return s.phase==='spaceship'&&s.ship.stage==='combat';}
export function shipIsFree(s:S){return s.phase==='spaceship'&&['labFree','crossFree'].includes(s.ship.stage);}
export function crossCanStand(x:number,y:number){
  const path=y>=443&&y<=516&&x>=85&&x<=860;
  const stairs=x>=143&&x<=290&&y>=333&&y<=478;
  const deck=x>=119&&x<=467&&y>=317&&y<=346;
  return (path||stairs||deck)&&!(x>=139&&x<=190&&y<328);
}
export function shipAction(s:S):string|null{
  const a=s.ship;
  if(a.stage==='labFree')return a.x<155?'SALIR DEL LABORATORIO':null;
  if(a.stage==='combat'&&a.boxBroken&&!a.armed&&a.weaponY>=SHIP.floor&&Math.abs(a.x-SHIP.boxX)<75)return 'RECOGER SUPERARMA';
  if(a.stage==='crossFree'&&s.chapter.roomX<430&&s.chapter.roomY<347)return 'CONTEMPLAR LA CRUZ';
  return null;
}
export function interactShip(s:S){
  if(!shipAction(s))return;
  const a=s.ship;
  if(a.stage==='labFree')a.stage='door';
  else if(a.stage==='combat'){a.stage='pickup';a.x=SHIP.boxX;a.charge=0;}
  else if(a.stage==='crossFree'){a.stage='contemplate';s.chapter.roomX=305;s.chapter.roomY=334;}
  a.time=0;s.keys={};s.fire=false;
}
function shipAdvance(s:S,stage:ShipStage){s.ship.stage=stage;s.ship.time=0;s.fire=false;}
function shipSound(s:S,event:string){s.ship.sounds.push(event);}
function shipHit(s:S,damage:number){const a=s.ship;if(a.hurt>0||a.roll>0)return;a.hp=Math.max(0,a.hp-damage);a.hurt=.8;a.shake=.3;shipSound(s,'impact');}
function defeat(s:S,e:ShipEnemy){e.hp=0;e.deadTime=.001;shipSound(s,'impact');}
function hitUfo(s:S,damage:number,x:number,y:number){
 const u=s.u;if(u.hp<=0)return;u.hp=Math.max(0,u.hp-damage);u.hit=.12;s.fx.push({x,y,life:.38,c:'energy'});
 if(u.hp<=0){u.hp=0;s.pt=0;s.lasers=[];s.fire=false;if(s.recruited){s.phase='crash';s.crashStart={x:u.x,y:u.y};s.shots=[];}else s.phase='boom';for(let i=0;i<26;i++)s.fx.push({x:u.x+(Math.random()-.5)*120,y:u.y+(Math.random()-.5)*50,life:.5+Math.random(),c:i%2?'gold':'light'});}
}
function startShipCombat(s:S){const a=s.ship;shipAdvance(s,'combat');a.x=145;a.y=SHIP.floor;a.enemies=[340,550,700,790].map((x,i)=>({x,y:SHIP.floor,hp:32,kind:i===2?'psychic':'direct',cd:3+i*1.4,windup:0,hurt:0,deadTime:0,face:-1}));shipSound(s,'door');}
function superShot(s:S){
  const a=s.ship;a.beam=.65;a.beamCd=1;a.charge=0;a.shake=.65;
  a.beamX=a.x+a.face*50;a.beamY=a.y-64;
  const alive=a.enemies.filter(e=>e.hp>0);const target=alive.sort((l,r)=>Math.abs(l.x-a.x)-Math.abs(r.x-a.x))[0];
  a.beamTx=target?target.x:SHIP.reactorX;a.beamTy=target?target.y-48:SHIP.reactorY;
  if(a.aimActive){a.beamTx=a.aimX;a.beamTy=a.aimY;}
  const dx=a.beamTx-a.beamX,dy=a.beamTy-a.beamY,L=Math.hypot(dx,dy)||1;
  for(const e of a.enemies){const ex=e.x-a.beamX,ey=e.y-48-a.beamY,along=(ex*dx+ey*dy)/L,dist=Math.abs(ex*dy-ey*dx)/L;if(e.hp>0&&along>0&&dist<62)defeat(s,e);}
  const rx=SHIP.reactorX-a.beamX,ry=SHIP.reactorY-a.beamY;
  const reactorHit=(rx*dx+ry*dy)>0&&Math.abs(rx*dy-ry*dx)/L<82;
  if(reactorHit&&a.reactorHp>0){
    a.reactorHp=Math.max(0,a.reactorHp-25);a.reactorHit=.7;shipSound(s,'corehit');
    if(a.reactorHp===0){shipAdvance(s,'overload');a.enemies.forEach(e=>{if(e.hp>0)defeat(s,e);});a.bolts=[];a.shots=[];shipSound(s,'explosion');}
  }
  shipSound(s,'super');
}
function updateShip(s:S,dt:number):'continue'|'lose'|null{
  const a=s.ship;a.time+=dt;a.hurt=Math.max(0,a.hurt-dt);a.shake=Math.max(0,a.shake-dt);a.beam=Math.max(0,a.beam-dt);a.beamCd=Math.max(0,a.beamCd-dt);a.flash=Math.max(0,a.flash-dt);a.rollCd=Math.max(0,a.rollCd-dt);a.specialCd=Math.max(0,a.specialCd-dt);a.specialAnim=Math.max(0,a.specialAnim-dt);a.reactorHit=Math.max(0,a.reactorHit-dt);
  if(s.keys.e&&!a.eHeld)interactShip(s);a.eHeld=Boolean(s.keys.e);
  for(const e of a.enemies){e.hurt=Math.max(0,e.hurt-dt);if(e.hp<=0)e.deadTime+=dt;}
  const timed=(seconds:number,stage:ShipStage)=>{if(a.time>=seconds)shipAdvance(s,stage);};
  switch(a.stage){
    case 'awakening':timed(2.2,'verdict');break;
    case 'verdict':timed(6,'catEntry');break;
    case 'catEntry':a.catX=approach(a.catX,280,90*dt);timed(2.4,'eyeCharge');break;
    case 'eyeCharge':if(a.time>=2){shipAdvance(s,'rescue');shipSound(s,'laser');}break;
    case 'rescue':a.labDead=Math.min(1,a.time/1.8);if(a.time>=.2&&a.time-dt<.2)shipSound(s,'impact');timed(2.8,'rise');break;
    case 'rise':if(a.time>=2.3){a.x=480;a.y=SHIP.floor;shipAdvance(s,'labFree');}break;
    case 'labFree':{const move=(s.keys.r?1:0)-(s.keys.l?1:0);a.x=Math.max(90,Math.min(870,a.x+move*180*dt));if(move){a.face=move;a.walk+=dt*9;}a.catX=approach(a.catX,a.x+55,170*dt);break;}
    case 'door':if(a.time>=1.2)startShipCombat(s);break;
    case 'combat':{
      const move=(s.keys.r?1:0)-(s.keys.l?1:0),rollKey=Boolean(s.keys['roll']);
      if(rollKey&&!a.rollHeld&&a.rollCd===0&&a.push==='none'&&a.y===SHIP.floor){a.roll=SHIP.rollTime;a.rollCd=SHIP.rollTime+SHIP.rollCooldown;a.rollFace=move||a.face;shipSound(s,'roll');}
      a.rollHeld=rollKey;
      if(a.push!=='none'){
        a.pushTime+=dt;
        if(a.push==='lean'&&a.pushTime>=.45){a.push='flight';a.pushTime=0;a.pushVx=Math.sign(a.x-a.pushFrom||-1)*190;a.pushVy=-220;}
        else if(a.push==='flight'){a.pushVx+=Math.sign(a.pushVx)*1200*dt;a.x+=a.pushVx*dt;a.y+=a.pushVy*dt;a.pushVy+=210*dt;if(a.x<=SHIP.left||a.x>=SHIP.right){a.x=Math.max(SHIP.left,Math.min(SHIP.right,a.x));a.push='wall';a.pushTime=0;a.shake=.55;shipHit(s,12);}}
        else if(a.push==='wall'&&a.pushTime>=.18){a.push='fall';a.pushTime=0;a.pushVy=60;}
        else if(a.push==='fall'){a.pushVy+=900*dt;a.y=Math.min(SHIP.floor,a.y+a.pushVy*dt);if(a.y===SHIP.floor){a.push='none';a.hurt=1;}}
      }else if(a.roll>0){a.roll=Math.max(0,a.roll-dt);a.x=Math.max(SHIP.left,Math.min(SHIP.right,a.x+a.rollFace*420*dt));a.y=SHIP.floor;a.face=a.rollFace;}
      else{a.x=Math.max(SHIP.left,Math.min(SHIP.right,a.x+move*210*dt));if(move){a.face=move;a.walk+=dt*10;}}
      if(a.boxBroken&&!a.armed){a.weaponVy+=650*dt;a.weaponY=Math.min(SHIP.floor,a.weaponY+a.weaponVy*dt);}
      for(const e of a.enemies){
        if(e.hp<=0)continue;e.face=a.x>e.x?1:-1;e.cd-=dt;
        if(e.kind==='direct'){e.x=Math.max(230,Math.min(850,e.x+Math.sin(s.t+e.x*.001)*32*dt));if(e.cd<=0){const dx=a.x-e.x,dy=a.y-45-(e.y-52),L=Math.hypot(dx,dy)||1;a.bolts.push({x:e.x,y:e.y-52,vx:dx/L*270,vy:dy/L*270,life:4});e.cd=2.8;shipSound(s,'laser');}}
        else if(e.cd<=0){e.windup+=dt;if(e.windup>=1){if(a.roll===0&&a.push==='none'){a.push='lean';a.pushTime=0;a.pushFrom=e.x;shipSound(s,'psychic');}e.windup=0;e.cd=7;}}
      }
      a.fireCd-=dt;
      if(s.fire&&a.push==='none'&&a.roll===0){
        if(a.armed){a.charge=Math.min(SHIP.chargeTime,a.charge+dt);if(a.charge>=SHIP.chargeTime&&a.beamCd===0)superShot(s);}
        else if(a.fireCd<=0){const target=a.enemies.filter(e=>e.hp>0).sort((l,r)=>Math.abs(l.x-a.x)-Math.abs(r.x-a.x))[0];const tx=a.aimActive&&!a.boxBroken?a.aimX:target?.x??SHIP.boxX,ty=a.aimActive&&!a.boxBroken?a.aimY:target?target.y-48:SHIP.boxY;const dx=tx-a.x,dy=ty-(a.y-58),L=Math.hypot(dx,dy)||1;a.face=dx>=0?1:-1;a.shots.push({x:a.x,y:a.y-58,vx:dx/L*700,vy:dy/L*700,life:1.5});a.fireCd=.22;a.flash=.08;shipSound(s,'pistol');}
      }else a.charge=Math.max(0,a.charge-dt*2);
      for(const b of a.shots){
        if(b.kind==='special'){
          let target=b.targetIndex===undefined?undefined:a.enemies[b.targetIndex];
          if(!target||target.hp<=0){let index=-1,best=Infinity;for(let i=0;i<a.enemies.length;i++){const e=a.enemies[i];if(e&&e.hp>0){const d=Math.hypot(e.x-b.x,(e.y-48)-b.y);if(d<best){best=d;index=i;target=e;}}}b.targetIndex=index;}
          if(!target||target.hp<=0){b.life=0;continue;}
          const dx=target.x-b.x,dy=(target.y-48)-b.y,L=Math.hypot(dx,dy)||1;b.vx=dx/L*SPECIAL_PROJECTILE_SPEED;b.vy=dy/L*SPECIAL_PROJECTILE_SPEED;
          if(L<40+SPECIAL_PROJECTILE_SPEED*dt){b.life=0;defeat(s,target);s.fx.push({x:target.x,y:target.y-48,life:.55,c:'energy'});}
          else{b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;}
          continue;
        }
        b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
        if(!a.boxBroken&&Math.abs(b.x-SHIP.boxX)<32&&Math.abs(b.y-SHIP.boxY)<30){b.life=0;a.boxHp--;shipSound(s,'impact');if(a.boxHp<=0){a.boxBroken=true;a.aimActive=false;shipSound(s,'break');a.shake=.25;}}
        for(const e of a.enemies)if(b.life>0&&e.hp>0&&Math.abs(b.x-e.x)<25&&Math.abs(b.y-(e.y-48))<50){b.life=0;e.hp-=4;e.hurt=.2;if(e.hp<=0)defeat(s,e);}
      }
      for(const b of a.bolts){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(Math.abs(b.x-a.x)<23&&Math.abs(b.y-(a.y-50))<48){b.life=0;shipHit(s,7);}}
      a.shots=a.shots.filter(b=>b.life>0);a.bolts=a.bolts.filter(b=>b.life>0);
      if(a.hp===0)return 'lose';break;
    }
    case 'pickup':if(a.time>=2.4){a.armed=true;shipAdvance(s,'combat');shipSound(s,'pickup');}break;
    case 'overload':a.shake=.18+a.time*.06;if(a.time>=4){shipAdvance(s,'emergency');shipSound(s,'explosion');a.bolts=[];a.shots=[];}break;
    case 'emergency':a.shake=.2+a.time*.045;if(a.time>=9){shipAdvance(s,'impact');shipSound(s,'explosion');}break;
    case 'impact':if(a.time>=1.8){shipAdvance(s,'crossRise');s.chapter.roomX=730;s.chapter.roomY=480;s.chapter.roomDirection='left';a.catX=790;a.catY=485;}break;
    case 'crossRise':timed(2.4,'crossFree');break;
    case 'crossFree':s.chapter.moving=false;moveRoom(s,dt,crossCanStand);a.catX=approach(a.catX,s.chapter.roomX+52,170*dt);a.catY=approach(a.catY,s.chapter.roomY+5,170*dt);break;
    case 'contemplate':a.catX=approach(a.catX,359,95*dt);a.catY=approach(a.catY,338,95*dt);if(a.time>=6){shipAdvance(s,'end');return 'continue';}break;
  }
  return null;
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
  s.t += dt; s.pt += dt; s.msgT -= dt;s.specialCd=Math.max(0,s.specialCd-dt);s.specialAnim=Math.max(0,s.specialAnim-dt);
  if(s.phase==='spaceship')return updateShip(s,dt);
  if(s.phase==='aftermath'||s.phase==='bedroom')return updateChapter(s,dt);
  if (s.phase === 'awka') { updateIntro(s, dt); return null; }
  const canMove = s.phase === "walk" || s.phase === "fight" || s.phase === "descend";
  if (CINEMATIC.has(s.phase)) return updateCinematic(s, dt);
  if (s.phase === "fight" && canAskHelp(s) && keys.e) { recruit(s); }
  // jugador
  p.rollCd=Math.max(0,p.rollCd-dt);
  const rollKey=Boolean(keys['roll']);
  if(s.phase==='fight'&&rollKey&&!p.rollHeld&&p.rollCd===0&&p.y===GROUND){p.roll=SHIP.rollTime;p.rollCd=SHIP.rollTime+SHIP.rollCooldown;p.rollFace=(keys.r?1:0)-(keys.l?1:0)||p.face;}
  p.rollHeld=rollKey;
  p.crouch = canMove && p.roll===0 && !!keys.c && p.y >= GROUND;
  let vx = 0;
  if (canMove && !p.crouch) vx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
  if(p.roll>0){vx=p.rollFace;p.roll=Math.max(0,p.roll-dt);}
  if (vx) p.face = vx;
  const speed = p.roll>0?420:s.phase === "fight" ? 260 : 150;
  p.x = Math.max(40, Math.min(WORLD - 40, p.x + vx * speed * dt));
  p.walk = vx ? p.walk + dt * 10 : 0;
  if (canMove && p.roll===0 && keys.j && p.y >= GROUND) p.vy = -560;
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
      if (s.fire && p.roll===0 && s.fireCd <= 0) {
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
    if(b.kind==='special'&&b.specialTarget==='ufo'){
      const dx=u.x-b.x,dy=u.y-b.y,L=Math.hypot(dx,dy)||1;b.vx=dx/L*SPECIAL_PROJECTILE_SPEED;b.vy=dy/L*SPECIAL_PROJECTILE_SPEED;
      if(s.phase==='fight'&&L<48+SPECIAL_PROJECTILE_SPEED*dt){b.life=0;hitUfo(s,35,b.x,b.y);}
      else{b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;}
      continue;
    }
    if (b.kind === "stone") b.vy += 360 * dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (s.phase === "fight" && Math.abs(b.x - u.x) < 55 && Math.abs(b.y - u.y) < 22) {b.life=0;hitUfo(s,projectileDamage(b),b.x,b.y);}
  }
  for (const l of s.lasers) {
    for (const a of s.allies) if (s.recruited && a.hp > 0 && a.hurt <= 0 && l.life > 0 && Math.abs(l.x - a.x) < 16 && l.y > GROUND - 65 && l.y < GROUND) { a.hp = Math.max(0, a.hp - 12); a.hurt = 0.65; l.life = 0; }
    l.x += l.vx * dt; l.y += l.vy * dt; l.life -= dt;
    const top = p.y - (p.crouch ? 36 : 62);
    if (l.life > 0 && l.x > p.x - 14 && l.x < p.x + 14 && l.y > top && l.y < p.y && p.hurt <= 0 && p.roll===0) {
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

