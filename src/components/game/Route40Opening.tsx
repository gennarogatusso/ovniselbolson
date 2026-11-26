import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, RotateCcw } from "lucide-react";

const W = 1440;
const H = 810;
const DURATION = 14.4;
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function smooth(a: number, b: number, v: number) {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

function poly(c: CanvasRenderingContext2D, points: [number, number][]) {
  c.beginPath();
  points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.closePath();
}

function drawTreeCanopy(c: CanvasRenderingContext2D, x: number, y: number, size: number, seed: number) {
  const palette = ["#172b25", "#26392c", "#34432e", "#775438", "#95643d", "#b47742"];
  c.save();
  c.translate(x, y);
  c.fillStyle = "rgba(0,0,0,.32)";
  c.beginPath(); c.ellipse(8, 12, size * .8, size * .52, -.2, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#3b2c20";
  c.fillRect(-size * .09, 0, size * .18, size * .7);
  for (let i = 0; i < 8; i++) {
    const angle = i * 2.399 + seed;
    const radius = size * (.12 + (i % 3) * .12);
    c.fillStyle = palette[(i + Math.floor(seed * 4)) % palette.length] ?? "#26392c";
    c.beginPath();
    c.ellipse(Math.cos(angle) * radius, Math.sin(angle) * radius * .66, size * (.34 + (i % 3) * .04), size * .25, angle * .3, 0, Math.PI * 2);
    c.fill();
  }
  c.fillStyle = "rgba(255,190,124,.12)";
  c.beginPath(); c.ellipse(-size * .22, -size * .24, size * .25, size * .12, -.3, 0, Math.PI * 2); c.fill();
  c.restore();
}

function drawAerialCar(c: CanvasRenderingContext2D, x: number, y: number, time: number) {
  c.save();
  c.translate(x, y);
  c.rotate(Math.sin(time * .8) * .018);
  c.fillStyle = "rgba(0,0,0,.44)";
  c.beginPath(); c.ellipse(4, 14, 56, 105, 0, 0, Math.PI * 2); c.fill();

  c.save();
  c.globalCompositeOperation = "screen";
  const beam = c.createLinearGradient(0, -82, 0, -310);
  beam.addColorStop(0, "rgba(255,242,197,.34)");
  beam.addColorStop(.36, "rgba(255,216,154,.15)");
  beam.addColorStop(1, "rgba(255,205,133,0)");
  c.fillStyle = beam;
  poly(c, [[-34,-78],[-18,-78],[-118,-315],[-225,-315]]); c.fill();
  poly(c, [[18,-78],[34,-78],[225,-315],[118,-315]]); c.fill();
  c.restore();

  c.fillStyle = "#090d12";
  c.fillRect(-48,-45,10,60); c.fillRect(38,-45,10,60);
  c.fillRect(-48,37,10,52); c.fillRect(38,37,10,52);

  const body = c.createLinearGradient(-48,0,48,0);
  body.addColorStop(0,"#111720");
  body.addColorStop(.22,"#58636c");
  body.addColorStop(.5,"#28333d");
  body.addColorStop(.78,"#68717a");
  body.addColorStop(1,"#10151c");
  c.fillStyle = body;
  c.beginPath();
  c.moveTo(-31,-88); c.quadraticCurveTo(-40,-76,-39,-48);
  c.lineTo(-42,62); c.quadraticCurveTo(-39,89,-24,96);
  c.lineTo(24,96); c.quadraticCurveTo(39,89,42,62);
  c.lineTo(39,-48); c.quadraticCurveTo(40,-76,31,-88);
  c.quadraticCurveTo(0,-101,-31,-88);
  c.fill();
  c.strokeStyle = "rgba(210,222,230,.72)";
  c.lineWidth = 1.8; c.stroke();

  const glass = c.createLinearGradient(-24,-58,25,-18);
  glass.addColorStop(0,"#82959d"); glass.addColorStop(.36,"#294252"); glass.addColorStop(1,"#101c28");
  c.fillStyle = glass;
  poly(c,[[-23,-56],[23,-56],[25,-23],[-25,-23]]); c.fill();
  c.fillStyle = "rgba(255,221,170,.2)";
  poly(c,[[-19,-53],[-8,-53],[-8,-27],[-22,-27]]); c.fill();

  c.fillStyle="#17212a";
  poly(c,[[-25,-12],[25,-12],[29,38],[0,49],[-29,38]]); c.fill();
  c.fillStyle="rgba(223,231,235,.18)"; c.fillRect(-30,-14,60,3);
  c.fillStyle="#fff0d0"; c.shadowColor="#ffe6b5"; c.shadowBlur=20;
  c.fillRect(-34,-86,17,7); c.fillRect(17,-86,17,7);
  c.shadowBlur=0; c.fillStyle="#ff5945"; c.shadowColor="#ff4635"; c.shadowBlur=10;
  c.fillRect(-34,86,15,5); c.fillRect(19,86,15,5);
  c.restore();
}

function drawOverhead(c: CanvasRenderingContext2D, time: number) {
  const ground = c.createLinearGradient(0,0,W,H);
  ground.addColorStop(0,"#26352c"); ground.addColorStop(.48,"#514c35"); ground.addColorStop(1,"#242e28");
  c.fillStyle=ground; c.fillRect(0,0,W,H);
  const scroll=(time*182)%166;
  for(let row=-1;row<7;row++){
    const y=row*166+scroll-75;
    drawTreeCanopy(c,115+(row%2)*82,y+20,76+(row%3)*8,row*.73);
    drawTreeCanopy(c,305+(row%2)*44,y+80,55+(row%2)*13,row*.91+1);
    drawTreeCanopy(c,1140-(row%2)*63,y+8,79+(row%3)*7,row*.82+2);
    drawTreeCanopy(c,1320-(row%2)*58,y+95,62+(row%2)*15,row*.67+3);
  }

  const asphalt=c.createLinearGradient(475,0,965,0);
  asphalt.addColorStop(0,"#353b3e"); asphalt.addColorStop(.14,"#53575a");
  asphalt.addColorStop(.5,"#686a6c"); asphalt.addColorStop(.86,"#53575a"); asphalt.addColorStop(1,"#353b3e");
  c.fillStyle=asphalt; c.fillRect(475,0,490,H);
  c.fillStyle="#b2a08a"; c.fillRect(468,0,7,H); c.fillRect(965,0,7,H);
  for(let i=0;i<7;i++){
    const y=((i*172+time*248)%1050)-120;
    c.fillStyle="rgba(244,231,201,.82)"; c.fillRect(717,y,6,82);
  }

  c.save(); c.globalCompositeOperation="screen";
  const sunset=c.createRadialGradient(1020,94,30,1020,94,720);
  sunset.addColorStop(0,"rgba(255,161,81,.2)"); sunset.addColorStop(.5,"rgba(244,127,67,.08)"); sunset.addColorStop(1,"rgba(244,127,67,0)");
  c.fillStyle=sunset; c.fillRect(400,0,1040,620); c.restore();

  drawAerialCar(c,720+Math.sin(time*.85)*8,584-smooth(0,1.8,time)*158,time);

  const titleAlpha=Math.min(smooth(.28,.95,time),1-smooth(4.05,4.75,time));
  if(titleAlpha>0){
    c.save(); c.globalAlpha=titleAlpha; c.textAlign="center"; c.textBaseline="middle";
    c.shadowColor="rgba(0,0,0,.85)"; c.shadowBlur=22; c.fillStyle="#fff0d6";
    c.font="500 36px Georgia, serif"; c.fillText("Gennaro Montecino Presenta",W/2,105);
    c.shadowBlur=0; c.strokeStyle="rgba(255,203,143,.78)"; c.lineWidth=1;
    c.beginPath(); c.moveTo(520,145); c.lineTo(920,145); c.stroke(); c.restore();
  }
  const vignette=c.createRadialGradient(W/2,H/2,250,W/2,H/2,860);
  vignette.addColorStop(0,"rgba(0,0,0,0)"); vignette.addColorStop(1,"rgba(3,7,7,.55)");
  c.fillStyle=vignette; c.fillRect(0,0,W,H);
}

function drawPine(c: CanvasRenderingContext2D, x: number, baseY: number, height: number) {
  c.save(); c.translate(x,baseY);
  c.fillStyle="rgba(0,0,0,.28)";
  c.beginPath(); c.ellipse(height*.1,3,height*.22,height*.065,0,0,Math.PI*2); c.fill();
  c.fillStyle="#2a211a"; c.fillRect(-height*.035,-height*.22,height*.07,height*.24);
  for(let layer=0;layer<4;layer++){
    const y=-height*(.35+layer*.16),width=height*(.21+layer*.065);
    poly(c,[[0,y-height*.45],[-width,y+height*.18],[width,y+height*.18]]);
    c.fillStyle=layer%2===0?"#182b25":"#253a2c"; c.fill();
    c.strokeStyle="rgba(171,151,103,.13)"; c.lineWidth=1; c.stroke();
  }
  c.restore();
}

function drawDashboard(c: CanvasRenderingContext2D, time: number) {
  const dash=c.createLinearGradient(0,560,0,H);
  dash.addColorStop(0,"#303139"); dash.addColorStop(.18,"#17191f"); dash.addColorStop(1,"#050609");
  poly(c,[[0,570],[310,536],[1130,536],[W,574],[W,H],[0,H]]);
  c.fillStyle=dash; c.fill();
  c.strokeStyle="rgba(174,179,181,.26)"; c.lineWidth=3;
  c.beginPath(); c.moveTo(0,574); c.quadraticCurveTo(720,495,W,574); c.stroke();

  c.fillStyle="#080b10"; c.beginPath(); c.roundRect(405,575,630,104,28); c.fill();
  c.fillStyle="#181c24"; c.beginPath(); c.roundRect(425,586,590,75,20); c.fill();
  for(let i=0;i<2;i++){
    const x=540+i*350;
    c.fillStyle="#05080c"; c.beginPath(); c.arc(x,619,39,0,Math.PI*2); c.fill();
    c.strokeStyle="rgba(224,151,82,.68)"; c.lineWidth=3;
    c.beginPath(); c.arc(x,619,32,Math.PI*1.12,Math.PI*1.9); c.stroke();
    const angle=-1.35+i*.34+Math.sin(time*1.2+i)*.08;
    c.strokeStyle="#f6d4a4"; c.lineWidth=2;
    c.beginPath(); c.moveTo(x,619); c.lineTo(x+Math.cos(angle)*24,619+Math.sin(angle)*24); c.stroke();
    c.fillStyle="#d8a477"; c.beginPath(); c.arc(x,619,3,0,Math.PI*2); c.fill();
  }
  c.fillStyle="#1e2730"; c.beginPath(); c.roundRect(672,596,96,44,7); c.fill();
  c.fillStyle="#d38a55"; c.globalAlpha=.8+Math.sin(time*3)*.12; c.fillRect(689,608,62,2);
  c.fillStyle="#8ec4bd"; c.fillRect(693,618,54,11); c.globalAlpha=1;

  // Volante en primer plano y manos del conductor.
  c.save(); c.translate(720,758); c.rotate(Math.sin(time*1.05)*.045);
  c.strokeStyle="#07090d"; c.lineWidth=34;
  c.beginPath(); c.arc(0,0,126,0,Math.PI*2); c.stroke();
  c.strokeStyle="rgba(150,160,167,.48)"; c.lineWidth=3;
  c.beginPath(); c.arc(0,0,126,Math.PI*1.06,Math.PI*1.94); c.stroke();
  c.fillStyle="#11151a";
  poly(c,[[-17,-10],[-47,-94],[-23,-103],[0,-37],[23,-103],[47,-94],[17,-10],[40,59],[-40,59]]);
  c.fill();
  c.fillStyle="#252a31"; c.beginPath(); c.roundRect(-42,-26,84,70,17); c.fill();
  c.strokeStyle="rgba(176,183,186,.3)"; c.lineWidth=2; c.stroke();
  const skin=c.createLinearGradient(0,-5,0,42);
  skin.addColorStop(0,"#e0ae86"); skin.addColorStop(1,"#a86c51");
  c.fillStyle=skin; c.beginPath();
  c.ellipse(-106,-35,18,28,-.48,0,Math.PI*2);
  c.ellipse(106,-35,18,28,.48,0,Math.PI*2); c.fill();
  c.fillStyle="#252a32"; c.beginPath();
  c.ellipse(-102,-55,22,13,-.42,0,Math.PI*2);
  c.ellipse(102,-55,22,13,.42,0,Math.PI*2); c.fill();
  c.restore();

  const hood=c.createLinearGradient(0,535,0,610);
  hood.addColorStop(0,"rgba(5,8,11,.02)"); hood.addColorStop(1,"rgba(5,8,11,.78)");
  c.fillStyle=hood; poly(c,[[550,515],[890,515],[1110,585],[330,585]]); c.fill();

  const vignette=c.createRadialGradient(720,400,240,720,400,860);
  vignette.addColorStop(0,"rgba(0,0,0,0)"); vignette.addColorStop(1,"rgba(0,0,0,.64)");
  c.fillStyle=vignette; c.fillRect(0,0,W,H);
}

function drawFirstPerson(c: CanvasRenderingContext2D, time: number, piltri: HTMLImageElement | null) {
  const sky=c.createLinearGradient(0,0,0,550);
  sky.addColorStop(0,"#a65e49"); sky.addColorStop(.42,"#db9164"); sky.addColorStop(1,"#f0bc83");
  c.fillStyle=sky; c.fillRect(0,0,W,555);
  if(piltri && piltri.complete && piltri.naturalWidth>0){
    const cropHeight=Math.min(piltri.naturalHeight,piltri.naturalWidth*500/W);
    c.drawImage(piltri,0,0,piltri.naturalWidth,cropHeight,0,0,W,500);
  }else{
    c.fillStyle="#48545a";
    poly(c,[[0,435],[150,360],[290,390],[460,255],[650,378],[820,270],[1020,385],[1200,302],[W,405],[W,540],[0,540]]);
    c.fill();
  }
  const grade=c.createLinearGradient(0,0,0,550);
  grade.addColorStop(0,"rgba(255,151,83,.23)"); grade.addColorStop(.5,"rgba(236,126,67,.28)"); grade.addColorStop(1,"rgba(94,50,37,.16)");
  c.fillStyle=grade; c.fillRect(0,0,W,555);

  const horizon=432;
  for(let side=0;side<2;side++){
    for(let i=0;i<8;i++){
      const depth=((i/8)+(time*.12)%1)%1;
      const y=horizon+depth*depth*390,treeH=28+depth*250,spread=105+depth*660;
      drawPine(c,W/2+(side===0?-spread:spread),y,treeH);
    }
  }

  const road=c.createLinearGradient(0,horizon,0,H);
  road.addColorStop(0,"#535356"); road.addColorStop(.65,"#34373b"); road.addColorStop(1,"#191b20");
  poly(c,[[690,horizon],[750,horizon],[W+200,H],[-200,H]]);
  c.fillStyle=road; c.fill();

  c.strokeStyle="rgba(236,213,174,.88)"; c.lineWidth=5;
  c.beginPath(); c.moveTo(690,horizon); c.lineTo(70,H); c.moveTo(750,horizon); c.lineTo(1370,H); c.stroke();
  for(let i=0;i<11;i++){
    const progress=((i/11)+(time*.76)%1)%1,depth=progress*progress;
    const y=horizon+depth*370,half=3+depth*48,markH=5+depth*42;
    c.fillStyle="rgba(240,230,207,"+(0.62+depth*.24)+")";
    poly(c,[[W/2-half,y],[W/2+half,y],[W/2+half,y+markH],[W/2-half,y+markH]]); c.fill();
  }

  c.save(); c.globalCompositeOperation="screen";
  const headlights=c.createLinearGradient(0,445,0,H);
  headlights.addColorStop(0,"rgba(255,223,173,0)");
  headlights.addColorStop(.35,"rgba(255,222,177,.08)");
  headlights.addColorStop(1,"rgba(255,226,184,.24)");
  c.fillStyle=headlights; poly(c,[[665,455],[775,455],[1240,H],[200,H]]); c.fill();
  c.restore();

  // Postes y tendido de la banquina.
  for(let i=0;i<5;i++){
    const depth=((i/5)+(time*.16)%1)%1;
    const y=horizon+depth*depth*360,h=22+depth*175,spread=95+depth*650;
    for(const side of [-1,1]){
      const x=W/2+side*spread;
      c.strokeStyle="rgba(37,34,31,.82)"; c.lineWidth=1+depth*4;
      c.beginPath(); c.moveTo(x,y); c.lineTo(x,y-h); c.stroke();
      c.fillStyle="rgba(255,207,144,.5)"; c.fillRect(x-2,y-h,4+depth*4,2+depth*2);
    }
  }

  c.fillStyle="rgba(4,7,11,.86)";
  poly(c,[[0,0],[W,0],[W,36],[0,36]]); c.fill();
  const pillar=c.createLinearGradient(0,0,125,0);
  pillar.addColorStop(0,"#080b10"); pillar.addColorStop(1,"#25282a");
  c.fillStyle=pillar; poly(c,[[0,0],[125,0],[250,585],[0,675]]); c.fill();
  const pillarR=c.createLinearGradient(1315,0,W,0);
  pillarR.addColorStop(0,"#25282a"); pillarR.addColorStop(1,"#080b10");
  c.fillStyle=pillarR; poly(c,[[1315,0],[W,0],[W,675],[1190,585]]); c.fill();

  c.fillStyle="#11151a"; c.beginPath(); c.roundRect(660,35,120,24,9); c.fill();
  c.fillStyle="rgba(163,186,190,.26)"; c.beginPath(); c.roundRect(667,39,106,15,6); c.fill();
  c.fillStyle="rgba(255,225,192,.055)"; poly(c,[[220,60],[440,60],[590,420],[510,420]]); c.fill();
  drawDashboard(c,time);
}

function drawFrame(c: CanvasRenderingContext2D,time: number,piltri: HTMLImageElement | null) {
  c.fillStyle="#030405"; c.fillRect(0,0,W,H);
  const view=smooth(4.55,5.95,time);
  if(view<1){
    c.save(); c.globalAlpha=1-view; drawOverhead(c,time); c.restore();
  }
  if(view>0){
    c.save(); c.globalAlpha=view;
    c.translate(Math.sin(time*1.4)*2.1,Math.sin(time*18)*.65);
    drawFirstPerson(c,Math.max(0,time-4.8),piltri);
    c.restore();
  }
  if(time>4.65&&time<5.8){
    const glow=Math.sin(((time-4.65)/1.15)*Math.PI);
    c.fillStyle="rgba(255,180,109,"+(glow*.12)+")"; c.fillRect(0,0,W,H);
  }
  const ending=smooth(11.55,13.05,time);
  if(ending>0){c.fillStyle="rgba(1,2,4,"+(ending*.97)+")";c.fillRect(0,0,W,H);}
  const title=smooth(12.65,13.55,time);
  if(title>0){
    c.save(); c.globalAlpha=title; c.textAlign="center"; c.textBaseline="middle";
    c.shadowColor="rgba(233,131,74,.42)"; c.shadowBlur=26; c.fillStyle="#f4d5b4";
    c.font="500 54px Georgia, serif"; c.fillText("CONTINUARÁ",W/2,H/2);
    c.shadowBlur=0; c.fillStyle="rgba(244,176,119,.72)"; c.fillRect(W/2-68,H/2+52,136,1);
    c.restore();
  }
}

export function Route40Opening() {
  const canvasRef=useRef<HTMLCanvasElement|null>(null);
  const [replay,setReplay]=useState(0);
  const [finished,setFinished]=useState(false);

  useEffect(()=>{
    const canvas=canvasRef.current;
    const c=canvas?.getContext("2d",{alpha:false});
    if(!canvas||!c)return;
    let active=true,frame=0,startedAt=0,started=false,ended=false;
    setFinished(false);
    const mountain=new Image();
    mountain.decoding="async";
    mountain.src="/imagens/piltri.jpg";

    const animate=(now:number)=>{
      if(!active)return;
      if(!started){startedAt=now;started=true;}
      const elapsed=Math.min(DURATION,Math.max(0,(now-startedAt)/1000));
      const rect=canvas.getBoundingClientRect(),width=Math.max(1,rect.width),height=Math.max(1,rect.height);
      const dpr=Math.min(2,window.devicePixelRatio||1),pw=Math.round(width*dpr),ph=Math.round(height*dpr);
      if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}
      c.setTransform(dpr,0,0,dpr,0,0); c.fillStyle="#030405"; c.fillRect(0,0,width,height);
      const scale=Math.max(width/W,height/H),ox=(width-W*scale)/2,oy=(height-H*scale)/2;
      c.setTransform(dpr*scale,0,0,dpr*scale,dpr*ox,dpr*oy);
      drawFrame(c,elapsed,mountain);
      if(elapsed>=DURATION&&!ended){ended=true;setFinished(true);}
      if(!ended)frame=window.requestAnimationFrame(animate);
    };
    frame=window.requestAnimationFrame(animate);
    return ()=>{active=false;window.cancelAnimationFrame(frame);mountain.onload=null;};
  },[replay]);

  return (
    <div className="fixed inset-0 z-[2000] h-[100svh] w-screen overflow-hidden bg-[#030405] text-white">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        role="img"
        aria-label="Cinemática de La Señal en la Ruta 40: un auto pasa por una ruta arbolada al atardecer y luego vemos el Piltriquitrón desde el interior del vehículo."
      />
      {finished&&(
        <div className="absolute inset-x-0 bottom-[max(28px,env(safe-area-inset-bottom))] z-10 flex flex-wrap items-center justify-center gap-3 px-4">
          <button
            type="button"
            onClick={()=>setReplay((value)=>value+1)}
            className="inline-flex min-h-11 items-center gap-2 border border-amber-100/35 bg-black/55 px-5 py-3 font-mono text-[11px] tracking-[.18em] text-amber-100 backdrop-blur-md transition hover:border-amber-100/80 hover:bg-black/80"
          >
            <RotateCcw size={14}/> REPETIR CINEMÁTICA
          </button>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 border border-white/20 bg-black/40 px-5 py-3 font-mono text-[11px] tracking-[.18em] text-white/75 backdrop-blur-md transition hover:border-white/60 hover:text-white"
          >
            <ArrowLeft size={14}/> VOLVER AL INICIO
          </Link>
        </div>
      )}
      <div className="pointer-events-none absolute bottom-3 right-4 z-10 font-mono text-[9px] tracking-[.2em] text-white/30">
        LA SEÑAL EN LA RUTA 40
      </div>
    </div>
  );
}
