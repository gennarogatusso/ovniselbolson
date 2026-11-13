import { ALIEN_MESSAGE, GROUND, H, W, WORLD, SHIP, FOREST, SPECIAL_ATTACK_ANIM_DURATION, COMBAT_TIP_SLIDE_DURATION, COMBAT_TIP_HOLD_DURATION, COMBAT_TIP_CARD_DURATION, COMBAT_TIP_SEQUENCE_DURATION, CAT_ULTIMATE_READY_DELAY, CAT_ULTIMATE_THROW_DURATION, forestIsFree, canAskHelp, type S } from './game-engine';
export type IntroImages = { building: HTMLImageElement; mountain: HTMLImageElement; seated: HTMLImageElement; beer: HTMLImageElement; drink: HTMLImageElement; smokeIn: HTMLImageElement; smokeOut: HTMLImageElement; rise: HTMLImageElement; cat: HTMLImageElement };
export type ChapterImages = { truck: HTMLImageElement; trump: HTMLImageElement; milei: HTMLImageElement; arg: HTMLImageElement; usa: HTMLImageElement; bedroom: HTMLImageElement; eating: HTMLImageElement; sleeping: HTMLImageElement; waking: HTMLImageElement; dark: HTMLImageElement; walk: HTMLImageElement; up: HTMLImageElement; down: HTMLImageElement; run: HTMLImageElement; restingCat: HTMLImageElement; forest: HTMLImageElement; deer: HTMLImageElement; ship: HTMLImageElement };
export type SoldierImages = { cover: HTMLImageElement; bazooka: HTMLImageElement; advancing: HTMLImageElement; underFire: HTMLImageElement; shieldFire: HTMLImageElement; proneFire: HTMLImageElement };
export type ShipImages = { grey: HTMLImageElement; pickup: HTMLImageElement; push: HTMLImageElement; roll: HTMLImageElement; contemplate: HTMLImageElement; cat: HTMLImageElement; weapon: HTMLImageElement; laboratory: HTMLImageElement; main: HTMLImageElement; cross: HTMLImageElement; road: HTMLImageElement; afterCross: HTMLImageElement; trail: HTMLImageElement; walkDown: HTMLImageElement; base: HTMLImageElement; soldiers: SoldierImages; catThrow: HTMLImageElement[]; catFlying: HTMLImageElement; lying: HTMLImageElement };
export type SpecialFrame = { image: HTMLImageElement; anchorX: number; baseY: number; bodyHeight: number };
export type GameImages = { ship: ShipImages; chapter: ChapterImages; intro: IntroImages; specialFrames: SpecialFrame[]; specialProjectileFrames: [HTMLImageElement, HTMLImageElement]; combatTips: [HTMLImageElement, HTMLImageElement]; mountain: HTMLImageElement; player: HTMLImageElement; cat: HTMLImageElement; alien: HTMLImageElement; fighter: HTMLImageElement; gun: HTMLImageElement; allies: [HTMLImageElement, HTMLImageElement]; house: HTMLImageElement; tree: HTMLImageElement; alienFrames: [HTMLImageElement, HTMLImageElement, HTMLImageElement, HTMLImageElement]; reunion: HTMLImageElement };
const trims=new WeakMap<HTMLImageElement,[number,number,number,number]>();
function trimBounds(im:HTMLImageElement):[number,number,number,number]{
 let bounds=trims.get(im);
 if(!bounds){
  const canvas=document.createElement('canvas');canvas.width=im.naturalWidth;canvas.height=im.naturalHeight;
  const context=canvas.getContext('2d');
  if(!context)return [0,0,im.naturalWidth,im.naturalHeight];
  context.drawImage(im,0,0);
  const data=context.getImageData(0,0,canvas.width,canvas.height).data;
  let left=canvas.width,right=0,top=canvas.height,bottom=0;
  for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
   const i=(y*canvas.width+x)*4;
   if((data[i+3]??0)>16&&((data[i]??255)<245||(data[i+1]??255)<245||(data[i+2]??255)<245)){
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
   }
  }
  bounds=left<=right&&top<=bottom?[left,top,right-left+1,bottom-top+1]:[0,0,canvas.width,canvas.height];
  trims.set(im,bounds);
 }
 return bounds;
}
function drawTrimmed(c:CanvasRenderingContext2D,im:HTMLImageElement,x:number,y:number,w:number,h:number){
 if(!ready(im))return;
 const bounds=trimBounds(im);
 c.drawImage(im,bounds[0],bounds[1],bounds[2],bounds[3],x,y,w,h);
}
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
function drawSuperWeaponCharge(c:CanvasRenderingContext2D,s:S){
 const a=s.ship,q=Math.max(0,Math.min(1,a.charge/SHIP.chargeTime));
 if(q<=0)return;
 const x=a.x+a.face*50,y=a.y-65,pulse=.78+.22*Math.sin(s.t*17);
 c.save();c.globalCompositeOperation='screen';c.globalAlpha=.35+.65*q;
 c.save();c.translate(x,y);c.scale(1,.55);
 const glow=c.createRadialGradient(0,0,1,0,0,18+q*16);
 glow.addColorStop(0,'rgba(246,255,255,.92)');glow.addColorStop(.22,'rgba(111,242,255,.78)');glow.addColorStop(.62,'rgba(35,172,255,.25)');glow.addColorStop(1,'rgba(20,120,255,0)');
 c.fillStyle=glow;c.beginPath();c.arc(0,0,18+q*16,0,Math.PI*2);c.fill();c.restore();
 // Filamentos eléctricos que se contraen hacia la boca del arma: sin anillo ni círculo rosa.
 for(let i=0;i<9;i++){
  const phase=s.t*3.4+i*2.399,distance=22+(i%3)*12;
  const sx=x+Math.cos(phase)*distance,sy=y+Math.sin(phase)*distance*.66;
  const tx=x+Math.cos(phase+.9)*4,ty=y+Math.sin(phase+.9)*3;
  c.globalAlpha=(.24+.58*q)*(.65+.35*pulse);
  c.strokeStyle=i%3===0?'#ffffff':i%2?'#a8fbff':'#45cfff';
  c.lineWidth=1+q*1.6;c.beginPath();c.moveTo(sx,sy);
  c.quadraticCurveTo((sx+tx)/2+a.face*5,sy-Math.sin(phase*2)*7,tx,ty);c.stroke();
  if(i%2===0){c.globalAlpha=.55+.4*q;oval(c,'#eaffff',sx,sy,1.2+q,1.2+q);}
 }
 // Destellos alargados en dirección de disparo.
 c.globalAlpha=.28+.62*q;c.strokeStyle='#c8fbff';c.lineWidth=1.5+q*2;
 for(let i=0;i<3;i++){
  const offset=(i-1)*7,reach=10+q*18+(i===1?8:0);
  c.beginPath();c.moveTo(x-a.face*5,y+offset);c.lineTo(x+a.face*reach,y+offset*.35);c.stroke();
 }
 c.restore();
}
function drawSuperWeaponBeam(c:CanvasRenderingContext2D,s:S){
 const a=s.ship;if(a.beam<=0)return;
 const dx=a.beamTx-a.beamX,dy=a.beamTy-a.beamY,L=Math.hypot(dx,dy)||1,ux=dx/L,uy=dy/L;
 const edgeX=ux>0?(W-a.beamX)/ux:ux<0?-a.beamX/ux:Infinity;
 const edgeY=uy>0?(H-a.beamY)/uy:uy<0?-a.beamY/uy:Infinity;
 const length=Math.max(24,Math.min(1300,edgeX,edgeY));
 const sx=a.beamX,sy=a.beamY,ex=sx+ux*length,ey=sy+uy*length,nx=-uy,ny=ux;
 const power=Math.max(0,Math.min(1,a.beam/.65)),pulse=.82+.18*Math.sin(s.t*34);
 c.save();c.globalCompositeOperation='screen';c.globalAlpha=power;c.lineCap='round';c.lineJoin='round';
 const beamGradient=c.createLinearGradient(sx,sy,ex,ey);
 beamGradient.addColorStop(0,'rgba(101,246,255,.42)');beamGradient.addColorStop(.18,'rgba(44,205,255,.78)');beamGradient.addColorStop(.72,'rgba(65,185,255,.52)');beamGradient.addColorStop(1,'rgba(205,255,255,.28)');
 c.shadowColor='#52eaff';c.shadowBlur=34;
 c.strokeStyle=beamGradient;c.lineWidth=43*pulse;c.beginPath();c.moveTo(sx,sy);c.lineTo(ex,ey);c.stroke();
 c.shadowBlur=16;c.strokeStyle='rgba(84,227,255,.92)';c.lineWidth=20;c.beginPath();c.moveTo(sx,sy);c.lineTo(ex,ey);c.stroke();
 c.shadowBlur=8;c.strokeStyle='rgba(255,255,255,.98)';c.lineWidth=6;c.beginPath();c.moveTo(sx,sy);c.lineTo(ex,ey);c.stroke();
 // Corrientes luminosas que corren por dentro del rayo.
 c.shadowBlur=5;c.strokeStyle='rgba(231,255,255,.95)';c.lineWidth=2.2;c.setLineDash([18,22]);c.lineDashOffset=-s.t*190;
 c.beginPath();c.moveTo(sx,sy);c.lineTo(ex,ey);c.stroke();c.setLineDash([]);
 // Pequeñas descargas laterales para darle volumen y movimiento.
 for(let i=0;i<8;i++){
  const q=.12+i*.105,bx=sx+(ex-sx)*q,by=sy+(ey-sy)*q,side=i%2?1:-1,reach=8+(i%3)*5;
  const bend=Math.sin(s.t*19+i*2.1)*4;
  c.globalAlpha=power*(.42+.38*Math.sin(s.t*26+i));
  c.strokeStyle=i%2?'#d9ffff':'#5deaff';c.lineWidth=1.5;
  c.beginPath();c.moveTo(bx,by);c.lineTo(bx+nx*reach*side+ux*bend,by+ny*reach*side+uy*bend);c.lineTo(bx+nx*reach*1.55*side+ux*5,by+ny*reach*1.55*side+uy*5);c.stroke();
 }
 // Fogonazo en el origen y explosión breve en el punto de impacto.
 const sourceGlow=c.createRadialGradient(sx,sy,1,sx,sy,42);
 sourceGlow.addColorStop(0,'rgba(255,255,255,.98)');sourceGlow.addColorStop(.18,'rgba(134,248,255,.9)');sourceGlow.addColorStop(1,'rgba(40,170,255,0)');
 c.globalAlpha=power;c.fillStyle=sourceGlow;c.fillRect(sx-45,sy-45,90,90);
 const hitX=a.beamTx,hitY=a.beamTy,hitRadius=24+Math.sin(s.t*32)*4;
 const impact=c.createRadialGradient(hitX,hitY,1,hitX,hitY,hitRadius*2.5);
 impact.addColorStop(0,'rgba(255,255,255,1)');impact.addColorStop(.18,'rgba(183,255,255,.95)');impact.addColorStop(.48,'rgba(65,214,255,.48)');impact.addColorStop(1,'rgba(34,148,255,0)');
 c.fillStyle=impact;c.fillRect(hitX-hitRadius*2.5,hitY-hitRadius*2.5,hitRadius*5,hitRadius*5);
 c.globalAlpha=power*.8;c.strokeStyle='rgba(207,255,255,.95)';c.lineWidth=2.5;c.beginPath();c.ellipse(hitX,hitY,hitRadius*1.35,hitRadius*.72,s.t*2,0,Math.PI*2);c.stroke();
 c.restore();
}
function drawCombatTips(c:CanvasRenderingContext2D,s:S,im:GameImages){
 if(s.phase!=='fight'||s.combatTipsTime<0||s.combatTipsTime>=COMBAT_TIP_SEQUENCE_DURATION)return;
 const index=s.combatTipsTime>=COMBAT_TIP_CARD_DURATION?1:0;
 const localTime=s.combatTipsTime-index*COMBAT_TIP_CARD_DURATION;
 const image=im.combatTips[index];
 if(!ready(image))return;
 const scale=Math.min((W-120)/image.naturalWidth,230/image.naturalHeight)*.5;
 const width=image.naturalWidth*scale,height=image.naturalHeight*scale;
 const enterEnd=COMBAT_TIP_SLIDE_DURATION,holdEnd=enterEnd+COMBAT_TIP_HOLD_DURATION;
 const restingY=18;
 let y=restingY;
 if(localTime<enterEnd){
  const q=Math.max(0,Math.min(1,localTime/enterEnd)),ease=1-Math.pow(1-q,3);
  y=-height-8+(restingY+height+8)*ease;
 }else if(localTime>=holdEnd){
  const q=Math.max(0,Math.min(1,(localTime-holdEnd)/COMBAT_TIP_SLIDE_DURATION)),ease=q*q*q;
  y=restingY-(restingY+height+12)*ease;
 }
 c.save();c.imageSmoothingEnabled=false;c.shadowColor='rgba(0,0,0,.5)';c.shadowBlur=12;c.shadowOffsetY=5;
 c.drawImage(image,(W-width)/2,y,width,height);c.restore();
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
function catSprite(c:CanvasRenderingContext2D,im:HTMLImageElement,x:number,y:number,walk:number,face:number,height=40) {
 if(!ready(im)) return; const h=height,w=h*im.naturalWidth/im.naturalHeight;
 c.save();c.translate(x,y+6+Math.sin(walk)*1);c.scale(face,1);c.imageSmoothingEnabled=false;c.drawImage(im,-w/2,-h,w,h);c.restore();
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
 if(s.phase==='crash')c.rotate(Math.sin(s.pt*10)*.2+s.pt*.16);
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
 if(['reunion','alien','speech','attack','fade'].includes(s.phase)){box(c,p.ink,-27,5,25,18);box(c,p.metal,-31,20,33,4);}
 if(u.hit>0){c.globalAlpha=Math.min(1,u.hit*2);oval(c,'#ffffff',0,0,67,16);c.globalAlpha=1;}
 c.restore();
 if(['crash','arrive','reunion','alien','speech','attack','fade'].includes(s.phase)){
  for(let i=0;i<12;i++){const q=(s.t*.25+i/12)%1;c.globalAlpha=(1-q)*.5;oval(c,p.smoke,u.x+Math.sin(i*2)*22+q*40,u.y-q*145,9+q*24,10+q*20);}c.globalAlpha=1;
 }
}
function drawUfoCrashTrail(c:CanvasRenderingContext2D,s:S,p:Palette){
 const u=s.u,q=Math.max(0,Math.min(1,s.pt/5));
 const dx=s.crashX-s.crashStart.x,dy=(GROUND-65)-s.crashStart.y,length=Math.hypot(dx,dy)||1;
 const vx=dx/length,vy=dy/length,px=-vy,py=vx;
 c.save();c.globalCompositeOperation='screen';
 for(let i=0;i<4;i++){
  const offset=(i-1.5)*8,tail=72+q*94+i*11;
  const sx=u.x-vx*10+px*offset,sy=u.y-vy*10+py*offset;
  const ex=u.x-vx*tail+px*(offset+Math.sin(s.t*13+i)*7),ey=u.y-vy*tail+py*(offset+Math.cos(s.t*11+i)*5);
  c.globalAlpha=.72-q*.18;c.lineCap='round';
  const flame=c.createLinearGradient(sx,sy,ex,ey);
  flame.addColorStop(0,'rgba(255,255,235,.98)');flame.addColorStop(.18,'rgba(255,230,151,.96)');
  flame.addColorStop(.48,'rgba(255,111,35,.82)');flame.addColorStop(1,'rgba(255,52,20,0)');
  c.strokeStyle=flame;c.lineWidth=14-i*2.2;c.shadowColor='#ff7a31';c.shadowBlur=19;
  c.beginPath();c.moveTo(sx,sy);c.quadraticCurveTo((sx+ex)/2+px*14,(sy+ey)/2+py*14,ex,ey);c.stroke();
 }
 c.shadowBlur=0;
 for(let i=0;i<11;i++){
  const phase=s.t*.8+i*.71,progress=(i/11+(s.t*.18)%1)%1,distance=28+progress*(92+q*65),side=Math.sin(phase)*19;
  const x=u.x-vx*distance+px*side,y=u.y-vy*distance+py*side-progress*18,radius=8+progress*17+(i%3)*3;
  const puff=c.createRadialGradient(x-radius*.2,y-radius*.3,1,x,y,radius*1.6);
  puff.addColorStop(0,'rgba(104,111,119,.54)');puff.addColorStop(.48,'rgba(57,64,73,.36)');puff.addColorStop(1,'rgba(36,43,53,0)');
  c.globalAlpha=.6*(1-progress*.48);c.fillStyle=puff;c.beginPath();c.arc(x,y,radius*1.6,0,Math.PI*2);c.fill();
 }
 if(q>.82){
  const impact=(q-.82)/.18,ix=u.x+vx*18,iy=GROUND-65,radius=18+impact*86;
  const flash=c.createRadialGradient(ix,iy,1,ix,iy,radius);
  flash.addColorStop(0,'rgba(255,255,245,.92)');flash.addColorStop(.2,'rgba(255,221,153,.78)');
  flash.addColorStop(.55,'rgba(255,103,34,.32)');flash.addColorStop(1,'rgba(255,52,18,0)');
  c.globalAlpha=impact*.85;c.fillStyle=flash;c.fillRect(ix-radius,iy-radius,radius*2,radius*2);
  for(let i=0;i<18;i++){
   const angle=i*2.399+s.t*2.2,reach=14+impact*(24+(i%5)*12);
   c.globalAlpha=impact*(.45+.5*Math.sin(s.t*24+i));
   c.strokeStyle=i%3===0?'rgba(255,246,202,.98)':'rgba(255,127,48,.95)';
   c.lineWidth=1+(i%3);c.beginPath();c.moveTo(ix+Math.cos(angle)*8,iy+Math.sin(angle)*6);
   c.lineTo(ix+Math.cos(angle)*reach,iy+Math.sin(angle)*reach*.62);c.stroke();
  }
 }
 c.restore();
}
function drawUfoWreckage(c:CanvasRenderingContext2D,s:S,p:Palette,x=s.u.x,baseY=GROUND-58){
 c.save();c.globalCompositeOperation='screen';
 const intensity=s.phase==='aftermath'?.88:1;
 for(let i=0;i<5;i++){
  const flameX=x+(i-2)*25+Math.sin(s.t*8+i*2)*3,flameY=baseY+13+Math.sin(i*1.7)*4;
  const height=16+(i%3)*9+Math.sin(s.t*11+i*2)*6;
  const glow=c.createRadialGradient(flameX,flameY-height*.3,1,flameX,flameY-height*.3,height*1.7);
  glow.addColorStop(0,'rgba(255,245,185,.82)');glow.addColorStop(.28,'rgba(255,135,42,.58)');glow.addColorStop(1,'rgba(255,70,20,0)');
  c.globalAlpha=intensity;c.fillStyle=glow;c.fillRect(flameX-height*1.7,flameY-height*1.8,height*3.4,height*3.4);
  c.beginPath();c.moveTo(flameX-6,flameY+5);
  c.quadraticCurveTo(flameX-10+Math.sin(s.t*9+i)*4,flameY-height*.55,flameX+Math.sin(s.t*12+i)*4,flameY-height);
  c.quadraticCurveTo(flameX+9,flameY-height*.45,flameX+6,flameY+5);c.closePath();
  const fire=c.createLinearGradient(0,flameY-height,0,flameY+5);
  fire.addColorStop(0,'rgba(255,249,204,.96)');fire.addColorStop(.38,'rgba(255,163,53,.92)');fire.addColorStop(1,'rgba(221,55,20,.12)');
  c.fillStyle=fire;c.fill();
 }
 for(let i=0;i<17;i++){
  const column=i%4,step=Math.floor(i/4),phase=s.t*(.48+column*.07)+i*1.31,age=(s.t*.22+step*.21+column*.13)%1;
  const sx=x+(column-1.5)*27+Math.sin(phase)*12,sy=baseY-10-age*(118+column*12),radius=10+age*22+(i%3)*3;
  const puff=c.createRadialGradient(sx-radius*.25,sy-radius*.3,1,sx,sy,radius*1.65);
  puff.addColorStop(0,'rgba(116,124,133,.55)');puff.addColorStop(.38,'rgba(69,77,87,.44)');
  puff.addColorStop(.72,'rgba(43,51,62,.25)');puff.addColorStop(1,'rgba(31,39,48,0)');
  c.globalAlpha=intensity*(.65-age*.32);c.fillStyle=puff;c.beginPath();c.arc(sx,sy,radius*1.65,0,Math.PI*2);c.fill();
 }
 for(let i=0;i<12;i++){
  const phase=s.t*(1.3+i*.035)+i*2.4,life=(s.t*.43+i*.137)%1,ex=x+Math.sin(phase)*38+(i-5.5)*3,ey=baseY-20-life*(45+(i%4)*12);
  c.globalAlpha=(1-life)*(.4+.45*Math.sin(phase));c.shadowColor='#ff9b45';c.shadowBlur=8;
  oval(c,i%3===0?'#fff1b7':'#ff9a45',ex,ey,1.7,2.6);
 }
 c.shadowBlur=0;c.restore();
}
function drawAlienDespawnBeam(c:CanvasRenderingContext2D,s:S,p:Palette){
 if(s.phase!=='jets'||!s.alienHit)return;
 const progress=Math.max(0,Math.min(1,1-s.alien.reveal));if(progress<=0)return;
 const x=s.alien.x,ground=GROUND-2,top=ground-(112+progress*128),fade=(.24+.76*progress)*(.82+.18*Math.sin(s.t*23)),width=20+progress*39;
 c.save();c.globalCompositeOperation='screen';
 const shaft=c.createLinearGradient(x,top,x,ground);
 shaft.addColorStop(0,'rgba(255,255,255,0)');
 shaft.addColorStop(.23,'rgba(247,253,255,'+(.22*fade)+')');
 shaft.addColorStop(.62,'rgba(255,255,255,'+(.66*fade)+')');shaft.addColorStop(1,'rgba(255,255,255,0)');
 c.globalAlpha=fade;c.fillStyle=shaft;c.beginPath();c.moveTo(x-width*.7,top);c.lineTo(x+width*.7,top);
 c.lineTo(x+width,ground);c.lineTo(x-width,ground);c.closePath();c.fill();
 const core=c.createRadialGradient(x,ground-72,2,x,ground-72,84+progress*46);
 core.addColorStop(0,'rgba(255,255,255,'+(.92*fade)+')');core.addColorStop(.3,'rgba(224,247,255,'+(.58*fade)+')');
 core.addColorStop(1,'rgba(187,229,255,0)');c.fillStyle=core;c.fillRect(x-140,ground-210,280,230);
 for(let i=0;i<3;i++){
  const radius=18+progress*62+i*13;c.globalAlpha=fade*(.72-i*.16);
  c.strokeStyle=i===0?'rgba(255,255,255,.96)':'rgba(206,241,255,.82)';c.lineWidth=2-i*.35;
  c.beginPath();c.ellipse(x,ground-1,radius,radius*.2,0,0,Math.PI*2);c.stroke();
 }
 for(let i=0;i<12;i++){
  const angle=i*Math.PI*2/12+s.t*.45,inner=18+progress*20,outer=55+progress*95;
  c.globalAlpha=fade*(.3+.35*Math.sin(s.t*17+i));
  c.strokeStyle=i%3===0?'rgba(255,255,255,.95)':'rgba(205,240,255,.82)';c.lineWidth=i%3===0?2:1;
  c.beginPath();c.moveTo(x+Math.cos(angle)*inner,ground-78+Math.sin(angle)*inner);
  c.lineTo(x+Math.cos(angle)*outer,ground-78+Math.sin(angle)*outer);c.stroke();
 }
 for(let i=0;i<22;i++){
  const rise=(s.t*88+i*23)%220,q=rise/220,px=x+Math.sin(s.t*3+i*1.7)*width*(.25+q)+Math.cos(i*2.1)*18,py=ground-q*210;
  c.globalAlpha=fade*(1-q)*(.35+.55*Math.sin(s.t*14+i));
  oval(c,i%4===0?'#ffffff':'#c8efff',px,py,1.5+(i%3)*.65,2.2+(i%2));
 }
 c.restore();
}
function drawCrossWreckSmoke(c:CanvasRenderingContext2D,s:S){
 const baseX=790,baseY=430;c.save();c.globalCompositeOperation='screen';
 for(let i=0;i<22;i++){
  const column=i%5,step=Math.floor(i/5),phase=s.t*(.34+column*.035)+i*1.42,life=(s.t*.13+step*.2+column*.09)%1;
  const x=baseX+(column-2)*17+Math.sin(phase)*10,y=baseY-life*(115+column*11),radius=9+life*21+(i%3)*2;
  const puff=c.createRadialGradient(x-radius*.2,y-radius*.28,1,x,y,radius*1.55);
  puff.addColorStop(0,'rgba(120,129,139,.44)');puff.addColorStop(.42,'rgba(73,83,94,.38)');
  puff.addColorStop(.78,'rgba(44,54,65,.22)');puff.addColorStop(1,'rgba(30,40,51,0)');
  c.globalAlpha=.7-life*.28;c.fillStyle=puff;c.beginPath();c.arc(x,y,radius*1.55,0,Math.PI*2);c.fill();
 }
 c.restore();
}
function drawCatAbductionLighting(c:CanvasRenderingContext2D,s:S,p:Palette){
 if(!s.u.vis||!['descend','beam','rise'].includes(s.phase))return;
 const {u,cat}=s,clamp=(v:number)=>Math.max(0,Math.min(1,v));
 const lift=s.phase==='beam'?clamp((s.pt-.6)/1.6):s.phase==='rise'?1:0;
 const intensity=s.phase==='descend'?clamp(s.pt/1.5)*.72:s.phase==='beam' ? .86+.1*Math.sin(s.t*5) :Math.max(.22,1-s.pt/2.8);
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


function specialPose(c:CanvasRenderingContext2D,frames:SpecialFrame[],elapsed:number,x:number,y:number,h:number){
 const t=Math.max(0,elapsed);
 const frame=t<.16?0:t<.32?1:t<.48?2:t<.64?3:t<.8?4:t<.98?5:6;
 const sprite=frames[frame];
 if(!sprite||!ready(sprite.image))return;
 const scale=h/Math.max(1,sprite.bodyHeight),w=sprite.image.naturalWidth*scale,drawH=sprite.image.naturalHeight*scale;
 c.save();c.imageSmoothingEnabled=false;c.drawImage(sprite.image,x-sprite.anchorX*scale,y-sprite.baseY*scale,w,drawH);c.restore();
}
function drawSpecialProjectile(c:CanvasRenderingContext2D,frames:[HTMLImageElement,HTMLImageElement],b:{x:number;y:number;vx:number;vy:number},time:number){
 const im=frames[Math.floor(time*8)%frames.length];
 if(!ready(im))return;
 const width=88,height=width*im.naturalHeight/im.naturalWidth,angle=Math.atan2(b.vy,b.vx);
 c.save();c.translate(b.x,b.y);c.rotate(angle);c.imageSmoothingEnabled=false;c.globalAlpha=.98;c.drawImage(im,-width/2,-height/2,width,height);c.restore();
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
function stillTrimmed(c:CanvasRenderingContext2D,im:HTMLImageElement,x:number,y:number,h:number,alpha=1){
 if(!ready(im)||alpha<=0)return;
 const bounds=trimBounds(im),w=h*bounds[2]/bounds[3];
 c.save();c.imageSmoothingEnabled=false;c.globalAlpha=alpha;
 c.drawImage(im,bounds[0],bounds[1],bounds[2],bounds[3],x-w/2,y-h,w,h);
 c.restore();
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
 c.save();c.globalAlpha=alpha;c.translate(531,202);c.rotate(.36);c.drawImage(im,-width/2,-height/2,width,height);c.restore();
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
  stillTrimmed(c,art.waking,510,283,100,q);
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
function forestEase(value:number){
 const q=Math.max(0,Math.min(1,value));return q*q*(3-2*q);
}
function drawForestRain(c:CanvasRenderingContext2D,s:S,groundY:number,front:boolean){
 const count=front?116:78;
 c.save();c.globalCompositeOperation='screen';
 for(let i=0;i<count;i++){
  const speed=(front?420:310)+(i%7)*(front?48:36);
  const x=((i*79+s.t*speed*.62)%(W+100))-50;
  const y=((i*53+s.t*speed)%(H+120))-60;
  const length=(front?12:8)+(i%5)*(front?3.1:2.2);
  c.strokeStyle=front
   ?'rgba(204,232,255,'+(.20+(i%4)*.055)+')'
   :'rgba(172,211,242,'+(.11+(i%4)*.035)+')';
  c.lineWidth=front?(i%5===0?1.8:1.15):.9;
  c.beginPath();c.moveTo(x,y);c.lineTo(x-5.5,y+length);c.stroke();
  if(front&&i%9===0)oval(c,'rgba(231,246,255,.35)',x-5.5,y+length,1.2,1.8);
 }
 c.restore();
 if(!front||groundY<-5||groundY>H+16)return;
 // Las gotas revientan contra el suelo y levantan pequeñas coronas de agua.
 c.save();c.globalCompositeOperation='screen';
 for(let i=0;i<20;i++){
  const q=(s.t*1.9+i*.173)%1;
  const x=((i*151+s.t*31)%(W+70))-35;
  const spread=2+Math.sin(q*Math.PI)*8;
  const y=groundY+Math.sin(q*Math.PI)*2;
  c.globalAlpha=(1-q)*.5;
  c.strokeStyle='rgba(190,231,255,.82)';c.lineWidth=1;
  c.beginPath();c.ellipse(x,y,spread,spread*.28,0,Math.PI,Math.PI*2);c.stroke();
  if(q<.48){
   for(let k=0;k<2;k++){
    const side=k===0?-1:1,up=(.48-q)*8;
    oval(c,'rgba(217,243,255,.72)',x+side*(spread+1),y-up,1,1.8);
   }
  }
 }
 c.restore();
}
function drawForestPuddles(c:CanvasRenderingContext2D,s:S,groundY:number){
 const layout=[[-44,72,9],[91,51,6],[226,82,8],[389,48,5],[548,90,9],[704,63,7],[872,76,8]] as const;
 c.save();c.globalCompositeOperation='screen';
 for(let i=0;i<layout.length;i++){
  const [base,rx,ry]=layout[i]!;
  const x=((base-s.chapter.forestX*.16+W*3)%(W+170))-85;
  const y=groundY+25+(i%3)*4;
  const shimmer=.65+.35*Math.sin(s.t*2.1+i*1.7);
  const glow=c.createRadialGradient(x,y-3,1,x,y,rx*1.55);
  glow.addColorStop(0,'rgba(126,211,255,.17)');glow.addColorStop(.35,'rgba(61,141,190,.13)');glow.addColorStop(1,'rgba(35,80,115,0)');
  c.globalCompositeOperation='multiply';c.globalAlpha=.66;c.fillStyle='rgba(7,17,30,.94)';c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();
  c.globalCompositeOperation='screen';c.globalAlpha=.9;c.fillStyle=glow;c.fillRect(x-rx*1.6,y-ry*3,rx*3.2,ry*6);
  c.globalAlpha=.48*shimmer;c.strokeStyle='rgba(157,224,255,.9)';c.lineWidth=1.1;
  c.beginPath();c.ellipse(x-2,y-1,rx*.82,ry*.52,-.035,Math.PI*1.08,Math.PI*1.9);c.stroke();
  c.globalAlpha=.26;c.fillStyle='rgba(236,249,255,.8)';c.beginPath();c.ellipse(x-rx*.25,y-ry*.35,rx*.24,Math.max(1,ry*.16),-.08,0,Math.PI*2);c.fill();
  const ripple=(s.t*.72+i*.19)%1;
  c.globalAlpha=(1-ripple)*.42;c.strokeStyle='rgba(169,226,255,.9)';c.lineWidth=1;
  c.beginPath();c.ellipse(x+Math.sin(s.t+i)*rx*.25,y,rx*(.12+ripple*.42),ry*(.2+ripple*.12),0,0,Math.PI*2);c.stroke();
 }
 c.restore();
}
function drawForestFallingStars(c:CanvasRenderingContext2D,s:S,groundY:number){
 c.save();c.globalCompositeOperation='screen';
 for(let i=0;i<4;i++){
  const period=7.3+i*.91,phase=((s.t+i*1.83)%period)/period;
  const launchX=68+i*224+(i%2)*34,impactX=116+((i*187+73)%710);
  const startY=-54-(i%3)*42,impactY=groundY-14;
  if(phase<.82){
   const q=forestEase(phase/.82),x=launchX+(impactX-launchX)*q,y=startY+(impactY-startY)*q;
   const tailX=x-(impactX-launchX)*.075,tailY=y-(impactY-startY)*.075;
   c.save();c.shadowColor='#ff302d';c.shadowBlur=18;c.strokeStyle='rgba(255,53,43,.78)';c.lineWidth=3.2;
   c.beginPath();c.moveTo(tailX,tailY);c.lineTo(x,y);c.stroke();
   c.shadowBlur=10;oval(c,'#ff5a45',x,y,3.8,3.8);oval(c,'#fff2df',x,y,1.5,1.5);c.restore();
   const haze=c.createRadialGradient(x,y,1,x,y,27);
   haze.addColorStop(0,'rgba(255,62,45,.13)');haze.addColorStop(1,'rgba(255,38,34,0)');
   c.fillStyle=haze;c.fillRect(x-28,y-28,56,56);
  }else{
   const hit=(phase-.82)/.18,fade=1-hit,x=impactX,y=impactY;
   const flare=c.createRadialGradient(x,y,1,x,y,18+hit*34);
   flare.addColorStop(0,'rgba(255,231,180,'+(.64*fade)+')');flare.addColorStop(.28,'rgba(255,70,42,'+(.42*fade)+')');flare.addColorStop(1,'rgba(255,35,30,0)');
   c.fillStyle=flare;c.fillRect(x-54,y-54,108,108);
   c.globalAlpha=fade*.68;c.strokeStyle='rgba(255,104,66,.92)';c.lineWidth=1.4;
   c.beginPath();c.ellipse(x,y,8+hit*28,2+hit*5,0,0,Math.PI*2);c.stroke();
   for(let k=0;k<7;k++){
    const angle=k*2.399,dist=5+hit*20;
    c.strokeStyle=k%2?'rgba(255,91,58,.8)':'rgba(255,224,169,.92)';c.lineWidth=1.3;
    c.beginPath();c.moveTo(x+Math.cos(angle)*dist,y+Math.sin(angle)*dist*.35);c.lineTo(x+Math.cos(angle)*(dist+5),y+Math.sin(angle)*(dist+5)*.35);c.stroke();
   }
   c.globalAlpha=1;
  }
 }
 c.restore();
}
function drawForestAbductionBeam(c:CanvasRenderingContext2D,s:S,p:Palette,actorX:number){
 const a=s.chapter;if(!['beam','lift','vanished','complete'].includes(a.stage))return;
 const liftProgress=a.stage==='lift'?forestEase(a.time/6):(a.stage==='vanished'||a.stage==='complete'?1:0);
 const timeProgress=a.stage==='beam'?forestEase(a.time/2.8):1;
 const topX=448,topY=155,bottomX=actorX,bottomY=a.forestY+7;
 const spread=150-108*liftProgress,alpha=(a.stage==='vanished'||a.stage==='complete')?Math.max(0,1-a.time/1.8):timeProgress;
 c.save();c.globalCompositeOperation='screen';
 const outer=c.createLinearGradient(topX,topY,bottomX,bottomY);
 outer.addColorStop(0,'rgba(237,255,255,.62)');outer.addColorStop(.3,'rgba(120,223,255,.28)');outer.addColorStop(1,'rgba(69,176,255,.06)');
 c.globalAlpha=alpha*.86;c.fillStyle=outer;c.beginPath();c.moveTo(topX-18,topY);c.lineTo(topX+18,topY);c.lineTo(bottomX+spread,bottomY);c.lineTo(bottomX-spread,bottomY);c.closePath();c.fill();
 const core=c.createLinearGradient(topX,topY,bottomX,bottomY);
 core.addColorStop(0,'rgba(255,255,255,.9)');core.addColorStop(.45,'rgba(201,250,255,.34)');core.addColorStop(1,'rgba(153,233,255,.04)');
 c.globalAlpha=alpha*.72;c.fillStyle=core;c.beginPath();c.moveTo(topX-5,topY);c.lineTo(topX+5,topY);c.lineTo(bottomX+spread*.2,bottomY);c.lineTo(bottomX-spread*.2,bottomY);c.closePath();c.fill();
 // Líneas de energía y polvo girando dentro del haz.
 for(let i=0;i<11;i++){
  const q=(i+1)/12,drift=Math.sin(s.t*2.6+i*1.9)*spread*.12;
  c.globalAlpha=alpha*(.12+.12*Math.sin(s.t*3.1+i));
  c.strokeStyle=i%3===0?'rgba(249,255,255,.9)':'rgba(126,226,255,.7)';
  c.lineWidth=i%3===0?2:1;c.beginPath();c.moveTo(topX+(i-5)*2,topY+5);c.lineTo(topX+(bottomX-topX)*q+drift,topY+(bottomY-topY)*q);c.stroke();
 }
 const pool=c.createRadialGradient(bottomX,bottomY,2,bottomX,bottomY,190);
 pool.addColorStop(0,'rgba(229,255,255,.55)');pool.addColorStop(.27,'rgba(94,217,255,.25)');pool.addColorStop(1,'rgba(66,160,255,0)');
 c.globalAlpha=alpha;c.fillStyle=pool;c.fillRect(bottomX-200,bottomY-180,400,360);
 c.globalAlpha=alpha*.8;c.shadowColor='#a8f4ff';c.shadowBlur=20;c.strokeStyle='rgba(209,253,255,.88)';c.lineWidth=2;
 c.beginPath();c.ellipse(bottomX,bottomY,35+Math.sin(s.t*4.5)*12,6+Math.sin(s.t*4.5)*2,0,0,Math.PI*2);c.stroke();
 c.shadowBlur=0;c.restore();
}
function forest(c:CanvasRenderingContext2D,s:S,im:GameImages,p:Palette){
 const a=s.chapter,art=im.chapter;
 const later=['ship','beam','lift','vanished','complete'].includes(a.stage);
 const ease=forestEase;
 let cameraLift=0;
 if(a.stage==='ship')cameraLift=18*ease(a.time/1.15);
 else if(a.stage==='beam')cameraLift=18+42*ease(a.time/3);
 else if(a.stage==='lift')cameraLift=60+150*ease(a.time/6);
 else if(a.stage==='vanished'||a.stage==='complete')cameraLift=210;
 const worldGround=GROUND+cameraLift+24;
 c.save();c.translate(0,cameraLift);
 // El paneo ascendente deja aparecer cielo oscuro por encima de los árboles.
 const sky=c.createLinearGradient(0,-cameraLift,0,270-cameraLift);
 sky.addColorStop(0,'#030711');sky.addColorStop(.58,'#071321');sky.addColorStop(1,'#101827');
 c.fillStyle=sky;c.fillRect(-80,-cameraLift,W+160,H+cameraLift+80);
 if(ready(art.forest)){
  const h=Math.max(H,W*art.forest.naturalHeight/art.forest.naturalWidth),w=h*art.forest.naturalWidth/art.forest.naturalHeight,offset=a.forestX%w,tile=Math.floor(a.forestX/w);
  for(let i=0;i<2;i++){
   const x=i*w-offset;c.save();c.translate(x,0);
   if((tile+i)%2){c.translate(w,0);c.scale(-1,1);}
   c.drawImage(art.forest,0,H-h,w,h);c.restore();
  }
 }
 drawMoonGlow(c,W*.79,105-cameraLift,112,s.t,.68);
 // Bloom atmosférico frío, niebla pegada al bosque y destellos lejanos.
 c.save();c.globalCompositeOperation='screen';
 const haze=c.createRadialGradient(W*.52,GROUND-145,25,W*.52,GROUND-145,480);
 haze.addColorStop(0,'rgba(70,130,180,.12)');haze.addColorStop(.55,'rgba(30,86,130,.07)');haze.addColorStop(1,'rgba(16,35,62,0)');
 c.fillStyle=haze;c.fillRect(0,0,W,H);
 const horizonGlow=c.createLinearGradient(0,GROUND-115,0,GROUND+30);
 horizonGlow.addColorStop(0,'rgba(58,99,141,0)');horizonGlow.addColorStop(.72,'rgba(77,125,158,.09)');horizonGlow.addColorStop(1,'rgba(12,27,42,0)');
 c.fillStyle=horizonGlow;c.fillRect(0,GROUND-115,W,145);c.restore();
 drawForestFallingStars(c,s,GROUND+18);
 drawForestRain(c,s,GROUND+18,false);
 const deerX=330+FOREST.deer+160-a.forestX;
 if(deerX>-200&&deerX<W+200)still(c,art.deer,deerX,GROUND+3,94);
 drawForestPuddles(c,s,GROUND);
 if(later&&ready(art.ship)){
  const reveal=a.stage==='ship'?ease(a.time/1.15):1;
  const grow=a.stage==='ship' ? .94+.06*ease(a.time/1.15) : 1;
  let width=900*grow,height=width*art.ship.naturalHeight/art.ship.naturalWidth;
  if(height>340){width*=340/height;height=340;}
  const x=(W-width)/2,y=155-height;
  c.save();c.globalAlpha=reveal;c.globalCompositeOperation='screen';
  const aura=c.createRadialGradient(W/2,155,12,W/2,155,410);
  aura.addColorStop(0,'rgba(120,231,255,.28)');aura.addColorStop(.38,'rgba(76,167,222,.13)');aura.addColorStop(1,'rgba(48,103,168,0)');
  c.fillStyle=aura;c.fillRect(W/2-420,155-390,840,780);
  c.globalCompositeOperation='source-over';c.drawImage(art.ship,x,y,width,height);c.restore();
 }
 const actorX=a.stage==='lift'?330+110*ease(a.time/6):330;
 drawForestAbductionBeam(c,s,p,actorX);
 const abductionFlash=a.stage==='lift'?Math.max(0,Math.min(1,(a.time-4.8)/1.2)):0;
 if(abductionFlash>0){
  const pulse=.76+.24*Math.sin(s.t*44),centerY=a.forestY-48;
  c.save();c.globalCompositeOperation='screen';c.globalAlpha=(.18+.72*abductionFlash)*pulse;
  const glow=c.createRadialGradient(actorX,centerY,2,actorX,centerY,58+abductionFlash*78);
  glow.addColorStop(0,'rgba(255,255,255,.98)');
  glow.addColorStop(.22,'rgba(204,247,255,.82)');
  glow.addColorStop(.56,'rgba(87,190,255,.34)');
  glow.addColorStop(1,'rgba(70,160,255,0)');
  c.fillStyle=glow;c.fillRect(actorX-150,centerY-150,300,300);
  c.strokeStyle='rgba(239,252,255,.9)';c.lineWidth=1.5+abductionFlash*2;
  for(let i=0;i<9;i++){
   const angle=i*Math.PI*2/9+s.t*.8,outer=34+abductionFlash*42,inner=8+abductionFlash*7;
   c.beginPath();c.moveTo(actorX+Math.cos(angle)*outer,centerY+Math.sin(angle)*outer);
   c.lineTo(actorX+Math.cos(angle)*inner,centerY+Math.sin(angle)*inner);c.stroke();
  }
  c.restore();
 }
 if(!['vanished','complete'].includes(a.stage)){
  const forestMovementStage=['forestFade','forestRun','burned','ship'].includes(a.stage);
  const face=a.forestFace<0?-1:1;
  if(forestMovementStage&&!a.forestHasMoved&&ready(art.walk)){
   const frame=Math.floor(s.t*7)%4;
   c.save();c.translate(actorX,a.forestY);c.scale(face,1);
   pose(c,art.walk,frame,4,0,0,100);c.restore();
  }else if(forestMovementStage&&a.moving&&ready(art.run)){
   const frame=Math.floor(a.roomWalk)%4;
   c.save();c.translate(actorX,a.forestY);c.scale(face,1);
   pose(c,art.run,frame,4,0,0,100);c.restore();
  }else if(a.stage==='lift'){
   still(c,im.player,actorX,a.forestY,100,1-forestEase(abductionFlash));
  }else still(c,im.player,actorX,a.forestY,100);
 }
 // Reflejo del OVNI en agua: aparece junto con el paneo y el haz.
 if(later){
  const glowStrength=a.stage==='ship'?ease(a.time/1.15):((a.stage==='vanished'||a.stage==='complete') ? .48 : .72);
  c.save();c.globalCompositeOperation='screen';c.globalAlpha=glowStrength*.5;
  const reflection=c.createRadialGradient(W*.47,GROUND+30,8,W*.47,GROUND+30,270);
  reflection.addColorStop(0,'rgba(108,221,255,.23)');reflection.addColorStop(1,'rgba(54,135,200,0)');
  c.fillStyle=reflection;c.fillRect(W*.47-280,GROUND-245,560,560);c.restore();
 }
 if(a.stage==='deer')bubble(c,'¿Qué carajo está pasando?',330,GROUND-120,p,520);
 c.restore();
 // Lluvia en primer plano: gotas más gruesas, diagonales y salpicaduras al tocar el suelo.
 drawForestRain(c,s,worldGround,true);
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

type CatEyePoint = { x: number; y: number };
const catEyeCache = new WeakMap<HTMLImageElement,CatEyePoint>();
function catEyePosition(im:HTMLImageElement,x:number,y:number,height:number):CatEyePoint{
 let point=catEyeCache.get(im);
 if(!point){
  const bounds=trimBounds(im);
  point={x:bounds[0]+bounds[2]*.56,y:bounds[1]+bounds[3]*.27};
  try{
   const canvas=document.createElement('canvas');canvas.width=im.naturalWidth;canvas.height=im.naturalHeight;
   const context=canvas.getContext('2d');
   if(context){
    context.drawImage(im,0,0);
    const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
    const left=Math.floor(bounds[0]+bounds[2]*.12),right=Math.ceil(bounds[0]+bounds[2]*.88);
    const top=Math.floor(bounds[1]+bounds[3]*.04),bottom=Math.ceil(bounds[1]+bounds[3]*.46);
    let weightTotal=0,weightedX=0,weightedY=0;
    for(let py=top;py<bottom;py++)for(let px=left;px<right;px++){
     const index=(py*canvas.width+px)*4,r=pixels[index]??0,g=pixels[index+1]??0,b=pixels[index+2]??0,alpha=pixels[index+3]??0;
     if(alpha<150)continue;
     const pale=r>178&&g>178&&b>178,cyan=r>105&&g>160&&b>185&&b-r>42;
     if(!pale&&!cyan)continue;
     const weight=Math.max(1,(r+g+b)/3-110);
     weightTotal+=weight;weightedX+=px*weight;weightedY+=py*weight;
    }
    if(weightTotal>18)point={x:weightedX/weightTotal,y:weightedY/weightTotal};
   }
  }catch{
   // Si no se puede leer el PNG, se conserva el punto aproximado calculado desde el recorte visible.
  }
  catEyeCache.set(im,point);
 }
 const scale=height/im.naturalHeight,spriteWidth=height*im.naturalWidth/im.naturalHeight;
 return {x:x-spriteWidth/2+point.x*scale,y:y-height+point.y*scale};
}
function drawCatEyeCharge(c:CanvasRenderingContext2D,eye:CatEyePoint,time:number,p:Palette){
 const pulse=.72+.28*Math.sin(time*19),radius=13+pulse*6;
 c.save();c.globalCompositeOperation='screen';
 const glow=c.createRadialGradient(eye.x,eye.y,1,eye.x,eye.y,radius*2.4);
 glow.addColorStop(0,'rgba(255,255,255,.98)');glow.addColorStop(.22,'rgba(119,255,255,.92)');
 glow.addColorStop(.58,'rgba(58,205,255,.34)');glow.addColorStop(1,'rgba(58,205,255,0)');
 c.fillStyle=glow;c.fillRect(eye.x-radius*2.4,eye.y-radius*2.4,radius*4.8,radius*4.8);
 c.strokeStyle=p.light;c.lineWidth=1.2;c.globalAlpha=.7+.25*pulse;
 c.beginPath();c.arc(eye.x,eye.y,radius*.82+Math.sin(time*25)*2,0,Math.PI*2);c.stroke();
 c.restore();
}
function drawCatEyeLaser(c:CanvasRenderingContext2D,from:CatEyePoint,to:CatEyePoint,time:number,power:number,index:number){
 if(power<=0)return;
 const dx=to.x-from.x,dy=to.y-from.y;
 c.save();c.globalCompositeOperation='screen';c.globalAlpha=power;c.lineCap='round';c.lineJoin='round';
 const gradient=c.createLinearGradient(from.x,from.y,to.x,to.y);
 gradient.addColorStop(0,'rgba(255,255,255,.98)');gradient.addColorStop(.16,'rgba(133,255,255,.96)');
 gradient.addColorStop(.56,'rgba(64,220,255,.88)');gradient.addColorStop(1,'rgba(190,250,255,.96)');
 c.shadowColor='#63edff';c.shadowBlur=28;c.strokeStyle='rgba(61,210,255,.28)';c.lineWidth=19;
 c.beginPath();c.moveTo(from.x,from.y);c.lineTo(to.x,to.y);c.stroke();
 c.shadowBlur=15;c.strokeStyle=gradient;c.lineWidth=7.5;
 c.beginPath();c.moveTo(from.x,from.y);c.lineTo(to.x,to.y);c.stroke();
 c.shadowBlur=5;c.strokeStyle='rgba(255,255,255,.98)';c.lineWidth=2.4;
 c.beginPath();c.moveTo(from.x,from.y);c.lineTo(to.x,to.y);c.stroke();
 c.shadowBlur=7;c.strokeStyle='rgba(226,255,255,.95)';c.lineWidth=1.4;
 c.setLineDash([13,10]);c.lineDashOffset=-time*185-index*7;
 c.beginPath();c.moveTo(from.x,from.y);c.lineTo(to.x,to.y);c.stroke();c.setLineDash([]);
 for(let i=0;i<5;i++){
  const q=(i/5+(time*.72+index*.23)%1)%1,sx=from.x+dx*q,sy=from.y+dy*q;
  const flicker=.55+.45*Math.sin(time*31+i*4+index);
  c.globalAlpha=power*flicker;c.fillStyle='#efffff';c.beginPath();c.arc(sx,sy,1.3+(i%2)*.8,0,Math.PI*2);c.fill();
 }
 c.globalAlpha=power;
 const eyeGlow=c.createRadialGradient(from.x,from.y,1,from.x,from.y,21);
 eyeGlow.addColorStop(0,'rgba(255,255,255,1)');eyeGlow.addColorStop(.25,'rgba(133,255,255,.82)');eyeGlow.addColorStop(1,'rgba(60,205,255,0)');
 c.fillStyle=eyeGlow;c.fillRect(from.x-22,from.y-22,44,44);
 const radius=20+Math.sin(time*33+index)*3;
 const impact=c.createRadialGradient(to.x,to.y,1,to.x,to.y,radius*2);
 impact.addColorStop(0,'rgba(255,255,255,.98)');impact.addColorStop(.22,'rgba(180,255,255,.88)');
 impact.addColorStop(.6,'rgba(61,213,255,.42)');impact.addColorStop(1,'rgba(61,213,255,0)');
 c.fillStyle=impact;c.fillRect(to.x-radius*2,to.y-radius*2,radius*4,radius*4);
 c.globalAlpha=power*.78;c.strokeStyle='rgba(230,255,255,.95)';c.lineWidth=1.6;
 c.beginPath();c.arc(to.x,to.y,radius*(.78+.12*Math.sin(time*26+index)),0,Math.PI*2);c.stroke();
 for(let i=0;i<7;i++){
  const angle=i*2.399+time*2.2+index,reach=radius*(.9+(i%3)*.3);
  c.globalAlpha=power*(.5+.35*Math.sin(time*21+i+index));
  c.strokeStyle=i%2?'rgba(137,246,255,.95)':'rgba(255,255,255,.95)';c.lineWidth=1.4;
  c.beginPath();c.moveTo(to.x+Math.cos(angle)*radius*.35,to.y+Math.sin(angle)*radius*.35);
  c.lineTo(to.x+Math.cos(angle)*reach,to.y+Math.sin(angle)*reach);c.stroke();
 }
 c.restore();
}
function drawCatUltimateBeam(c:CanvasRenderingContext2D,s:S){
 const a=s.ship,catX=a.x+42,catY=135+Math.sin(s.t*13)*4,power=Math.min(1,a.time/.22);
 c.save();c.globalCompositeOperation='lighter';
 const aura=c.createRadialGradient(catX,catY,2,catX,catY,96);
 aura.addColorStop(0,'rgba(255,255,255,.95)');aura.addColorStop(.16,'rgba(231,170,255,.8)');aura.addColorStop(.48,'rgba(172,52,255,.36)');aura.addColorStop(1,'rgba(125,35,255,0)');
 c.fillStyle=aura;c.fillRect(catX-100,catY-100,200,200);
 for(let i=0;i<a.soldiers.length;i++){
  const soldier=a.soldiers[i],sx=catX,sy=catY+12,tx=soldier.x,ty=soldier.y-58;
  const bend=Math.sin(s.t*19+i*2.1)*24,midX=(sx+tx)/2+bend,midY=(sy+ty)/2-55-Math.cos(s.t*15+i)*12;
  const drawPath=()=>{c.beginPath();c.moveTo(sx,sy);c.quadraticCurveTo(midX,midY,tx,ty);};
  const gradient=c.createLinearGradient(sx,sy,tx,ty);
  gradient.addColorStop(0,'rgba(255,255,255,.98)');gradient.addColorStop(.2,'rgba(236,192,255,.98)');gradient.addColorStop(.62,'rgba(177,61,255,.95)');gradient.addColorStop(1,'rgba(106,24,255,.88)');
  c.globalAlpha=power*(.82+.18*Math.sin(s.t*23+i));c.strokeStyle='rgba(117,35,255,.5)';c.lineWidth=34;c.shadowColor='#a72cff';c.shadowBlur=34;drawPath();c.stroke();
  c.strokeStyle=gradient;c.lineWidth=17;c.shadowColor='#d98aff';c.shadowBlur=25;drawPath();c.stroke();
  c.strokeStyle='rgba(255,255,255,.98)';c.lineWidth=4.5;c.shadowColor='#fff';c.shadowBlur=18;drawPath();c.stroke();
  c.shadowBlur=0;
  for(let arc=0;arc<4;arc++){
   const q=((s.t*1.7+arc*.27+i*.13)%1),px=sx+(tx-sx)*q+bend*Math.sin(q*Math.PI),py=sy+(ty-sy)*q+(midY-(sy+ty)/2)*Math.sin(q*Math.PI);
   const wiggle=10+arc*3;c.globalAlpha=power*(.55+.4*Math.sin(s.t*31+arc+i));c.strokeStyle=arc%2?'rgba(236,193,255,.96)':'rgba(255,255,255,.94)';c.lineWidth=1.5+arc*.35;
   c.beginPath();c.moveTo(px-wiggle,py-5);c.lineTo(px-wiggle*.25,py-13-Math.sin(s.t*27+arc)*5);c.lineTo(px+wiggle*.18,py+7);c.lineTo(px+wiggle,py-3);c.stroke();
  }
  for(let particle=0;particle<8;particle++){
   const q=(particle/8+s.t*(.75+i*.035))%1,px=sx+(tx-sx)*q+bend*Math.sin(q*Math.PI),py=sy+(ty-sy)*q+(midY-(sy+ty)/2)*Math.sin(q*Math.PI);
   c.globalAlpha=power*(.38+.55*Math.abs(Math.sin(s.t*18+particle*3+i)));c.fillStyle=particle%3?'#e9b6ff':'#ffffff';c.beginPath();c.arc(px,py,1.5+(particle%3),0,Math.PI*2);c.fill();
  }
  const impact=c.createRadialGradient(tx,ty,1,tx,ty,52);impact.addColorStop(0,'rgba(255,255,255,.98)');impact.addColorStop(.24,'rgba(234,181,255,.9)');impact.addColorStop(.58,'rgba(159,57,255,.5)');impact.addColorStop(1,'rgba(116,29,255,0)');
  c.globalAlpha=power;c.fillStyle=impact;c.fillRect(tx-54,ty-54,108,108);
  c.strokeStyle='rgba(240,206,255,.9)';c.lineWidth=2;c.beginPath();c.arc(tx,ty,20+Math.sin(s.t*26+i)*7,0,Math.PI*2);c.stroke();
 }
 c.restore();
}

function drawCatUltimateScorch(c:CanvasRenderingContext2D,s:S){
 const a=s.ship,center=a.soldiers.reduce((sum,e)=>sum+e.x,0)/(a.soldiers.length||1);
 c.save();c.globalCompositeOperation='multiply';
 for(let i=0;i<a.soldiers.length;i++){
  const soldier=a.soldiers[i];if(!soldier)continue;
  const x=soldier.x,y=SHIP.floor-5,width=42+(i%2)*12;
  const char=c.createRadialGradient(x,y,1,x,y,width);
  char.addColorStop(0,'rgba(9,7,16,.98)');char.addColorStop(.48,'rgba(24,13,34,.94)');
  char.addColorStop(.82,'rgba(39,20,51,.72)');char.addColorStop(1,'rgba(36,18,50,0)');
  c.globalAlpha=.94;c.fillStyle=char;c.beginPath();c.ellipse(x,y,width,9+(i%2)*2,(i-1.5)*.035,0,Math.PI*2);c.fill();
 }
 const wide=c.createRadialGradient(center,SHIP.floor-5,8,center,SHIP.floor-5,150);
 wide.addColorStop(0,'rgba(8,6,15,.84)');wide.addColorStop(.62,'rgba(23,13,31,.68)');wide.addColorStop(1,'rgba(30,13,44,0)');
 c.globalAlpha=.9;c.fillStyle=wide;c.beginPath();c.ellipse(center,SHIP.floor-5,150,12,0,0,Math.PI*2);c.fill();
 c.globalCompositeOperation='screen';c.globalAlpha=.34;c.strokeStyle='rgba(163,74,255,.9)';c.lineWidth=2;
 c.beginPath();c.ellipse(center,SHIP.floor-7,112,8,0,0,Math.PI*2);c.stroke();c.restore();
}
function drawCatUltimateExplosion(c:CanvasRenderingContext2D,s:S){
 const a=s.ship,age=a.time;if(age>1.2)return;
 const x=a.soldiers.reduce((sum,e)=>sum+e.x,0)/(a.soldiers.length||1),y=SHIP.floor-24;
 const q=Math.max(0,Math.min(1,age/1.2)),fade=Math.pow(1-q,.72),radius=24+q*162;
 c.save();c.globalCompositeOperation='lighter';
 const core=c.createRadialGradient(x,y,1,x,y,radius);
 core.addColorStop(0,'rgba(255,255,255,.98)');core.addColorStop(.12,'rgba(246,220,255,.98)');
 core.addColorStop(.34,'rgba(195,91,255,.82)');core.addColorStop(.68,'rgba(122,35,255,.34)');
 core.addColorStop(1,'rgba(89,21,210,0)');
 c.globalAlpha=fade;c.fillStyle=core;c.fillRect(x-radius,y-radius,radius*2,radius*2);
 c.strokeStyle='rgba(225,179,255,.95)';c.lineWidth=5*(1-q)+1;c.shadowColor='#ad43ff';c.shadowBlur=28;
 for(let ring=0;ring<3;ring++){
  const ringQ=Math.max(0,q-ring*.13),ringRadius=18+ringQ*(116+ring*22);
  c.globalAlpha=fade*(.9-ring*.18);c.beginPath();c.ellipse(x,y,ringRadius,ringRadius*.34,0,0,Math.PI*2);c.stroke();
 }
 c.shadowBlur=0;
 for(let i=0;i<28;i++){
  const angle=i*2.399963,reach=34+(i%7)*20,travel=Math.min(1,age/(.32+(i%4)*.12));
  const distance=travel*reach,px=x+Math.cos(angle)*distance,py=y+Math.sin(angle)*distance*.52;
  c.globalAlpha=fade*(.45+.45*Math.sin(s.t*17+i));c.strokeStyle=i%3?'#d7a1ff':'#ffffff';c.lineWidth=1.5+i%3;
  c.beginPath();c.moveTo(x+Math.cos(angle)*12,y+Math.sin(angle)*6);c.lineTo(px,py);c.stroke();
  c.fillStyle=i%4?'#bd65ff':'#ffffff';c.beginPath();c.arc(px,py,1.5+i%3,0,Math.PI*2);c.fill();
 }
 c.restore();
}

function drawAurora(c:CanvasRenderingContext2D,time:number,strength=1){
 c.save();c.beginPath();c.rect(0,0,W,H*.54);c.clip();c.globalCompositeOperation='screen';
 for(let band=0;band<4;band++){
  const phase=time*.22+band*1.47,offset=band*19;
  const gradient=c.createLinearGradient(0,24,0,H*.52);
  gradient.addColorStop(0,'rgba(105,53,220,0)');
  gradient.addColorStop(.24,'rgba(142,83,255,'+(.055*strength)+')');
  gradient.addColorStop(.58,'rgba(112,75,255,'+(.12*strength)+')');
  gradient.addColorStop(1,'rgba(92,60,220,0)');
  c.fillStyle=gradient;c.beginPath();c.moveTo(-24,34+offset);
  for(let x=-24;x<=W+24;x+=24){
   const y=58+offset+Math.sin(x*.008+phase)*17+Math.sin(x*.0035-phase*1.35)*15;c.lineTo(x,y);
  }
  for(let x=W+24;x>=-24;x-=24){
   const y=132+offset+Math.sin(x*.006+phase+1.7)*22+Math.sin(x*.0028-phase)*18;c.lineTo(x,y);
  }
  c.closePath();c.fill();
 }
 for(let i=0;i<11;i++){
  const phase=time*.32+i*1.17,x=((i*103+time*(9+i%4*2))%(W+100))-50;
  const top=35+Math.sin(phase)*19,bottom=H*.48+(i%3)*13,width=24+(i%4)*9;
  const curtain=c.createLinearGradient(x,top,x+width,bottom);
  curtain.addColorStop(0,'rgba(115,65,255,0)');
  curtain.addColorStop(.28,'rgba(155,105,255,'+(.045*strength)+')');
  curtain.addColorStop(.62,'rgba(176,128,255,'+(.13*strength)+')');
  curtain.addColorStop(1,'rgba(95,60,225,0)');
  c.fillStyle=curtain;c.shadowColor='rgba(173,117,255,.72)';c.shadowBlur=17;
  c.beginPath();c.moveTo(x,top);c.bezierCurveTo(x+width*.7,top+48+Math.sin(phase)*15,x-width*.35,bottom-48,x+width*.4,bottom);
  c.lineTo(x+width*1.25,bottom);c.bezierCurveTo(x+width*.95,bottom-58,x+width*1.5,top+52,x+width*.75,top);c.closePath();c.fill();
 }
 c.shadowBlur=0;
 for(let i=0;i<4;i++){
  const phase=time*.28+i*1.6,x=((i*249+time*7)%(W+260))-130;
  c.strokeStyle='rgba(213,187,255,'+(.12*strength)+')';c.lineWidth=1.5+i%2;c.shadowColor='#a875ff';c.shadowBlur=12;
  c.beginPath();c.moveTo(x,70+i*17);c.bezierCurveTo(x+75,42+Math.sin(phase)*20,x+135,120+Math.cos(phase)*17,x+245,81+i*15);c.stroke();
 }
 c.restore();
}
function drawMoonGlow(c:CanvasRenderingContext2D,x:number,y:number,radius:number,time:number,intensity=1){
 c.save();c.globalCompositeOperation='screen';
 const pulse=.94+.06*Math.sin(time*1.15),halo=c.createRadialGradient(x,y,2,x,y,radius*2.6);
 halo.addColorStop(0,'rgba(239,239,255,'+(.2*intensity*pulse)+')');
 halo.addColorStop(.2,'rgba(202,178,255,'+(.19*intensity*pulse)+')');
 halo.addColorStop(.52,'rgba(135,105,255,'+(.1*intensity)+')');
 halo.addColorStop(1,'rgba(110,85,245,0)');
 c.fillStyle=halo;c.fillRect(x-radius*2.6,y-radius*2.6,radius*5.2,radius*5.2);
 const wash=c.createRadialGradient(x,y+radius*.65,2,x,y+radius*.65,radius*2.1);
 wash.addColorStop(0,'rgba(211,220,255,'+(.095*intensity)+')');
 wash.addColorStop(.4,'rgba(154,139,255,'+(.055*intensity)+')');
 wash.addColorStop(1,'rgba(132,115,255,0)');
 c.fillStyle=wash;c.fillRect(x-radius*2.1,y-radius*.3,radius*4.2,radius*4.2);
 c.restore();
}

function shipScene(c:CanvasRenderingContext2D,s:S,im:GameImages,p:Palette){
 const a=s.ship,art=im.ship;
 const trail=a.stage==='trailWalk'||a.stage==='trailEnd';
 const baseScene=['baseFade','baseApproach','baseEnd'].includes(a.stage);
 const cross=['impact','crossRise','crossFree','contemplate','crossSunset','end'].includes(a.stage);
 const road=['crossWalkIntro','crossWalk'].includes(a.stage);
 const battle=['militaryIntro','soldierFight','soldierUltimateThrow','soldierUltimateAscend','soldierUltimateBeam','soldierEnd','soldierExit'].includes(a.stage);
 const lab=['awakening','verdict','catEntry','eyeCharge','rescue','rise','labFree','door'].includes(a.stage);
 c.save();box(c,p.ink,0,0,W,H);
 if(a.shake>0)c.translate(Math.sin(s.t*61)*a.shake*8,Math.cos(s.t*49)*a.shake*5);
 const background=baseScene?art.base:trail?art.trail:road?art.road:battle?art.afterCross:cross?art.cross:lab?art.laboratory:art.main;
 const scale=Math.max(W/background.naturalWidth,H/background.naturalHeight),bw=background.naturalWidth*scale,bh=background.naturalHeight*scale;
 c.drawImage(background,(W-bw)/2,(H-bh)/2,bw,bh);
 if(road||battle){c.save();c.globalAlpha=road ? 0.17 : 0.23;box(c,'#392754',0,0,W,H);c.restore();}
 const actor=(x:number,y:number,h=112)=>{
  c.save();c.translate(x,y);c.scale(a.face,1);
  const walkingStage=['crossWalkIntro','crossWalk','militaryIntro','soldierFight','soldierEnd','soldierExit','baseFade','baseApproach','baseEnd'].includes(a.stage);
  if(a.stage==='soldierUltimateThrow'){
   const progress=a.stage==='soldierUltimateThrow'?Math.min(.999,a.time/CAT_ULTIMATE_THROW_DURATION):.999;
   const frameIndex=Math.min(art.catThrow.length-1,Math.floor(progress*art.catThrow.length));
   const frame=art.catThrow[frameIndex];
   if(frame)stillTrimmed(c,frame,0,0,h+14);
  }
  else if(a.specialAnim>0&&a.stage==='soldierFight')specialPose(c,im.specialFrames,SPECIAL_ATTACK_ANIM_DURATION-a.specialAnim,0,0,h);
  else if(a.roll>0)pose(c,art.roll,Math.min(5,Math.floor((1-a.roll/SHIP.rollTime)*6)),6,0,0,h);
  else if(a.push!=='none')pose(c,art.push,a.push==='lean'?0:a.push==='flight'?1:2,3,0,0,h);
  else if(walkingStage)pose(c,im.chapter.walk,Math.floor(a.walk)%4,4,0,0,h);
  else if(a.stage==='pickup'||a.armed)pose(c,art.pickup,a.stage==='pickup'?Math.min(3,Math.floor(a.time/2.4*4)):3,4,0,0,h);
  else pose(c,im.chapter.walk,Math.floor(a.walk)%4,4,0,0,h);
  if((!a.armed&&a.stage==='combat')||a.stage==='soldierFight'){drawTrimmed(c,im.gun,12,-64,27,10);if(a.flash>0)oval(c,p.gold,40,-60,9,5);}
  c.restore();
 };
 const line=(col:string,x:number,y:number,tx:number,ty:number,width:number)=>{c.strokeStyle=col;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(tx,ty);c.stroke();};
 if(baseScene){
  const q=Math.max(0,Math.min(1,a.baseProgress)),x=18+q*W*.6,y=H*.84;
  actor(x,y,168);catSprite(c,im.cat,x-86,y,Math.floor(a.walk*1.1),1,60+q*14);
 }else if(trail){
  const q=Math.max(0,Math.min(1,a.trailProgress)),depth=.38+q*.62,scale=(.13+depth*1.02)*1.5,y=H*(.55+depth*.43),x=W*.5,height=112*scale;
  c.save();c.translate(x,y);pose(c,art.walkDown,Math.floor(a.walk)%4,4,0,0,height);c.restore();
  catSprite(c,im.cat,x-height*.46,y,Math.floor(a.walk*1.15),-1,Math.max(8,42*scale));
 }else if(cross){
  drawCrossWreckSmoke(c,s);
  if(a.stage==='contemplate'||a.stage==='crossSunset'||a.stage==='end')pose(c,art.contemplate,0,2,305,334,118);
  else if(a.stage==='crossRise')pose(c,art.push,2,3,s.chapter.roomX,s.chapter.roomY,118);
  else roomActor(c,s,im.chapter);
  catSprite(c,im.cat,a.catX,a.catY,0,-1);
  if(a.stage==='crossSunset'){
   const q=Math.min(1,a.time/7),sunY=112+q*145;
   const glow=c.createRadialGradient(748,sunY,4,748,sunY,104);
   glow.addColorStop(0,'rgba(255,207,153,.95)');glow.addColorStop(.28,'rgba(246,139,126,.52)');glow.addColorStop(1,'rgba(170,104,191,0)');
   c.fillStyle=glow;c.fillRect(630,sunY-112,236,224);oval(c,`rgba(255,${Math.round(189-q*95)},${Math.round(147+q*42)},${.8*(1-q*.72)})`,748,sunY,25*(1-q*.24),25*(1-q*.24));
   c.globalAlpha=.12+q*.55;box(c,'#302050',0,0,W,H);c.globalAlpha=1;
   const dusk=c.createLinearGradient(0,0,0,H);dusk.addColorStop(0,'rgba(48,31,91,.25)');dusk.addColorStop(.62,'rgba(66,42,111,.18)');dusk.addColorStop(1,'rgba(19,16,43,.62)');c.fillStyle=dusk;c.fillRect(0,0,W,H);
   if(a.time>2.1)bubble(c,'Vámonos, antes que oscurezca.',485,162,p,560);
  }
  if(a.stage==='impact'){c.globalAlpha=Math.max(0,1-a.time/1.8);box(c,p.light,0,0,W,H);c.globalAlpha=1;}
 }else if(road){
  actor(a.x,a.y,114);catSprite(c,im.cat,a.catX,a.catY,Math.floor(a.walk*1.2),a.x>=a.catX?1:-1,46);
  if(a.stage==='crossWalkIntro'){const q=Math.min(1,a.time/3.5);c.globalAlpha=Math.max(0,1-q);box(c,p.ink,0,0,W,H);c.globalAlpha=1;}
 }else if(battle){
  if(a.stage==='soldierUltimateBeam'||a.stage==='soldierEnd'||a.stage==='soldierExit')drawCatUltimateScorch(c,s);
  for(const e of a.soldiers){
   const artSoldier=e.role==='bazooka'?(e.state==='fire'?art.soldiers.bazooka:art.soldiers.proneFire):e.state==='advance'?art.soldiers.advancing:e.state==='fire'?art.soldiers.shieldFire:e.state==='hit'?art.soldiers.underFire:art.soldiers.cover;
   if(e.hp<=0&&e.deadTime>1.8)continue;
   const scaleH=e.role==='bazooka'?104:112,w=ready(artSoldier)?scaleH*trimBounds(artSoldier)[2]/trimBounds(artSoldier)[3]:70;
   c.save();c.translate(e.x,e.y);c.scale(-1,1);if(e.hp<=0){c.globalAlpha=Math.max(0,1-e.deadTime*.45);c.rotate(-Math.min(1,e.deadTime*3)*.45);}else if(e.hurt>0&&Math.floor(s.t*18)%2)c.globalAlpha=.4;
   oval(c,'rgba(0,0,0,.36)',0,-2,34,7);drawTrimmed(c,artSoldier,-w/2,-scaleH,w,scaleH);c.restore();
   if(e.hp>0){const barW=62,bx=e.x-barW/2,by=e.y-scaleH-17;c.fillStyle='rgba(8,8,18,.9)';c.fillRect(bx-2,by-3,barW+4,9);c.fillStyle='#5b171f';c.fillRect(bx,by,barW,4);c.fillStyle=e.hp/e.maxHp>.35?'#b9f2cf':'#ff6a72';c.fillRect(bx,by,barW*e.hp/e.maxHp,4);}
  }
  if(a.stage==='soldierUltimateBeam'){drawCatUltimateBeam(c,s);drawCatUltimateExplosion(c,s);}
  actor(a.x,a.y,112);
  if(a.stage==='soldierUltimateAscend'||a.stage==='soldierUltimateBeam'){
   const rise=Math.min(1,a.time/.72),catY=a.stage==='soldierUltimateBeam'?135:SHIP.floor-115-rise*202;
   stillTrimmed(c,art.catFlying,a.x+42,catY,86);
  }else if(a.stage!=='soldierUltimateThrow'&&a.stage!=='soldierEnd')catSprite(c,im.cat,a.catX,a.catY,Math.floor(a.walk*1.2),a.x>=a.catX?1:-1,46);
  for(const b of a.shots){if(b.kind==='special'){if((b.delay??0)<=0)drawSpecialProjectile(c,im.specialProjectileFrames,b,s.t);}else line(p.ice,b.x,b.y,b.x-b.vx*.025,b.y-b.vy*.025,3);}
  for(const b of a.bolts){if(b.kind==='rocket'){c.save();c.strokeStyle='#ff9d52';c.lineWidth=7;c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x-b.vx*.065,b.y-b.vy*.065);c.stroke();oval(c,'#ffe0a0',b.x,b.y,6,5);c.restore();}else line(p.laser,b.x,b.y,b.x-b.vx*.035,b.y-b.vy*.035,4);}
  box(c,p.panel,14,14,218,42);c.font='13px monospace';c.fillStyle=p.light;c.fillText('SALUD',24,40);box(c,p.ink,82,30,138,10);box(c,a.hp>35?p.ice:p.red,82,30,1.38*a.hp,10);
  if(a.stage==='militaryIntro'){c.globalAlpha=Math.max(0,1-a.time/2.2);box(c,p.ink,0,0,W,H);c.globalAlpha=1;}
  if(a.stage==='soldierFight'){
   const remaining=Math.max(0,CAT_ULTIMATE_READY_DELAY-Math.floor(a.time));
   const ready=a.time>=CAT_ULTIMATE_READY_DELAY&&!a.catUltimateUsed&&a.soldiers.some(e=>e.hp>0);
   const panelW=ready?390:270,panelH=ready?62:42,panelX=(W-panelW)/2,panelY=16;
   c.save();c.fillStyle='rgba(10,7,25,.88)';c.beginPath();c.roundRect(panelX,panelY,panelW,panelH,7);c.fill();
   c.strokeStyle=ready?'rgba(222,166,255,.95)':'rgba(156,119,196,.68)';c.lineWidth=1.5;c.stroke();
   c.textAlign='center';c.textBaseline='middle';c.fillStyle='#fff';c.shadowColor='#bd63ff';c.shadowBlur=ready?13:7;
   c.font='bold 17px monospace';c.fillText('ULTI LISTA EN '+remaining,W/2,panelY+19);
   if(ready){c.font='11px monospace';c.shadowBlur=4;c.fillStyle='#e8d3ff';c.fillText('Pulsa X para usar la Ultimate',W/2,panelY+43);}
   c.restore();
  }
 }else if(lab){
  const dead=['rescue','rise','labFree','door'].includes(a.stage);
  for(const x of [610,735])pose(c,art.grey,dead?Math.min(8,3+Math.floor(a.labDead*5)):0,9,x,SHIP.floor,115);
  if(['awakening','verdict','catEntry','eyeCharge','rescue'].includes(a.stage)){
   stillTrimmed(c,art.lying,480,364,64);
  }else if(a.stage==='rise')stillTrimmed(c,im.chapter.waking,480,380,132);
  else actor(a.x,a.y);
  if(['catEntry','eyeCharge','rescue'].includes(a.stage))still(c,art.cat,a.catX,SHIP.floor,78);
  else if(['rise','labFree','door'].includes(a.stage))catSprite(c,im.cat,a.catX,a.catY,0,1,52);
  const catEye=catEyePosition(art.cat,a.catX,SHIP.floor,78);
  if(a.stage==='eyeCharge')drawCatEyeCharge(c,catEye,a.time,p);
  if(a.stage==='rescue'){
   const beamPower=Math.max(0,Math.min(1,(2.8-a.time)/1.35));
   drawCatEyeLaser(c,catEye,{x:610,y:SHIP.floor-83},s.t,beamPower,0);
   drawCatEyeLaser(c,catEye,{x:735,y:SHIP.floor-83},s.t,beamPower,1);
  }
  if(a.stage==='verdict')bubble(c,'Los gatos son la especie más peligrosa del universo. Deben ser erradicados',675,240,p,700);
  if(a.stage==='door'){c.globalAlpha=Math.min(1,a.time/1.2);box(c,p.ink,0,0,W,H);c.globalAlpha=1;}
 }else{
  if(!a.boxBroken){line(p.metal,SHIP.boxX,70,SHIP.boxX,SHIP.boxY-25,3);box(c,p.panel,SHIP.boxX-27,SHIP.boxY-22,54,44);c.strokeStyle=p.metal;c.lineWidth=2;c.strokeRect(SHIP.boxX-27,SHIP.boxY-22,54,44);still(c,art.weapon,SHIP.boxX,SHIP.boxY+8,25);}
  else if(!a.armed&&a.stage!=='pickup')still(c,art.weapon,SHIP.boxX,a.weaponY,28);
  for(const e of a.enemies){const f=e.hp<=0?Math.min(8,3+Math.floor(e.deadTime*5)):e.hurt>0?1:e.windup>0?2:0;c.save();c.translate(e.x,e.y);c.scale(e.face,1);pose(c,art.grey,f,9,0,0,115);c.restore();if(e.windup>0)oval(c,p.energy,e.x,e.y-84,8,8);}
  actor(a.x,a.y);catSprite(c,im.cat,a.catX,a.catY,0,1,52);
  for(const b of a.shots){if(b.kind==='special'){if((b.delay??0)<=0)drawSpecialProjectile(c,im.specialProjectileFrames,b,s.t);}else line(p.ice,b.x,b.y,b.x-b.vx*.025,b.y-b.vy*.025,3);}
  for(const b of a.bolts)line(p.laser,b.x,b.y,b.x-b.vx*.04,b.y-b.vy*.04,4);
  if(a.beam>0)drawSuperWeaponBeam(c,s);
  if(a.charge>0)drawSuperWeaponCharge(c,s);
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
 const auroraStages=['crossSunset','crossWalkIntro','crossWalk','militaryIntro','soldierFight','soldierUltimateThrow','soldierUltimateAscend','soldierUltimateBeam','soldierEnd','soldierExit','trailWalk','baseFade','baseApproach','baseEnd'];
 if(auroraStages.includes(a.stage))drawAurora(c,s.t,a.stage==='crossSunset'?Math.min(.95,a.time/3.6):.92);
 const moonStages=['crossWalkIntro','crossWalk','militaryIntro','soldierFight','soldierUltimateThrow','soldierUltimateAscend','soldierUltimateBeam','soldierEnd','soldierExit','trailWalk','baseFade','baseApproach','baseEnd'];
 if(moonStages.includes(a.stage))drawMoonGlow(c,W*.79,H*.16,112,s.t,a.stage.startsWith('base')?1:.68);
 if(a.stage==='baseFade'){c.save();c.globalAlpha=1-Math.min(1,a.time/1.6);box(c,p.ink,0,0,W,H);c.restore();}
 if(a.stage==='baseEnd'){
  c.save();c.fillStyle='rgba(8,7,22,.68)';c.fillRect(0,0,W,H);c.fillStyle='#fff';c.textAlign='center';c.textBaseline='middle';c.font='bold 42px monospace';c.shadowColor='#a77bff';c.shadowBlur=18;c.fillText('CONTINUARÁ...',W/2,H/2);c.restore();
 }
 if(a.stage==='awakening'){
  const fade=1-Math.min(1,a.time/1.35);
  if(fade>0){c.save();c.globalAlpha=fade;box(c,p.ink,0,0,W,H);c.restore();}
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
  }else if(im && s.specialAnim>0){c.save();c.translate(player.x,player.y);c.scale(player.face,1);specialPose(c,im.specialFrames,SPECIAL_ATTACK_ANIM_DURATION-s.specialAnim,0,0,86);c.restore();}
  else if(im && player.roll>0){c.save();c.translate(player.x,player.y);c.scale(player.rollFace,1);pose(c,im.ship.roll,Math.min(5,Math.floor((1-player.roll/SHIP.rollTime)*6)),6,0,0,86);c.restore();}
  else if(im && !(player.hurt>0&&Math.floor(player.hurt*20)%2))sprite(c,im.player,player.x,player.y,86,player.face,player.walk,player.crouch);
  if(im && player.roll===0 && player.armed>0 && !['reunion','alien','speech','attack','fade','jets','aftermath'].includes(s.phase)) {c.save();c.translate(player.x+player.face*18-4,player.y-(player.crouch?35:48));c.scale(player.face,1);drawTrimmed(c,im.gun,0,0,17,6);c.restore();if(player.flash>0)oval(c,p.gold,player.x+player.face*34,player.y-46,8,5);}
  if(s.phase==='crash'&&s.u.vis)drawUfoCrashTrail(c,s,p);
  if(s.phase==='aftermath'&&im){ufo(c,{...s,phase:'arrive'},p);drawUfoWreckage(c,s,p);military(c,s,im.chapter);}
  if(s.u.vis && !['boom','over'].includes(s.phase)){
   ufo(c,s,p);
   if(['arrive','reunion','alien','speech','attack','jets','fade'].includes(s.phase))drawUfoWreckage(c,s,p);
  }
 if(s.phase==='jets'&&s.ufoHits>0){c.save();for(let i=0;i<7;i++){const pulse=(s.t*2+i*.8)%3;c.globalAlpha=.45+(pulse/3)*.35;oval(c,p.smoke,s.u.x+Math.sin(i*2+s.t)*28,s.u.y-18-pulse*22,10+pulse*5,13+pulse*7);oval(c,i%2?p.gold:p.red,s.u.x+Math.sin(i*3+s.t*3)*24,s.u.y+Math.cos(i*4)*8,7+pulse*3,11+pulse*4);}c.restore();}
 if(['boom','over'].includes(s.phase)){box(c,p.metal,s.u.x-40,GROUND-12,35,12);box(c,p.ink,s.u.x+10,GROUND-9,25,9);}
   if(im && ['alien','speech','attack','fade','jets'].includes(s.phase))alien(c,s,im.alienFrames);
  if(s.phase==='jets'&&s.alienHit)drawAlienDespawnBeam(c,s,p);
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
 for(const b of s.shots) {if(b.kind==='special'){if(im&&(b.delay??0)<=0)drawSpecialProjectile(c,im.specialProjectileFrames,b,s.t);}else if(b.kind==='stone'){oval(c,p.stone,b.x,b.y,5,4);box(c,p.light,b.x-2,b.y-2,2,1);}else {c.strokeStyle=p.ice;c.lineWidth=3;c.beginPath();c.moveTo(b.x,b.y);c.lineTo(b.x-b.vx*.012,b.y-b.vy*.012);c.stroke();}}
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
 if(im)drawCombatTips(c,s,im);
}
