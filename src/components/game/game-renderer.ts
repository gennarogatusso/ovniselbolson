import { ALIEN_MESSAGE, GROUND, H, W, WORLD, canAskHelp, type S } from './game-engine';
export type IntroImages = { building: HTMLImageElement; mountain: HTMLImageElement; seated: HTMLImageElement; beer: HTMLImageElement; drink: HTMLImageElement; smokeIn: HTMLImageElement; smokeOut: HTMLImageElement; rise: HTMLImageElement; cat: HTMLImageElement };
export type GameImages = { intro: IntroImages; mountain: HTMLImageElement; player: HTMLImageElement; cat: HTMLImageElement; alien: HTMLImageElement; fighter: HTMLImageElement; gun: HTMLImageElement; allies: [HTMLImageElement, HTMLImageElement]; house: HTMLImageElement; alienFrames: [HTMLImageElement, HTMLImageElement, HTMLImageElement, HTMLImageElement]; reunion: HTMLImageElement };
const trims=new WeakMap<HTMLImageElement,[number,number,number,number]>();
function drawTrimmed(c:CanvasRenderingContext2D,im:HTMLImageElement,x:number,y:number,w:number,h:number){if(!ready(im))return;let b=trims.get(im);if(!b){const t=document.createElement('canvas');t.width=im.naturalWidth;t.height=im.naturalHeight;const q=t.getContext('2d');if(!q)return;q.drawImage(im,0,0);const d=q.getImageData(0,0,t.width,t.height).data;let l=t.width,r=0,top=t.height,bot=0;for(let yy=0;yy<t.height;yy++)for(let xx=0;xx<t.width;xx++){const i=(yy*t.width+xx)*4;if((d[i+3]??0)>16&&((d[i]??255)<245||(d[i+1]??255)<245||(d[i+2]??255)<245)){l=Math.min(l,xx);r=Math.max(r,xx);top=Math.min(top,yy);bot=Math.max(bot,yy);}}b=l<=r&&top<=bot?[l,top,r-l+1,bot-top+1]:[0,0,t.width,t.height];trims.set(im,b);}c.drawImage(im,b[0],b[1],b[2],b[3],x,y,w,h);}
export type Palette = Record<'sky'|'rose'|'gold'|'sunset'|'light'|'ice'|'panel'|'ink'|'forest'|'trunk'|'wall'|'roof'|'leaf'|'road'|'curb'|'lane'|'shadow'|'hill'|'metal'|'glass'|'laser'|'smoke'|'stone'|'skin'|'red'|'alien',string>;
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
 const {u}=s; c.save();c.translate(u.x,u.y);if(s.phase==='crash')c.rotate(Math.sin(s.pt*13)*.25+s.pt*.08);
 if(['arrive','reunion','alien','speech','attack','fade'].includes(s.phase)) c.rotate(.25);
 c.shadowColor=p.ice;c.shadowBlur=s.phase==='fight'?12:4;
 oval(c,u.hit>0?p.light:p.metal,0,0,63,16);oval(c,p.ink,0,9,49,8);oval(c,p.ice,0,-12,27,19);oval(c,p.glass,-7,-17,15,10);
 c.shadowBlur=0;for(let i=0;i<7;i++)oval(c,(i+Math.floor(s.t*8))%2?p.laser:p.gold,-48+i*16,2,3,3);
 if(['reunion','alien','speech','attack','fade'].includes(s.phase)){box(c,p.ink,-27,5,25,18);box(c,p.metal,-31,20,33,4);}
 c.restore();
 if(['crash','arrive','reunion','alien','speech','attack','fade'].includes(s.phase)) {
  for(let i=0;i<12;i++){const q=(s.t*.25+i/12)%1;c.globalAlpha=(1-q)*.5;oval(c,p.smoke,u.x+Math.sin(i*2)*22+q*40,u.y-q*145,9+q*24,10+q*20);}c.globalAlpha=1;
 }
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
export function draw(c:CanvasRenderingContext2D,s:S,im:GameImages|null,p:Palette) {
 c.clearRect(0,0,W,H);const sky=c.createLinearGradient(0,0,0,GROUND);sky.addColorStop(0,p.sky);sky.addColorStop(.55,p.rose);sky.addColorStop(1,p.gold);c.fillStyle=sky;c.fillRect(0,0,W,H);
 // Single proportion-preserving panorama; no repeating mountain or text artifacts.
 const mountain=im&&(s.phase==='awka'?im.intro.mountain:im.mountain);
 if(mountain && ready(mountain)){const ratio=mountain.naturalWidth/mountain.naturalHeight,h=Math.max(GROUND,(W+WORLD*.03)/ratio),w=h*ratio; c.drawImage(mountain,(W-w)/2-s.cam*.015,GROUND-h,w,h);c.globalCompositeOperation='soft-light';box(c,p.sunset,0,0,W,GROUND);c.globalCompositeOperation='source-over';}
  c.globalAlpha=.15;for(let i=0;i<5;i++){const x=(i*243+s.t*2)%1200-100;oval(c,p.light,x,50+i*13,90,9);}c.globalAlpha=1;
 
 // Distant forest, then the town and the playable street.
 c.save();c.translate(-s.cam*.35,0);for(let x=-200;x<WORLD;x+=95){box(c,p.trunk,x,360,5,90);c.fillStyle=p.forest;c.beginPath();c.moveTo(x-27,415);c.lineTo(x+3,320+(x%3)*12);c.lineTo(x+33,415);c.fill();}c.restore();
 c.save();c.translate(-s.cam,0);
 for(let x=40;x<WORLD-500;x+=300){const special=x===340, width=special?205:145;
    oval(c,p.shadow,x+width/2,GROUND+6,width*.65,9);if(im)drawTrimmed(c,im.house,x-10,GROUND-137,width+20,137);
  for(let j=0;j<3;j++)box(c,p.trunk,x+width+18+j*15,GROUND-22,3,23);box(c,p.trunk,x+width+14,GROUND-15,52,3);
  const tx=x+width+72;box(c,p.trunk,tx,GROUND-85,9,85);const wind=Math.sin(s.t*1.5+x)*3;
  for(let j=0;j<3;j++){c.fillStyle=p.leaf;c.beginPath();c.moveTo(tx-25+j*4,GROUND-50-j*24);c.lineTo(tx+4+wind,GROUND-115-j*18);c.lineTo(tx+35-j*4,GROUND-50-j*24);c.fill();}
 }
 box(c,p.road,-1200,GROUND,WORLD+1200,H-GROUND);box(c,p.curb,-1200,GROUND,WORLD+1200,7);for(let x=0;x<WORLD;x+=100)box(c,p.lane,x,GROUND+51,45,3);
 if(im && s.cam < 0){
  const art=im.intro, width=1050, height=width*art.building.naturalHeight/art.building.naturalWidth;
  if(ready(art.building))c.drawImage(art.building,-1050,GROUND-height+6,width,height);
  breeze(c,s,p);
  person(c,im.allies[0],s.intro.npcX,GROUND,s.intro.stage==='approach'?s.t*5:0,0);
  person(c,im.allies[1],-950,GROUND,0,1);
  if(['offer','smoking','warning'].includes(s.intro.stage))box(c,p.laser,s.intro.npcX-18,GROUND-44,11,3);
 }
 if(s.cam>=0)breeze(c,s,p);
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
 if(s.u.vis && s.phase==='beam'){c.globalAlpha=.35;c.fillStyle=p.ice;c.beginPath();c.moveTo(s.u.x-20,s.u.y+14);c.lineTo(s.u.x+20,s.u.y+14);c.lineTo(s.u.x+55,GROUND);c.lineTo(s.u.x-55,GROUND);c.fill();c.globalAlpha=1;}
 for(const [i,a] of s.allies.entries()) { if(a.hurt>0 && Math.floor(a.hurt*15)%2)continue;if(im?.allies[i])person(c,im.allies[i]??im.allies[0],a.x,a.y,s.recruited?a.walk:s.t,i,a.dead||a.hp<=0);if(s.recruited && s.phase==='fight'){box(c,p.panel,a.x-18,a.y-83,36,4);box(c,p.ice,a.x-18,a.y-83,36*a.hp/100,4);}}
  const hugging=!s.cat.gone && ((s.phase==='reunion'&&Math.abs(s.cat.x-s.p.x)<45)||['alien','speech','attack','fade'].includes(s.phase));
  if(im && !s.cat.gone && !hugging)catSprite(c,im.cat,s.cat.x,s.cat.y,s.cat.walk,s.cat.x>s.p.x?-1:1);
  const player=s.p;
  if(im && hugging){
   const stand=s.phase==='reunion'?Math.max(0,Math.min(1,(s.pt-4.6)/.8)):1;
   pose(c,im.reunion,0,2,player.x,player.y,96,1-stand);
   pose(c,im.reunion,1,2,player.x,player.y,96,stand);
  }else if(im && !(player.hurt>0&&Math.floor(player.hurt*20)%2))sprite(c,im.player,player.x,player.y,86,player.face,player.walk,player.crouch);
  if(im && player.armed>0 && !['reunion','alien','speech','attack','fade','jets'].includes(s.phase)) {c.save();c.translate(player.x+player.face*18-4,player.y-(player.crouch?35:48));c.scale(player.face,1);drawTrimmed(c,im.gun,0,0,17,6);c.restore();if(player.flash>0)oval(c,p.gold,player.x+player.face*34,player.y-46,8,5);}
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
 if(!['crash','arrive','reunion','alien','speech','attack','fade'].includes(s.phase)){
 box(c,p.panel,14,14,240,55);c.fillStyle=p.light;c.fillText('SALUD',24,24);box(c,p.ink,85,26,155,10);box(c,player.hp>30?p.ice:p.red,85,26,1.55*player.hp,10);
 if(s.phase==='fight'||s.phase==='help'){box(c,p.panel,310,14,330,39);c.fillStyle=p.light;c.fillText('OVNI',321,25);box(c,p.ink,367,26,257,10);box(c,p.laser,367,26,2.57*s.u.hp,10);}
 }
 if(canAskHelp(s))bubble(c,'PEDIR AYUDA A LOS PIBES',460-s.cam,GROUND-95,p,320);
 if(s.phase==='help')bubble(c,'EH LOCO, DEVOLVELE EL GATO AL PIBE',s.allies[0].x-s.cam,GROUND-100,p,470);
 if(s.phase==='speech')bubble(c,ALIEN_MESSAGE.slice(0,Math.floor(s.pt*22)),s.alien.x-s.cam,GROUND-112,p,630);
 if(s.phase==='attack' && s.pt<1.6)bubble(c,'¡PARÁ…!',s.allies[0].x-s.cam,GROUND-95,p,180);
 if(s.msgT>0 && !['help','crash','arrive','reunion','alien','speech','attack','fade'].includes(s.phase))bubble(c,s.msg,W/2,155,p,850);
  
 if(s.phase==='fade'){c.globalAlpha=Math.min(1,s.pt/3.5);box(c,p.ink,0,0,W,H);c.globalAlpha=1;}
}
