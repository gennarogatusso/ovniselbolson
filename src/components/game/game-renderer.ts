import { ALIEN_MESSAGE, GROUND, H, W, WORLD, SHIP, FOREST, forestIsFree, canAskHelp, type S } from './game-engine';
export type IntroImages = { building: HTMLImageElement; mountain: HTMLImageElement; seated: HTMLImageElement; beer: HTMLImageElement; drink: HTMLImageElement; smokeIn: HTMLImageElement; smokeOut: HTMLImageElement; rise: HTMLImageElement; cat: HTMLImageElement };
export type ChapterImages = { truck: HTMLImageElement; trump: HTMLImageElement; milei: HTMLImageElement; arg: HTMLImageElement; usa: HTMLImageElement; bedroom: HTMLImageElement; eating: HTMLImageElement; sleeping: HTMLImageElement; waking: HTMLImageElement; dark: HTMLImageElement; walk: HTMLImageElement; up: HTMLImageElement; down: HTMLImageElement; run: HTMLImageElement; restingCat: HTMLImageElement; forest: HTMLImageElement; deer: HTMLImageElement; ship: HTMLImageElement };
export type ShipImages = { grey: HTMLImageElement; pickup: HTMLImageElement; push: HTMLImageElement; roll: HTMLImageElement; contemplate: HTMLImageElement; cat: HTMLImageElement; weapon: HTMLImageElement; laboratory: HTMLImageElement; main: HTMLImageElement; cross: HTMLImageElement };
export type GameImages = { ship: ShipImages; chapter: ChapterImages; intro: IntroImages; mountain: HTMLImageElement; player: HTMLImageElement; cat: HTMLImageElement; alien: HTMLImageElement; fighter: HTMLImageElement; gun: HTMLImageElement; allies: [HTMLImageElement, HTMLImageElement]; house: HTMLImageElement; tree: HTMLImageElement; alienFrames: [HTMLImageElement, HTMLImageElement, HTMLImageElement, HTMLImageElement]; reunion: HTMLImageElement };
const trims=new WeakMap<HTMLImageElement,[number,number,number,number]>();
function drawTrimmed(c:CanvasRenderingContext2D,im:HTMLImageElement,x:number,y:number,w:number,h:number){if(!ready(im))return;let b=trims.get(im);if(!b){const t=document.createElement('canvas');t.width=im.naturalWidth;t.height=im.naturalHeight;const q=t.getContext('2d');if(!q)return;q.drawImage(im,0,0);const d=q.getImageData(0,0,t.width,t.height).data;let l=t.width,r=0,top=t.height,bot=0;for(let yy=0;yy<t.height;yy++)for(let xx=0;xx<t.width;xx++){const i=(yy*t.width+xx)*4;if((d[i+3]??0)>16&&((d[i]??255)<245||(d[i+1]??255)<245||(d[i+2]??255)<245)){l=Math.min(l,xx);r=Math.max(r,xx);top=Math.min(top,yy);bot=Math.max(bot,yy);}}b=l<=r&&top<=bot?[l,top,r-l+1,bot-top+1]:[0,0,t.width,t.height];trims.set(im,b);}c.drawImage(im,b[0],b[1],b[2],b[3],x,y,w,h);}
export type Palette = Record<'turquoise'|'sky'|'rose'|'gold'|'sunset'|'light'|'ice'|'panel'|'ink'|'forest'|'trunk'|'wall'|'roof'|'leaf'|'road'|'curb'|'lane'|'shadow'|'hill'|'metal'|'glass'|'laser'|'smoke'|'stone'|'skin'|'red'|'alien'|'energy',string>;
const ready = (im?:HTMLImageElement) => Boolean(im?.complete && im.naturalWidth);
function box(c:CanvasRenderingContext2D,col:string,x:number,y:number,w:number,h:number) {c.fillStyle=col;c.fillRect(x,y,w,h);}
function oval(c:CanvasRenderingContext2D,col:string,x:number,y:number,rx:number,ry:number) { if(!(rx>0&&ry>0))return; c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill(); }
function bubble(c:CanvasRenderingContext2D,text:string,x:number,y:number,p:Palette,max=650) {
 if(!text.trim())return;
 c.save();c.font='bold 17px "IBM Plex Mono", monospace';c.textAlign='center';c.textBaseline='middle';
 const words=text.split(' '), lines:string[]=[];let line='';
 for(const word of words) { const next=line?line+' '+word:word;if(c.measureText(next).width>max && line){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
 const width=Math.min(max,Math.max(...lines.map(l=>c.measureText(l).width)))+30, height=lines.length*25+20;
 const cx=Math.max(width/2+10,Math.min(W-width/2-10,x)); y=Math.max(height+8,y);
 c.fillStyle=p.panel;c.beginPath();c.roundRect(cx-width/2,y-height,width,height,6);c.fill();c.strokeStyle=p.light;c.lineWidth=1;c.stroke();
 c.fillStyle=p.light; lines.forEach((l,i)=>c.fillText(l,cx,y-height+23+i*25));c.beginPath();c.moveTo(x-6,y);c.lineTo(x,y+8);c.lineTo(x+6,y);c.fill();c.restore();
}
function sprite(c:CanvasRenderingContext2D,im:HTMLImageElement,x:number,y:number,h:number,face:number,walk:number,crouch=false) {
 if(!ready(im)) return;
 const ratio=im.naturalWidth/im.naturalHeight,w=h*ratio,bob=Math.sin(walk*2)*1.8;
 c.save();c.translate(x,y);c.scale(face,1);
 if(crouch){c.rotate(-0.23);c.translate(4,9);}
 // Articulated legs use the original pixels, never stretch the silhouette.
 const legY=Math.round(im.naturalHeight*.66), upperH=h*.66;
 c.drawImage(im,0,0,im.naturalWidth,legY,-w/2,-h+bob,w,upperH);
 const lowerH=h-upperH, step=Math.sin(walk)*4;
 for(let i=0;i<2;i++){c.save();c.translate((i?1:-1)*w/4,-lowerH+bob);c.rotate((i?1:-1)*step*.018);c.drawImage(im,i*im.naturalWidth/2,legY,im.naturalWidth/2,im.naturalHeight-legY,-w/4,0,w/2,lowerH);c.restore();}
 c.restore();
}
function catSprite(c:CanvasRenderingContext2D,im:HTMLImageElement,x:number,y:number,walk:number,face:number) {
 if(!ready(im)) return; const h=40,w=h*im.naturalWidth/im.naturalHeight;
 c.save();c.translate(x,y+6+Math.sin(walk)*1);c.scale(face,1);c.drawImage(im,-w/2,-h,w,h);c.restore();
}
function person(c:CanvasRenderingContext2D,im:HTMLImageElement,x:number,y:number,t:number,i:number,dead=false) {
 c.save();c.translate(x,y);if(dead){c.rotate(-Math.PI/2);c.translate(15,0);}const b=dead?0:Math.sin(t*2+i)*1.5;
   drawNpc(c,im,0,b,86);c.restore();
}
const npcSprites=new WeakMap<HTMLImageElement,HTMLCanvasElement>();
function drawNpc(c:CanvasRenderingContext2D,im:HTMLImageElement,x:number,y:number,h:number) {
 if(!ready(im))return;
 let sprite=npcSprites.get(im);
 if(!sprite){
  sprite=document.createElement('canvas');sprite.width=im.naturalWidth;sprite.height=im.naturalHeight;
  const q=sprite.getContext('2d');if(!q)return;q.drawImage(im,0,0);
  const image=q.getImageData(0,0,sprite.width,sprite.height),data=image.data,w=sprite.width,hh=sprite.height,seen=new Uint8Array(w*hh),stack=new Int32Array(w*hh);let count=0;
  const add=(n:number)=>{if(!seen[n]){const k=n*4;if(Math.max(data[k]??0,data[k+1]??0,data[k+2]??0)<28){seen[n]=1;stack[count++]=n;}}};
  for(let xx=0;xx<w;xx++){add(xx);add((hh-1)*w+xx);}for(let yy=0;yy<hh;yy++){add(yy*w);add(yy*w+w-1);}
  while(count){const n=stack[--count];if(n===undefined)continue;const xx=n%w,yy=Math.floor(n/w);data[n*4+3]=0;if(xx)add(n-1);if(xx<w-1)add(n+1);if(yy)add(n-w);if(yy<hh-1)add(n+w);}
  q.putImageData(image,0,0);npcSprites.set(im,sprite);
 }
 const width=h*sprite.width/sprite.height;c.save();c.imageSmoothingEnabled=false;c.drawImage(sprite,x-width/2,y-h,width,h);c.restore();
}
function ufo(c:CanvasRenderingContext2D,s:S,p:Palette) {
 const {u}=s,abduction=['descend','beam','rise'].includes(s.phase),pulse=.5+.5*Math.sin(s.t*5.2);
 c.save();c.translate(u.x,u.y);
 if(s.phase==='crash')c.rotate(Math.sin(s.pt*13)*.25+s.pt*.08);
 if(['arrive','reunion','alien','speech','attack','fade'].includes(s.phase))c.rotate(.25);
 // Halo exterior: el brillo se intensifica cuando el OVNI fija al gato.
 c.globalCompositeOperation='screen';
 const halo=c.createRadialGradient(0,7,5,0,7,abduction?112:76);
 halo.addColorStop(0,abduction?'rgba(150,246,255,.34)':'rgba(150,210,255,.12)');
 halo.addColorStop(.42,abduction?'rgba(75,196,255,.14)':'rgba(75,160,255,.045)');
 halo.addColorStop(1,'rgba(70,160,255,0)');
 c.fillStyle=halo;c.fillRect(-120,-110,240,220);
 c.globalCompositeOperation='source-over';
 // Cúpula superior de vidrio.
 const dome=c.createLinearGradient(0,-33,0,2);
 dome.addColorStop(0,'#f0fbff');dome.addColorStop(.28,'#9fc9dc');dome.addColorStop(.72,'#425b70');dome.addColorStop(1,'#1b2c3d');
 c.shadowColor=abduction?'#91f3ff':p.ice;c.shadowBlur=abduction?18+10*pulse:s.phase==='fight'?12:4;
 c.fillStyle=dome;c.beginPath();c.ellipse(0,-8,29,18,0,0,Math.PI*2);c.fill();
 c.strokeStyle='rgba(218,249,255,.72)';c.lineWidth=1.5;c.beginPath();c.ellipse(0,-8,28,17,0,Math.PI*1.08,Math.PI*1.9);c.stroke();
 // Casco metálico en capas y con reflejos.
 const hull=c.createLinearGradient(0,-17,0,18);
 hull.addColorStop(0,'#edf8fa');hull.addColorStop(.2,'#a9c0cb');hull.addColorStop(.48,'#526b7b');hull.addColorStop(.72,'#263d50');hull.addColorStop(1,'#101d2b');
 c.fillStyle=hull;c.beginPath();c.ellipse(0,1,68,16,0,0,Math.PI*2);c.fill();
 c.shadowBlur=0;c.strokeStyle='rgba(224,248,255,.9)';c.lineWidth=1.4;c.beginPath();c.ellipse(0,0,67,15,0,Math.PI,Math.PI*2);c.stroke();
 c.strokeStyle='rgba(21,42,57,.9)';c.lineWidth=2;c.beginPath();c.ellipse(0,7,54,8,0,0,Math.PI);c.stroke();
 c.fillStyle='rgba(220,247,255,.25)';c.beginPath();c.ellipse(-10,-5,39,3,0,-.12,Math.PI+.12);c.fill();
 // Paneles del borde y luces circulares.
 for(let i=0;i<15;i++){
  const angle=(Math.PI*2*i)/15,x=Math.cos(angle)*59,y=1+Math.sin(angle)*10.4;
  const active=(i+Math.floor(s.t*7))%3!==0;
  const color=abduction?(active?'#c9ffff':'#54d9ff'):(active?p.laser:p.gold);
  c.shadowColor=abduction?'#8ff8ff':color;c.shadowBlur=abduction?10:5;
  oval(c,color,x,y,2.8,2.1);
 }
 c.shadowBlur=abduction?17:7;c.shadowColor=abduction?'#b4ffff':p.ice;
 const emitter=c.createRadialGradient(0,12,1,0,12,18);
 emitter.addColorStop(0,'rgba(255,255,255,.98)');emitter.addColorStop(.24,abduction?'rgba(129,249,255,.95)':'rgba(155,213,255,.55)');emitter.addColorStop(1,'rgba(47,172,255,0)');
 c.fillStyle=emitter;c.beginPath();c.ellipse(0,12,17,6,0,0,Math.PI*2);c.fill();
 c.shadowBlur=0;c.fillStyle='#172b3a';c.beginPath();c.ellipse(0,11,8,3,0,0,Math.PI*2);c.fill();
 if(u.hit>0){c.globalAlpha=Math.min(1,u.hit*2);oval(c,'#ffffff',0,0,67,16);c.globalAlpha=1;}
 c.restore();
 if(['crash','arrive','reunion','alien','speech','attack','fade'].includes(s.phase)){
  for(let i=0;i<12;i++){const q=(s.t*.25+i/12)%1;c.globalAlpha=(1-q)*.5;oval(c,p.smoke,u.x+Math.sin(i*2)*22+q*40,u.y-q*145,9+q*24,10+q*20);}c.globalAlpha=1;
 }
}
function drawCatAbductionLighting(c:CanvasRenderingContext2D,s:S,p:Palette){
 if(!s.u.vis||!['descend','beam','rise'].includes(s.phase))return;
 const {u,cat}=s,clamp=(v:number)=>Math.max(0,Math.min(1,v));
 const lift=s.phase==='beam'?clamp((s.pt-.6)/1.6):s.phase==='rise'?1:0;
 const intensity=s.phase==='descend'?clamp(s.pt/1.5)*.72:s.phase==='beam'?.86+.1*Math.sin(s.t*5):Math.max(.22,1-s.pt/2.8);
 const topX=u.x,topY=u.y+15,endX=cat.x;
 const endY=s.phase==='descend'?GROUND-5:Math.max(topY+42,cat.y-(s.phase==='rise'?19:7));
 const spread=(s.phase==='rise'?72:155-78*lift)*(.94+.06*Math.sin(s.t*4));
 c.save();c.globalCompositeOperation='screen';
 // Baño frío que alcanza árboles, fachadas y calle alrededor de la nave.
 const spill=c.createRadialGradient(u.x,u.y+105,18,u.x,u.y+105,360);
 spill.addColorStop(0,'rgba(94,221,255,.18)');spill.addColorStop(.42,'rgba(68,159,225,.075)');spill.addColorStop(1,'rgba(45,125,205,0)');
 c.globalAlpha=intensity;c.fillStyle=spill;c.fillRect(u.x-370,u.y-260,740,740);
 // Luz cálida de faroles/ventanas cercanas, con reflejo suave sobre el asfalto.
 const firstHouse=Math.max(40,Math.floor((s.cam-260-40)/300)*300+40);
 for(let houseX=firstHouse;houseX<s.cam+W+180;houseX+=300){
  const houseWidth=houseX===340?205:145,lampX=houseX+houseWidth*.64,lampY=GROUND-91;
  const flicker=.92+.05*Math.sin(s.t*2.3+houseX*.018)+.025*Math.sin(s.t*7+houseX);
  const radius=94,glow=c.createRadialGradient(lampX,lampY,1,lampX,lampY,radius);
  glow.addColorStop(0,'rgba(255,218,156,.42)');glow.addColorStop(.28,'rgba(255,170,103,.19)');glow.addColorStop(1,'rgba(255,145,81,0)');
  c.globalAlpha=intensity*flicker;c.fillStyle=glow;c.fillRect(lampX-radius,lampY-radius,radius*2,radius*2);
  c.globalAlpha=intensity*.74;c.shadowColor='#ffd18f';c.shadowBlur=13;
  oval(c,'rgba(255,230,183,.9)',lampX,lampY,3.2,4.2);c.shadowBlur=0;
  const roadGlow=c.createRadialGradient(lampX,GROUND+31,1,lampX,GROUND+31,82);
  roadGlow.addColorStop(0,'rgba(255,190,119,.17)');roadGlow.addColorStop(1,'rgba(255,145,81,0)');
  c.globalAlpha=intensity*.72;c.fillStyle=roadGlow;c.fillRect(lampX-82,GROUND-51,164,164);
 }
 // Bloom concentrado en la parte inferior del casco.
 const ufoGlow=c.createRadialGradient(u.x,u.y+12,2,u.x,u.y+12,175);
 ufoGlow.addColorStop(0,'rgba(224,255,255,.40)');ufoGlow.addColorStop(.28,'rgba(87,218,255,.19)');ufoGlow.addColorStop(1,'rgba(58,160,255,0)');
 c.globalAlpha=intensity;c.fillStyle=ufoGlow;c.fillRect(u.x-180,u.y-165,360,360);
 // Haz volumétrico con bordes difusos y un núcleo casi blanco.
 const outer=c.createLinearGradient(topX,topY,endX,endY);
 outer.addColorStop(0,'rgba(225,255,255,.62)');outer.addColorStop(.22,'rgba(131,235,255,.32)');outer.addColorStop(.72,'rgba(74,202,255,.13)');outer.addColorStop(1,'rgba(66,183,255,.055)');
 c.globalAlpha=intensity*.86;c.fillStyle=outer;c.beginPath();
 c.moveTo(topX-17,topY);c.lineTo(topX+17,topY);c.lineTo(endX+spread,endY);c.lineTo(endX-spread,endY);c.closePath();c.fill();
 const inner=c.createLinearGradient(topX,topY,endX,endY);
 inner.addColorStop(0,'rgba(255,255,255,.92)');inner.addColorStop(.3,'rgba(191,250,255,.42)');inner.addColorStop(1,'rgba(139,230,255,.10)');
 c.globalAlpha=intensity*.62;c.fillStyle=inner;c.beginPath();
 c.moveTo(topX-5,topY);c.lineTo(topX+5,topY);c.lineTo(endX+spread*.23,endY);c.lineTo(endX-spread*.23,endY);c.closePath();c.fill();
 // Rayos finos que vibran dentro del cono.
 for(let i=0;i<9;i++){
  const q=(i+1)/10,drift=Math.sin(s.t*2.6+i*1.8)*spread*.12;
  c.globalAlpha=intensity*(.10+.07*Math.sin(s.t*3+i));
  c.strokeStyle=i%3===0?'rgba(244,255,255,.8)':'rgba(121,226,255,.62)';
  c.lineWidth=i%3===0?2:1;c.beginPath();
  c.moveTo(topX+(i-4)*2,topY+8);
  c.lineTo(topX+(endX-topX)*q+drift,topY+(endY-topY)*q);
  c.stroke();
 }
 // Anillo y charco de luz sobre el suelo: se apagan a medida que el gato sube.
 const groundPower=s.phase==='rise'?Math.max(0,1-s.pt/1.05):1-lift*.68;
 if(groundPower>0){
  const groundGlow=c.createRadialGradient(cat.x,GROUND-3,2,cat.x,GROUND-3,190);
  groundGlow.addColorStop(0,'rgba(222,255,255,.5)');groundGlow.addColorStop(.22,'rgba(93,220,255,.24)');groundGlow.addColorStop(1,'rgba(60,174,255,0)');
  c.globalAlpha=intensity*groundPower;c.fillStyle=groundGlow;c.fillRect(cat.x-195,GROUND-198,390,390);
  c.globalAlpha=intensity*groundPower*.68;c.strokeStyle='rgba(178,249,255,.72)';c.lineWidth=2;
  c.beginPath();c.ellipse(cat.x,GROUND+1,44+Math.sin(s.t*5)*9,7+Math.sin(s.t*5)*1.5,0,0,Math.PI*2);c.stroke();
 }
 // Polvo y pequeños fragmentos iluminados que ascienden desde el gato al OVNI.
 for(let i=0;i<22;i++){
  const q=(s.t*.48+i/22)%1,x=cat.x+(topX-cat.x)*q+Math.sin(s.t*2.4+i*1.9)*(7+spread*.13);
  const y=endY+(topY-endY)*q;
  c.globalAlpha=intensity*(.2+.45*(1-q));c.shadowColor='#c8faff';c.shadowBlur=8;
  oval(c,i%4===0?'#ffffff':'#a6efff',x,y,1.3+(i%3)*.55,1.7+(i%2)*.6);
 }
 c.shadowBlur=0;
 // Viñeta sutil para llevar la mirada al punto de abducción.
 c.globalCompositeOperation='multiply';c.globalAlpha=.23*intensity;
 const vignette=c.createRadialGradient(u.x,GROUND*.53,150,u.x,GROUND*.53,710);
 vignette.addColorStop(0,'rgba(8,17,34,0)');vignette.addColorStop(1,'rgba(5,9,23,.65)');
 c.fillStyle=vignette;c.fillRect(s.cam-40,0,W+80,H);
 c.restore();
}


function pose(c:CanvasRenderingContext2D,im:HTMLImageElement,frame:number,count:number,x:number,y:number,h:number,alpha=1) {
 if(!ready(im)||alpha<=0)return;
 const fw=im.naturalWidth/count,w=h*fw/im.naturalHeight;
 c.save();c.imageSmoothingEnabled=false;c.globalAlpha=alpha;
 c.drawImage(im,frame*fw,0,fw,im.naturalHeight,x-w/2,y-h,w,h);c.restore();
}
function alien(c:CanvasRenderingContext2D,s:S,frames:GameImages['alienFrames']) {
 const frame=s.phase==='alien'?Math.min(3,Math.floor(Math.max(0,s.pt-1.5)/1.1)):3;
 const current=frames[frame];if(!current||!ready(current))return;
 const h=110, w=h*current.naturalWidth/current.naturalHeight;
   c.save();c.imageSmoothingEnabled=false;c.globalAlpha=s.alien.reveal;
   c.drawImage(current,s.alien.x-w/2,s.alien.y-h,w,h);c.restore();
}
function breeze(c:CanvasRenderingContext2D,s:S,p:Palette) {
 c.save();c.globalAlpha=.32;
 for(let i=0;i<6;i++){
  const x=((i*179+s.t*9)% (W+40))-20+s.cam;
  const y=(i%2?GROUND-35:245)+Math.sin(s.t*.7+i*2)*7;
  box(c,i%3===0?p.gold:p.leaf,Math.round(x),Math.round(y),4,2);
  box(c,p.leaf,Math.round(x)+2,Math.round(y)-1,2,1);
 }
 c.restore();
}
function still(c:CanvasRenderingContext2D,im:HTMLImageElement,x:number,y:number,h:number,alpha=1){
 if(!ready(im))return;const w=h*im.naturalWidth/im.naturalHeight;
 c.save();c.globalAlpha=alpha;c.drawImage(im,x-w/2,y-h,w,h);c.restore();
}

function awkaNightAtmosphere(c:CanvasRenderingContext2D,s:S){
 const departure=s.intro.stage==='depart'?Math.max(0,1-s.intro.time/1.5):1;
 if(departure<=0)return;
 c.save();c.globalAlpha=departure;
 c.globalCompositeOperation='multiply';
 const grade=c.createLinearGradient(0,0,0,H);
 grade.addColorStop(0,'rgba(5,10,30,.66)');
 grade.addColorStop(.48,'rgba(13,15,35,.50)');
 grade.addColorStop(1,'rgba(8,10,25,.66)');
 c.fillStyle=grade;c.fillRect(0,0,W,H);
 c.globalCompositeOperation='screen';
 const lamps:[number,number,number,number][]=[[105,286,175,.30],[345,275,185,.24],[605,290,205,.27],[855,300,170,.22]];
 for(let i=0;i<lamps.length;i++){
  const lamp=lamps[i]!,[x,y,radius,intensity]=lamp;
  const flicker=.92+Math.sin(s.t*2.1+i*1.7)*.06+Math.sin(s.t*5+i)*.025;
  const glow=c.createRadialGradient(x,y,2,x,y,radius);
  glow.addColorStop(0,`rgba(255,190,112,${intensity*flicker})`);
  glow.addColorStop(.35,`rgba(224,139,83,${intensity*.25})`);
  glow.addColorStop(1,'rgba(255,150,85,0)');
  c.fillStyle=glow;c.fillRect(x-radius,y-radius,radius*2,radius*2);
  c.shadowColor='#ffc77e';c.shadowBlur=15;oval(c,'rgba(255,216,157,.62)',x,y,2.4,2.4);c.shadowBlur=0;
 }
 const moon=c.createRadialGradient(770,42,4,770,42,470);
 moon.addColorStop(0,'rgba(116,160,226,.20)');moon.addColorStop(.45,'rgba(93,130,196,.075)');moon.addColorStop(1,'rgba(74,110,185,0)');
 c.fillStyle=moon;c.fillRect(300,0,660,430);
 for(let i=0;i<3;i++){
  const x=170+i*275,beam=c.createLinearGradient(x,230,x+38,450);
  beam.addColorStop(0,'rgba(255,195,125,.105)');beam.addColorStop(1,'rgba(255,176,104,0)');
  c.fillStyle=beam;c.beginPath();c.moveTo(x-15,225);c.lineTo(x+18,225);c.lineTo(x+112,450);c.lineTo(x-100,450);c.closePath();c.fill();
 }
 c.globalCompositeOperation='screen';
 for(let i=0;i<4;i++){
  const phase=s.t*.48+i*1.63,y=225+i*49+Math.sin(phase)*12,x=((s.t*(28+i*7)+i*223)%(W+260))-130;
  c.strokeStyle=`rgba(177,202,221,${.07+(.025*Math.sin(phase*1.7))})`;c.lineWidth=i%2?1.3:2;
  c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x+42,y-13,x+90,y+15,x+148,y-2);c.stroke();
 }
 c.globalCompositeOperation='source-over';
 const leafColors=['#78836a','#9b8c63','#6c806f','#b28a63','#899a7a'];
 for(let i=0;i<22;i++){
  const speed=17+(i%5)*8,drift=(s.t*speed+i*131)%(W+90);
  const x=drift-45+Math.sin(s.t*.72+i*1.9)*23,y=(i*47+s.t*(10+(i%4)*4))%(H+36)-18;
  const size=2.2+(i%4)*.8,angle=s.t*(.55+(i%3)*.18)+i*1.27;
  c.save();c.translate(x,y);c.rotate(angle);c.fillStyle=leafColors[i%leafColors.length]??'#78836a';
  c.beginPath();c.moveTo(-size*1.8,0);c.quadraticCurveTo(-size*.4,-size*1.5,size*1.9,0);c.quadraticCurveTo(size*.25,size*1.35,-size*1.8,0);c.fill();
  c.strokeStyle='rgba(235,218,170,.22)';c.lineWidth=.65;c.beginPath();c.moveTo(-size*1.2,0);c.lineTo(size*1.3,0);c.stroke();c.restore();
 }
 c.globalCompositeOperation='multiply';
 const vignette=c.createRadialGradient(W*.5,H*.44,155,W*.5,H*.47,660);
 vignette.addColorStop(0,'rgba(4,7,20,0)');vignette.addColorStop(.72,'rgba(4,7,20,.10)');vignette.addColorStop(1,'rgba(3,6,19,.62)');
 c.fillStyle=vignette;c.fillRect(0,0,W,H);c.restore();
}

function military(c:CanvasRenderingContext2D,s:S,im:ChapterImages){
 const a=s.chapter;still(c,im.truck,a.truckX,GROUND,137);
 if(a.stage==='truck')return;
 const q=a.stage==='unload'?Math.min(1,a.time/4.2):1;
 for(let i=0;i<4;i++){
  const delay=i*.12,r=Math.max(0,Math.min(1,(q-delay)/(1-delay))),start=a.truckX+50;
  const x=start+(s.crashX-130-i*43-start)*r,y=GROUND-18*(1-r);
  still(c,i<2?im.arg:im.usa,x,y,86,Math.min(1,r*5));
 }
 const leaderQ=Math.max(0,Math.min(1,(q-.45)/.55));
 still(c,im.trump,a.truckX+50+(s.crashX-350-a.truckX-50)*leaderQ,GROUND,88,leaderQ);
 const walk=['approach','milei','leave'].includes(a.stage)?a.stage==='approach'?Math.min(1,a.time/2.2):1:0;
 const start=a.truckX+85+(s.crashX-310-a.truckX-85)*leaderQ;
 still(c,im.milei,start+(s.p.x-57-start)*walk,GROUND,86,leaderQ);
}

const treeCache=new WeakMap<HTMLImageElement,HTMLCanvasElement>();
function prepareTree(im:HTMLImageElement):HTMLCanvasElement{
 const cached=treeCache.get(im);if(cached)return cached;
 const src=document.createElement('canvas');src.width=im.naturalWidth;src.height=im.naturalHeight;
 const q=src.getContext('2d');if(!q)return src;
 try{
  q.drawImage(im,0,0);const img=q.getImageData(0,0,src.width,src.height),d=img.data,w=src.width,h=src.height;
  const seen=new Uint8Array(w*h),stack=new Int32Array(w*h);let n=0;
  const bg=(i:number)=>{const k=i*4;return (d[k+3]??0)<18||((d[k]??0)>242&&(d[k+1]??0)>242&&(d[k+2]??0)>242);};
  const add=(i:number)=>{if(i>=0&&i<w*h&&!seen[i]&&bg(i)){seen[i]=1;stack[n++]=i;}};
  for(let x=0;x<w;x++){add(x);add((h-1)*w+x);}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1);}
  while(n){const i=stack[--n];if(i===undefined)continue;const x=i%w,y=Math.floor(i/w);d[i*4+3]=0;if(x)add(i-1);if(x<w-1)add(i+1);if(y)add(i-w);if(y<h-1)add(i+w);}
  q.putImageData(img,0,0);let l=w,t=h,rr=0,b=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if((d[(y*w+x)*4+3]??0)>18){l=Math.min(l,x);rr=Math.max(rr,x);t=Math.min(t,y);b=Math.max(b,y);}
  if(rr>=l&&b>=t){const out=document.createElement('canvas');out.width=rr-l+1;out.height=b-t+1;out.getContext('2d')?.drawImage(src,l,t,out.width,out.height,0,0,out.width,out.height);treeCache.set(im,out);return out;}
 }catch(error){console.warn('No se pudo recortar arbol.png',error);}
 treeCache.set(im,src);return src;
}
function drawWindTree(c:CanvasRenderingContext2D,im:HTMLImageElement,x:number,baseY:number,height:number,time:number,phase:number,alpha=1){
 if(!ready(im))return;const tree=prepareTree(im),w=height*tree.width/tree.height;
 const sway=Math.sin(time*1.25+phase)*.034+Math.sin(time*2.1+phase*.7)*.009;
 c.save();c.translate(x,baseY);c.rotate(sway);c.globalAlpha=alpha;c.imageSmoothingEnabled=false;c.drawImage(tree,-w/2,-height,w,height);c.restore();
}

function drawStreetSurface(c:CanvasRenderingContext2D,p:Palette){
 const g=c.createLinearGradient(0,GROUND,0,H);g.addColorStop(0,'#373b43');g.addColorStop(.22,'#30343c');g.addColorStop(1,'#242a32');
 c.fillStyle=g;c.fillRect(-1200,GROUND,WORLD+1200,H-GROUND);
 box(c,'#8b9294',-1200,GROUND,WORLD+1200,7);box(c,'#c1c3ba',-1200,GROUND,WORLD+1200,1);box(c,'#555e65',-1200,GROUND+6,WORLD+1200,2);
 for(let x=-1200;x<WORLD+1200;x+=46){const seed=Math.sin(x*12.9898)*43758.5453,rand=seed-Math.floor(seed),y=GROUND+15+rand*72;c.globalAlpha=.10+rand*.07;oval(c,rand>.5?'#a5aab0':'#101820',x+rand*38,y,5+rand*10,1.2+rand*1.8);c.globalAlpha=1;for(let j=0;j<3;j++){const px=x+((seed+j*19)%38+38)%38,py=GROUND+12+((seed+j*31)%70+70)%70;box(c,j%2?'#747b82':'#171e27',px,py,1.5,1);}}
 for(let x=-1050;x<WORLD+1000;x+=310){const seed=Math.sin(x*7.31)*10000,offset=Math.abs(seed)%50;c.strokeStyle='rgba(12,17,24,.42)';c.lineWidth=1.2;c.beginPath();c.moveTo(x+offset,GROUND+25);c.lineTo(x+offset+4,GROUND+31);c.lineTo(x+offset-2,GROUND+38);c.lineTo(x+offset+5,GROUND+44);c.stroke();c.strokeStyle='rgba(150,157,164,.13)';c.lineWidth=1;c.beginPath();c.moveTo(x+55,GROUND+18);c.lineTo(x+170,GROUND+18);c.stroke();}
 for(let x=-1200;x<WORLD+1200;x+=100){c.globalAlpha=.22;box(c,'#111820',x,GROUND+51,46,4);c.globalAlpha=.85;box(c,'#d4c9a8',x+2,GROUND+51,42,2);c.globalAlpha=1;}
}

function roomBackground(c:CanvasRenderingContext2D,im:HTMLImageElement,alpha=1){
 if(!ready(im))return;const scale=Math.min(W/im.naturalWidth,H/im.naturalHeight),w=im.naturalWidth*scale,h=im.naturalHeight*scale;
 c.save();c.globalAlpha=alpha;c.drawImage(im,(W-w)/2,(H-h)/2,w,h);c.restore();
}
function roomActor(c:CanvasRenderingContext2D,s:S,im:ChapterImages){
 const a=s.chapter,art=a.roomDirection==='up'?im.up:a.roomDirection==='down'?im.down:im.walk;
 c.save();c.translate(a.roomX,a.roomY);if(a.roomDirection==='left')c.scale(-1,1);
 pose(c,art,a.moving?Math.floor(a.roomWalk)%4:0,4,0,0,143);c.restore();
}
function bedPose(c:CanvasRenderingContext2D,im:HTMLImageElement,alpha=1){
 if(!ready(im))return;
 // The original lying silhouette follows the mattress's down-right diagonal.
 const width=143,height=width*im.naturalHeight/im.naturalWidth;
 c.save();c.globalAlpha=alpha;c.translate(519,228);c.rotate(.36);c.drawImage(im,-width/2,-height/2,width,height);c.restore();
}
function bedroom(c:CanvasRenderingContext2D,s:S,im:GameImages,p:Palette){
 const a=s.chapter,art=im.chapter;box(c,p.ink,0,0,W,H);
 if(!a.night)roomBackground(c,art.bedroom);
 else if(a.stage==='quiet'){roomBackground(c,art.bedroom);roomBackground(c,art.dark,Math.min(1,a.time/2));}
 else roomBackground(c,art.dark);
 const sleeping=['quiet','light','wakeChoice','settle'].includes(a.stage);
 if(sleeping)bedPose(c,art.sleeping);
 else if(a.stage==='toBed'){
  const q=Math.min(1,a.time/1.6);c.save();c.globalAlpha=1-q;roomActor(c,s,art);c.restore();bedPose(c,art.sleeping,q);
 }else if(a.stage==='waking'){
  const q=Math.min(1,a.time/2);bedPose(c,art.sleeping,1-q);
  still(c,art.waking,510,283,100,q);
 }else roomActor(c,s,art);
 if(!a.catGone){
  if(a.fed&&['meal','sleepChoice','toBed'].includes(a.stage))still(c,art.eating,775,452,37);
  else pose(c,art.restingCat,Math.floor(s.t*1.4)%3,3,829,433,34);
 }
 if(a.stage==='light'){
  const intensity=Math.sin(Math.PI*Math.min(1,a.time/8))*.72;
  c.save();c.globalCompositeOperation='screen';c.globalAlpha=intensity;
  const glow=c.createRadialGradient(715-a.time*15,220,20,680,260,600);glow.addColorStop(0,p.turquoise);glow.addColorStop(1,'transparent');c.fillStyle=glow;c.fillRect(0,0,W,H);c.restore();
 }
 if(a.stage==='sleepChoice'&&a.time<4)bubble(c,'Ha sido un largo día',a.roomX,a.roomY-120,p,500);
 if(a.stage==='missing')bubble(c,'¿DÓNDE ESTÁ EL GATO?',520,155,p,600);
 if(a.stage==='roomFade'){c.globalAlpha=Math.max(0,1-(a.time-1.2)/1.2);box(c,p.ink,0,0,W,H);c.globalAlpha=1;}
 if(a.stage==='exit'){c.globalAlpha=Math.max(0,(a.time-.8)/1.2);box(c,p.ink,0,0,W,H);c.globalAlpha=1;}
}
function forest(c:CanvasRenderingContext2D,s:S,im:GameImages,p:Palette){
 const a=s.chapter,art=im.chapter;box(c,p.ink,0,0,W,H);
 if(ready(art.forest)){
  // Two mirrored, proportion-preserving copies meet at identical edge pixels.
  const h=Math.max(H,W*art.forest.naturalHeight/art.forest.naturalWidth),w=h*art.forest.naturalWidth/art.forest.naturalHeight,offset=a.forestX%w,tile=Math.floor(a.forestX/w);
  for(let i=0;i<2;i++){
   const x=i*w-offset;c.save();c.translate(x,0);
   if((tile+i)%2){c.translate(w,0);c.scale(-1,1);}
   c.drawImage(art.forest,0,H-h,w,h);c.restore();
  }
 }
 const later=['ship','beam','lift','vanished','complete'].includes(a.stage);
 const deerX=330+FOREST.deer+160-a.forestX;
 if(deerX>-200&&deerX<W+200)still(c,art.deer,deerX,GROUND+3,94);
 const beam=['beam','lift','vanished','complete'].includes(a.stage);
 if(beam){
  const q=a.stage==='beam'?Math.min(1,a.time/3):1;c.save();c.globalCompositeOperation='screen';c.globalAlpha=q*.6;
  const glow=c.createLinearGradient(0,155,0,GROUND);glow.addColorStop(0,p.turquoise);glow.addColorStop(1,'transparent');c.fillStyle=glow;
  c.beginPath();c.moveTo(407,155);c.lineTo(469,155);c.lineTo(570,GROUND+25);c.lineTo(225,GROUND+25);c.closePath();c.fill();oval(c,p.turquoise,397,GROUND,177,14);
  for(let i=0;i<14;i++){const y=GROUND-((s.t*35+i*23)%285);oval(c,p.light,330+Math.sin(i*2+s.t)*70,y,2,2);}c.restore();
 }
 if(!['vanished','complete'].includes(a.stage)){
  const running=['forestRun','burned','forestFade'].includes(a.stage),x=a.stage==='lift'?330+110*Math.min(1,a.time/6):330;
  if(running)pose(c,art.run,Math.floor(s.t*10)%4,4,x,a.forestY,100);
  else still(c,im.player,x,a.forestY,100);
 }
 // Plano general: OVNI completo y protagonista que desaparece detrás del casco.
 if(later){
  const reveal=a.stage==='ship'?Math.min(1,a.time/1.15):1;
  const width=730,height=width*art.ship.naturalHeight/art.ship.naturalWidth;
  c.save();c.globalAlpha=reveal;c.drawImage(art.ship,(W-width)/2,155-height,width,height);c.restore();
 }
 if(a.stage==='deer')bubble(c,'¿Qué carajo está pasando?',330,GROUND-120,p,520);
 if(a.stage==='forestFade'){c.globalAlpha=1-Math.min(1,a.time/1.4);box(c,p.ink,0,0,W,H);c.globalAlpha=1;}
}
function drawReactorEffects(c:CanvasRenderingContext2D,p:Palette,hp:number,time:number,overload:boolean,hit:number){
 const x=SHIP.reactorX,y=SHIP.reactorY,damage=1-Math.max(0,hp)/100;
 if(damage<=0&&!overload)return;
 c.save();c.globalCompositeOperation='screen';
 const glow=c.createRadialGradient(x,y,2,x,y,32+damage*28+(overload?time*18:0));
 glow.addColorStop(0,'rgba(255,245,190,.95)');glow.addColorStop(.28,'rgba(255,126,35,.72)');glow.addColorStop(1,'rgba(255,55,18,0)');
 c.fillStyle=glow;c.fillRect(x-100,y-130,200,190);
 const flameCount=overload?12:Math.ceil(3+damage*7);
 for(let i=0;i<flameCount;i++){
  const phase=time*(5+i%4)+i*2.13,spread=(i-(flameCount-1)/2)*5;
  const height=(13+damage*34+(overload?time*13:0))*(.65+.35*Math.sin(phase));
  c.beginPath();c.moveTo(x+spread-5,y+10);c.quadraticCurveTo(x+spread-12+Math.sin(phase)*8,y-height*.55,x+spread+Math.sin(phase*1.3)*5,y-height);c.quadraticCurveTo(x+spread+13+Math.cos(phase)*7,y-height*.48,x+spread+6,y+10);c.closePath();
  const fire=c.createLinearGradient(0,y-height,0,y+10);fire.addColorStop(0,'rgba(255,244,170,.95)');fire.addColorStop(.42,'rgba(255,130,28,.92)');fire.addColorStop(1,'rgba(190,35,15,.2)');c.fillStyle=fire;c.fill();
 }
 for(let i=0;i<(overload?18:Math.ceil(4+damage*8));i++){
  const phase=time*(.65+i*.035)+i*2.4,life=(time*24+i*19)%96,drift=Math.sin(phase)*12;
  const radius=4+life*.13+(overload?time*1.2:0);
  c.globalAlpha=(overload?.3:.12+damage*.19)*Math.max(.12,1-life/125);
  oval(c,'#59616b',x+drift+(i%3-1)*7,y-14-life,radius,radius*1.22);
 }
 c.globalAlpha=1;
 if(hit>0&&!overload){c.globalAlpha=hit/.7*.5;oval(c,'#fff0bd',x,y,25,21);c.globalAlpha=1;}
 if(overload){
  const q=Math.max(0,Math.min(1,(time-2.05)/1.35));
  if(q>0){
   const radius=12+q*155;
   const burst=c.createRadialGradient(x,y,2,x,y,radius);
   burst.addColorStop(0,'rgba(255,255,225,.98)');burst.addColorStop(.18,'rgba(255,214,105,.96)');burst.addColorStop(.48,'rgba(255,91,25,.76)');burst.addColorStop(1,'rgba(255,35,10,0)');
   c.globalAlpha=1-q*.22;c.fillStyle=burst;c.beginPath();c.arc(x,y,radius,0,Math.PI*2);c.fill();
   c.strokeStyle='rgba(255,208,120,.8)';c.lineWidth=3+q*5;c.beginPath();c.arc(x,y,18+q*125,0,Math.PI*2);c.stroke();
   for(let i=0;i<28;i++){const angle=i*2.399,dist=18+q*(55+(i%5)*17),sx=x+Math.cos(angle)*dist,sy=y+Math.sin(angle)*dist;c.strokeStyle=i%3?'rgba(255,164,65,.9)':'rgba(255,245,190,.95)';c.lineWidth=1+(i%3);c.beginPath();c.moveTo(sx,sy);c.lineTo(sx+Math.cos(angle)*(9+q*16),sy+Math.sin(angle)*(9+q*16));c.stroke();}
  }
 }
 c.restore();
}

function shipScene(c:CanvasRenderingContext2D,s:S,im:GameImages,p:Palette){
 const a=s.ship,art=im.ship;
 const cross=['impact','crossRise','crossFree','contemplate','end'].includes(a.stage);
 const lab=['awakening','verdict','catEntry','eyeCharge','rescue','rise','labFree','door'].includes(a.stage);
 c.save();box(c,p.ink,0,0,W,H);
 if(a.shake>0)c.translate(Math.sin(s.t*61)*a.shake*8,Math.cos(s.t*49)*a.shake*5);
 const background=cross?art.cross:lab?art.laboratory:art.main;
 const scale=Math.max(W/background.naturalWidth,H/background.naturalHeight),bw=background.naturalWidth*scale,bh=background.naturalHeight*scale;
 c.drawImage(background,(W-bw)/2,(H-bh)/2,bw,bh);
 const actor=(x:number,y:number,h=112)=>{
  c.save();c.translate(x,y);c.scale(a.face,1);
  if(a.roll>0)pose(c,art.roll,Math.min(5,Math.floor((1-a.roll/SHIP.rollTime)*6)),6,0,0,h);
  else if(a.push!=='none')pose(c,art.push,a.push==='lean'?0:a.push==='flight'?1:2,3,0,0,h);
  else if(a.stage==='pickup'||a.armed)pose(c,art.pickup,a.stage==='pickup'?Math.min(3,Math.floor(a.time/2.4*4)):3,4,0,0,h);
  else pose(c,im.chapter.walk,Math.floor(a.walk)%4,4,0,0,h);
  if(!a.armed&&a.stage==='combat'){drawTrimmed(c,im.gun,12,-64,27,10);if(a.flash>0)oval(c,p.gold,40,-60,9,5);}
  c.restore();
 };
 const line=(col:string,x:number,y:number,tx:number,ty:number,width:number)=>{c.strokeStyle=col;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(tx,ty);c.stroke();};
 if(cross){
  if(a.stage==='contemplate'||a.stage==='end')pose(c,art.contemplate,0,2,305,334,118);
  else if(a.stage==='crossRise')pose(c,art.push,2,3,s.chapter.roomX,s.chapter.roomY,118);
  else roomActor(c,s,im.chapter);
  catSprite(c,im.cat,a.catX,a.catY,0,-1);
  if(a.stage==='impact'){c.globalAlpha=Math.max(0,1-a.time/1.8);box(c,p.light,0,0,W,H);c.globalAlpha=1;}
 }else if(lab){
  const dead=['rescue','rise','labFree','door'].includes(a.stage);
  for(const x of [610,735])pose(c,art.grey,dead?Math.min(8,3+Math.floor(a.labDead*5)):0,9,x,SHIP.floor,115);
  if(['awakening','verdict','catEntry','eyeCharge','rescue'].includes(a.stage)){
   const sleeping=im.chapter.sleeping,w=118,h=w*sleeping.naturalHeight/sleeping.naturalWidth;c.drawImage(sleeping,480-w/2,364-h,w,h);
  }else if(a.stage==='rise')still(c,im.chapter.waking,480,380,112);
  else actor(a.x,a.y);
  if(['catEntry','eyeCharge','rescue','rise','labFree','door'].includes(a.stage))still(c,art.cat,a.catX,SHIP.floor,78);
  if(a.stage==='eyeCharge'||(a.stage==='rescue'&&a.time<1.6)){
   oval(c,p.turquoise,a.catX-3,SHIP.floor-64,5,4);
   if(a.stage==='rescue')for(const x of [610,735])line(p.turquoise,a.catX,SHIP.floor-64,x,SHIP.floor-85,5);
  }
  if(a.stage==='verdict')bubble(c,'Los gatos son la especie más peligrosa del universo. Deben ser erradicados',675,240,p,700);
  if(a.stage==='door'){c.globalAlpha=Math.min(1,a.time/1.2);box(c,p.ink,0,0,W,H);c.globalAlpha=1;}
 }else{
  if(!a.boxBroken){line(p.metal,SHIP.boxX,70,SHIP.boxX,SHIP.boxY-25,3);box(c,p.panel,SHIP.boxX-27,SHIP.boxY-22,54,44);c.strokeStyle=p.metal;c.lineWidth=2;c.strokeRect(SHIP.boxX-27,SHIP.boxY-22,54,44);still(c,art.weapon,SHIP.boxX,SHIP.boxY+8,25);}
  else if(!a.armed&&a.stage!=='pickup')still(c,art.weapon,SHIP.boxX,a.weaponY,28);
  for(const e of a.enemies){const f=e.hp<=0?Math.min(8,3+Math.floor(e.deadTime*5)):e.hurt>0?1:e.windup>0?2:0;c.save();c.translate(e.x,e.y);c.scale(e.face,1);pose(c,art.grey,f,9,0,0,115);c.restore();if(e.windup>0)oval(c,p.energy,e.x,e.y-84,8,8);}
  actor(a.x,a.y);still(c,art.cat,a.catX,SHIP.floor,70);
  for(const b of a.shots)line(p.ice,b.x,b.y,b.x-b.vx*.025,b.y-b.vy*.025,3);
  for(const b of a.bolts)line(p.laser,b.x,b.y,b.x-b.vx*.04,b.y-b.vy*.04,4);
  if(a.beam>0){const dx=a.beamTx-a.beamX,dy=a.beamTy-a.beamY,L=Math.hypot(dx,dy)||1;line(p.energy,a.beamX,a.beamY,a.beamX+dx/L*1300,a.beamY+dy/L*1300,36);line(p.light,a.beamX,a.beamY,a.beamX+dx/L*1300,a.beamY+dy/L*1300,9);}
  if(a.charge>0)oval(c,p.energy,a.x+a.face*45,a.y-65,5+a.charge*9,5+a.charge*9);
  if(a.aimActive&&a.stage==='combat'){const x=a.aimX,y=a.aimY;line(p.light,x-12,y,x+12,y,2);line(p.light,x,y-12,x,y+12,2);}
  if(a.stage==='combat'&&a.reactorHp<100){drawReactorEffects(c,p,a.reactorHp,s.t,false,a.reactorHit);}
  if(a.stage==='overload'){drawReactorEffects(c,p,0,s.t,true,a.reactorHit);}
  if(a.stage==='emergency'){
   // Reuse the visible Earth window, enlarging its actual pixels as the ship falls.
   const q=Math.min(1,a.time/9);c.save();c.beginPath();c.rect(25,310,410,92);c.clip();c.drawImage(art.main,30,445,580,135,25-q*180,310-q*40,410+q*360,92+q*80);c.restore();
   c.globalAlpha=.12+.14*(1+Math.sin(a.time*9));box(c,p.red,0,0,W,H);c.globalAlpha=1;bubble(c,'¡Nos vamos a estrellar! D:',a.x,240,p,550);
  }
  if(a.stage==='combat'){box(c,p.panel,14,14,240,43);box(c,p.ink,85,30,155,10);box(c,a.hp>30?p.ice:p.red,85,30,a.hp*1.55,10);c.font='13px monospace';c.fillStyle=p.light;c.fillText('SALUD',24,40);
   box(c,p.panel,706,14,240,43);box(c,p.ink,780,30,155,10);box(c,a.reactorHp>30?'#ff9b45':p.red,780,30,a.reactorHp*1.55,10);c.fillStyle=p.light;c.fillText('NÚCLEO',716,40);
  }
 }
 c.restore();
}
export function draw(c:CanvasRenderingContext2D,s:S,im:GameImages|null,p:Palette) {
 if(im&&s.phase==='spaceship'){shipScene(c,s,im,p);return;}
 if(im&&s.phase==='bedroom'&&s.chapter.stage==='roomFade'&&s.chapter.time<1.2){
  draw(c,{...s,phase:'aftermath',chapter:{...s.chapter,stage:'leave'}},im,p);
  c.globalAlpha=Math.min(1,s.chapter.time/1.2);box(c,p.ink,0,0,W,H);c.globalAlpha=1;return;
 }
 if(im&&s.phase==='bedroom'&&['forestFade','forestRun','deer','burned','ship','beam','lift','vanished','complete'].includes(s.chapter.stage)){forest(c,s,im,p);return;}
 if(im&&s.phase==='bedroom'){bedroom(c,s,im,p);return;}
 c.clearRect(0,0,W,H);const isAwka=s.phase==='awka';const sky=c.createLinearGradient(0,0,0,GROUND);
 if(isAwka){sky.addColorStop(0,'#070b1c');sky.addColorStop(.48,'#15182d');sky.addColorStop(1,'#302438');}
 else{sky.addColorStop(0,p.sky);sky.addColorStop(.55,p.rose);sky.addColorStop(1,p.gold);}
 c.fillStyle=sky;c.fillRect(0,0,W,H);
 // Single proportion-preserving panorama; no repeating mountain or text artifacts.
 const mountain=im&&(s.phase==='awka'?im.intro.mountain:im.mountain);
 if(mountain && ready(mountain)){const ratio=mountain.naturalWidth/mountain.naturalHeight,h=Math.max(GROUND,(W+WORLD*.03)/ratio),w=h*ratio; c.drawImage(mountain,(W-w)/2-s.cam*.015,GROUND-h,w,h);if(isAwka){c.globalCompositeOperation='multiply';box(c,'rgba(11,17,43,.48)',0,0,W,GROUND);c.globalCompositeOperation='source-over';}else{c.globalCompositeOperation='soft-light';box(c,p.sunset,0,0,W,GROUND);c.globalCompositeOperation='source-over';}}
  c.globalAlpha=.15;for(let i=0;i<5;i++){const x=(i*243+s.t*2)%1200-100;oval(c,p.light,x,50+i*13,90,9);}c.globalAlpha=1;
 
 // Bosque lejano con la nueva textura y movimiento de viento.
 c.save();c.translate(-s.cam*.35,0);for(let x=-200;x<WORLD;x+=112){if(im?.tree&&ready(im.tree))drawWindTree(c,im.tree,x,GROUND-20,92+Math.abs(Math.sin(x*.013))*20,s.t,x*.017,.58);else{box(c,p.trunk,x,360,5,90);c.fillStyle=p.forest;c.beginPath();c.moveTo(x-27,415);c.lineTo(x+3,320+(x%3)*12);c.lineTo(x+33,415);c.fill();}}c.restore();
 c.save();c.translate(-s.cam,0);
 for(let x=40;x<WORLD-500;x+=300){const special=x===340, width=special?205:145;
    oval(c,p.shadow,x+width/2,GROUND+6,width*.65,9);if(im)drawTrimmed(c,im.house,x-10,GROUND-137,width+20,137);
  for(let j=0;j<3;j++)box(c,p.trunk,x+width+18+j*15,GROUND-22,3,23);box(c,p.trunk,x+width+14,GROUND-15,52,3);
  const tx=x+width+72;if(im?.tree&&ready(im.tree))drawWindTree(c,im.tree,tx,GROUND+2,126,s.t,x*.021,.98);else{box(c,p.trunk,tx,GROUND-85,9,85);const wind=Math.sin(s.t*1.5+x)*3;for(let j=0;j<3;j++){c.fillStyle=p.leaf;c.beginPath();c.moveTo(tx-25+j*4,GROUND-50-j*24);c.lineTo(tx+4+wind,GROUND-115-j*18);c.lineTo(tx+35-j*4,GROUND-50-j*24);c.fill();}}
 }
 drawStreetSurface(c,p);
 if(im && s.cam < 0){
  const art=im.intro, width=1050, height=width*art.building.naturalHeight/art.building.naturalWidth;
  if(ready(art.building))c.drawImage(art.building,-1050,GROUND-height+6,width,height);
  breeze(c,s,p);
  person(c,im.allies[0],s.intro.npcX,GROUND,s.intro.stage==='approach'?s.t*5:0,0);
  person(c,im.allies[1],-950,GROUND,0,1);
  if(['offer','smoking','warning'].includes(s.intro.stage))box(c,p.laser,s.intro.npcX-18,GROUND-44,11,3);
 }
 if(s.cam>=0)breeze(c,s,p);
 if(s.phase==='awka'){c.save();c.translate(s.cam,0);awkaNightAtmosphere(c,s);c.restore();}
 if(s.phase==='awka' && im){
  const a=s.intro, art=im.intro;
  if(a.stage==='depart'){
   sprite(c,im.player,s.p.x,GROUND,86,1,s.p.walk);
   catSprite(c,im.cat,s.cat.x,GROUND,s.cat.walk,1);
  }else{
   const smoking=a.stage==='smoking';
   const poseImage=a.stage==='drinking'?art.drink:smoking?(Math.floor(a.time/1.2)%2?art.smokeOut:art.smokeIn):a.stage==='rising'?art.rise:['leave'].includes(a.stage)?im.player:['warning','approach','offer'].includes(a.stage)?art.seated:art.beer;
   const height=a.stage==='leave'?86:a.stage==='rising'?74+Math.min(1,a.time/1.2)*12:poseImage===art.smokeOut?78:74;
   if(ready(poseImage)){const width=height*poseImage.naturalWidth/poseImage.naturalHeight;c.drawImage(poseImage,s.p.x-width*.45,GROUND-height,width,height);}
   if(ready(art.cat)){const height=33,width=height*art.cat.naturalWidth/art.cat.naturalHeight;c.drawImage(art.cat,s.cat.x-width/2,GROUND-height,width,height);}
  }
  c.restore();
  if(a.stage==='offer')bubble(c,'Eh, loco, ¿querés fumar?',s.intro.npcX-s.cam,GROUND-105,p,420);
  if(a.stage==='warning')bubble(c,'Cuidado que está fuerte, compa',s.intro.npcX-s.cam,GROUND-105,p,470);
  if(a.stage==='opening'){c.globalAlpha=1-Math.min(1,a.time/1.6);box(c,p.ink,0,0,W,H);c.globalAlpha=1;}
  return;
 }
 // Outskirts crash hill, with a readable flat arrival area.
  c.fillStyle='#465b50';c.beginPath();c.moveTo(2740,GROUND);c.quadraticCurveTo(2845,GROUND-82,2960,GROUND-98);c.quadraticCurveTo(3060,GROUND-116,3140,GROUND-34);c.lineTo(WORLD,GROUND+25);c.lineTo(2740,GROUND+25);c.fill();
 c.fillStyle=p.hill;c.beginPath();c.moveTo(2765,GROUND);c.quadraticCurveTo(2900,GROUND-145,3080,GROUND);c.lineTo(WORLD,GROUND+25);c.lineTo(2765,GROUND+25);c.fill();
 for(let i=0;i<18;i++){const x=2780+i*24,y=GROUND-18-Math.sin(i*.42)*35;box(c,i%3===0?'#8b8568':'#526c53',x,y,3+(i%3),12+(i%4)*3);}
 for(const [x,y,r] of [[2804,GROUND-12,8],[2872,GROUND-34,6],[3002,GROUND-18,10],[3105,GROUND-25,7]] as const){oval(c,'#8d8170',x,y,r,r*.62);oval(c,'#c0a888',x-r*.25,y-r*.25,r*.32,r*.16);}
 c.globalAlpha=.35;for(let i=0;i<10;i++){const x=2800+i*31,y=GROUND-24-Math.sin(i*.6)*32;box(c,p.gold,x,y,2,7);}c.globalAlpha=1;
 for(let i=0;i<25;i++){const x=(i*139+s.t*12)%WORLD;c.globalAlpha=.35;oval(c,p.gold,x,400+Math.sin(i+s.t)*25,2,1);}c.globalAlpha=1;
 drawCatAbductionLighting(c,s,p);
 for(const [i,a] of s.allies.entries()) { if(a.hurt>0 && Math.floor(a.hurt*15)%2)continue;if(im?.allies[i])person(c,im.allies[i]??im.allies[0],a.x,a.y,s.recruited?a.walk:s.t,i,a.dead||a.hp<=0);if(s.recruited && s.phase==='fight'){box(c,p.panel,a.x-18,a.y-83,36,4);box(c,p.ice,a.x-18,a.y-83,36*a.hp/100,4);}}
  const hugging=!s.cat.gone && ((s.phase==='reunion'&&Math.abs(s.cat.x-s.p.x)<45)||['alien','speech','attack','fade','aftermath'].includes(s.phase));
  if(im && !s.cat.gone && !hugging)catSprite(c,im.cat,s.cat.x,s.cat.y,s.cat.walk,s.cat.x>s.p.x?-1:1);
  const player=s.p;
  if(im && hugging){
   const stand=s.phase==='reunion'?Math.max(0,Math.min(1,(s.pt-4.6)/.8)):1;
   pose(c,im.reunion,0,2,player.x,player.y,96,1-stand);
   pose(c,im.reunion,1,2,player.x,player.y,96,stand);
  }else if(im && player.roll>0){c.save();c.translate(player.x,player.y);c.scale(player.rollFace,1);pose(c,im.ship.roll,Math.min(5,Math.floor((1-player.roll/SHIP.rollTime)*6)),6,0,0,86);c.restore();}
  else if(im && !(player.hurt>0&&Math.floor(player.hurt*20)%2))sprite(c,im.player,player.x,player.y,86,player.face,player.walk,player.crouch);
  if(im && player.roll===0 && player.armed>0 && !['reunion','alien','speech','attack','fade','jets','aftermath'].includes(s.phase)) {c.save();c.translate(player.x+player.face*18-4,player.y-(player.crouch?35:48));c.scale(player.face,1);drawTrimmed(c,im.gun,0,0,17,6);c.restore();if(player.flash>0)oval(c,p.gold,player.x+player.face*34,player.y-46,8,5);}
  if(s.phase==='aftermath'&&im){ufo(c,{...s,phase:'arrive'},p);military(c,s,im.chapter);}
  if(s.u.vis && !['boom','over'].includes(s.phase))ufo(c,s,p);
 if(s.phase==='jets'&&s.ufoHits>0){c.save();for(let i=0;i<7;i++){const pulse=(s.t*2+i*.8)%3;c.globalAlpha=.45+(pulse/3)*.35;oval(c,p.smoke,s.u.x+Math.sin(i*2+s.t)*28,s.u.y-18-pulse*22,10+pulse*5,13+pulse*7);oval(c,i%2?p.gold:p.red,s.u.x+Math.sin(i*3+s.t*3)*24,s.u.y+Math.cos(i*4)*8,7+pulse*3,11+pulse*4);}c.restore();}
 if(['boom','over'].includes(s.phase)){box(c,p.metal,s.u.x-40,GROUND-12,35,12);box(c,p.ink,s.u.x+10,GROUND-9,25,9);}
   if(im && ['alien','speech','attack','fade','jets'].includes(s.phase))alien(c,s,im.alienFrames);
  if(s.phase==='jets'&&im){
  c.save();c.translate(-s.cam,0);
  for(const [index,jet] of s.jets.entries()){
   const w=150,h=w*im.fighter.naturalHeight/im.fighter.naturalWidth;
   c.globalAlpha=1;drawTrimmed(c,im.fighter,jet.x-w/2,jet.y-h/2,w,h);
   c.globalAlpha=.72;c.strokeStyle='#d9e9ef';c.lineWidth=5;c.beginPath();c.moveTo(jet.x-65,jet.y);c.lineTo(jet.x-210,jet.y+8);c.stroke();c.globalAlpha=1;
  }
  for(const shot of s.jetShots){c.strokeStyle='#ffe27a';c.lineWidth=5;c.beginPath();c.moveTo(shot.x,shot.y);c.lineTo(shot.x-shot.vx*.025,shot.y-shot.vy*.025);c.stroke();oval(c,'#fff1a8',shot.x,shot.y,4,4);}
  c.restore();
 }
 for(const b of s.shots) {if(b.kind==='stone'){oval(c,p.stone,b.x,b.y,5,4);box(c,p.light,b.x-2,b.y-2,2,1);}else {c.strokeStyle=p.ice;c.lineWidth=3;c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x-b.vx*.012,b.y-b.vy*.012);c.stroke();}}
 c.strokeStyle=p.laser;c.lineWidth=4;for(const b of s.lasers){c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x-b.vx*.045,b.y-b.vy*.045);c.stroke();}
 for(const f of s.fx){c.globalAlpha=Math.min(1,f.life);oval(c,p[f.c as keyof Palette]??p.gold,f.x,f.y,4+Math.max(0,1-f.life)*12,4+Math.max(0,1-f.life)*12);}c.globalAlpha=1;c.restore();
 c.font='13px "IBM Plex Mono", monospace';c.textBaseline='top';c.fillStyle=p.light;
 if(!['crash','arrive','reunion','alien','speech','attack','fade','aftermath'].includes(s.phase)){
 box(c,p.panel,14,14,240,55);c.fillStyle=p.light;c.fillText('SALUD',24,24);box(c,p.ink,85,26,155,10);box(c,player.hp>30?p.ice:p.red,85,26,1.55*player.hp,10);
 if(s.phase==='fight'||s.phase==='help'){box(c,p.panel,310,14,330,39);c.fillStyle=p.light;c.fillText('OVNI',321,25);box(c,p.ink,367,26,257,10);box(c,p.laser,367,26,2.57*s.u.hp,10);}
 }
 if(canAskHelp(s))bubble(c,'PEDIR AYUDA A LOS PIBES',460-s.cam,GROUND-95,p,320);
 if(s.phase==='help')bubble(c,'EH LOCO, DEVOLVELE EL GATO AL PIBE',s.allies[0].x-s.cam,GROUND-100,p,470);
 if(s.phase==='speech')bubble(c,ALIEN_MESSAGE.slice(0,Math.floor(s.pt*22)),s.alien.x-s.cam,GROUND-112,p,630);
 if(s.phase==='attack' && s.pt<1.6)bubble(c,'¡PARÁ…!',s.allies[0].x-s.cam,GROUND-95,p,180);
 if(s.msgT>0 && !['help','crash','arrive','reunion','alien','speech','attack','fade','aftermath'].includes(s.phase))bubble(c,s.msg,W/2,155,p,850);
 if(s.phase==='aftermath'){
  if(s.chapter.stage==='trump')bubble(c,'TRUMP: Limpien todo el lugar, y llévense la nave',s.crashX-350-s.cam,GROUND-112,p,580);
  if(s.chapter.stage==='milei')bubble(c,'MILEI: Largate si no querés tener problemas',s.p.x-57-s.cam,GROUND-112,p,540);
 }
  
 if(s.phase==='fade'){c.globalAlpha=Math.min(1,s.pt/3.5);box(c,p.ink,0,0,W,H);c.globalAlpha=1;}
}
