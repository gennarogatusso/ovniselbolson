import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair, Hand, Maximize, Minimize, Pause, Play, RotateCcw, Volume2, VolumeX, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import mountain from '@/assets/piltriquitron-cartoon.png.asset.json';
import player from '@/assets/personaje-juego.png.asset.json';
import cat from '@/assets/gato-juego.png.asset.json';
import alien from '@/assets/alien-rise.png.asset.json';
import reunion from '@/assets/cat-reunion.png.asset.json';
import { W, H, ENDINGS, CINEMATIC, canAskHelp, newState, newIntroState, introAction, interactIntro, chapterAction, interactChapter, closeComputer, forestIsFree, roomIsFree, shipIsFree, shipIsCombat, respawnAtShipCheckpoint, respawnAtSoldierCheckpoint, respawnAtAgentCheckpoint, canSkipOpeningScene, skipOpeningScene, canSkipAftermathScene, skipAftermathScene, update, triggerSpecial, triggerCatUltimate, triggerAgentUltimate, CAT_ULTIMATE_READY_DELAY, type Ending, type Screen } from './game-engine';
import { draw, type GameImages, type Palette, type CrossRiseFrame, type CrossRiseFrames } from './game-renderer';

import { GameComputer } from './GameComputer';
import { GameAudio } from './game-audio';
import greyArt from '@/assets/ship-grey.png.asset.json';
import pickupArt from '@/assets/ship-pickup.png.asset.json';
import pushArt from '@/assets/ship-push.png.asset.json';
import rollArt from '@/assets/ship-roll.png.asset.json';
import contemplateArt from '@/assets/ship-contemplate.png.asset.json';
import shipCatArt from '@/assets/ship-cat.png.asset.json';
import weaponArt from '@/assets/ship-weapon.png.asset.json';
import labArt from '@/assets/ship-laboratory.jpg.asset.json';
import mainArt from '@/assets/ship-main.jpg.asset.json';
import crossArt from '@/assets/ship-cross.jpg.asset.json';

import awkaBuilding from '@/assets/awka-building.png.asset.json';
import awkaMountain from '@/assets/awka-mountain.png.asset.json';
import awkaSeated from '@/assets/awka-seated.png.asset.json';
import awkaBeer from '@/assets/awka-beer.png.asset.json';
import awkaDrink from '@/assets/awka-drink.png.asset.json';
import awkaSmokeIn from '@/assets/awka-smoke-in.png.asset.json';
import awkaSmokeOut from '@/assets/awka-smoke-out.png.asset.json';
import awkaRise from '@/assets/awka-rise.png.asset.json';
import awkaCat from '@/assets/awka-cat.png.asset.json';
import truckArt from '@/assets/military-truck.png.asset.json';
import trumpArt from '@/assets/trump.png.asset.json';
import mileiArt from '@/assets/milei.png.asset.json';
import argArt from '@/assets/soldier-arg.png.asset.json';
import usaArt from '@/assets/soldier-usa.png.asset.json';
import roomArt from '@/assets/bedroom.png.asset.json';
import eatingArt from '@/assets/cat-eating.png.asset.json';
import sleepingArt from '@/assets/player-sleeping.png.asset.json';
import darkArt from '@/assets/bedroom-dark.jpg.asset.json';
import walkArt from '@/assets/room-walk.png.asset.json';
import upArt from '@/assets/room-up.png.asset.json';
import downArt from '@/assets/room-down.png.asset.json';
import runArt from '@/assets/forest-run.png.asset.json';
import restArt from '@/assets/cat-rest.png.asset.json';
import forestArt from '@/assets/forest-background.jpg.asset.json';
import deerArt from '@/assets/forest-deer.png.asset.json';
import shipArt from '@/assets/forest-ufo.png.asset.json';

type PreparedSpecialSprite = { image: HTMLImageElement; anchorX: number; baseY: number; bodyHeight: number };

function prepareTransparentSprite(source: HTMLImageElement, sourceX=0, regionWidth=source.naturalWidth): Promise<PreparedSpecialSprite> {
 const width=Math.max(1,Math.min(regionWidth,source.naturalWidth-sourceX)),height=source.naturalHeight;
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const context=canvas.getContext('2d',{willReadFrequently:true});
 const fallback={image:source,anchorX:width/2,baseY:height,bodyHeight:height};
 if(!context)return Promise.resolve(fallback);
 context.drawImage(source,sourceX,0,width,height,0,0,width,height);
 const frame=context.getImageData(0,0,width,height),pixels=frame.data,total=width*height,removed=new Uint8Array(total),queue=new Int32Array(total);
 const nearWhite=(index:number)=>{const offset=index*4,r=pixels[offset]??0,g=pixels[offset+1]??0,b=pixels[offset+2]??0,min=Math.min(r,g,b),max=Math.max(r,g,b);return min>214&&max-min<42;};
 let tail=0,head=0;
 const seed=(index:number)=>{if(index>=0&&index<total&&!removed[index]&&nearWhite(index)){removed[index]=1;queue[tail++]=index;}};
 for(let x=0;x<width;x++){seed(x);seed((height-1)*width+x);}
 for(let y=0;y<height;y++){seed(y*width);seed(y*width+width-1);}
 while(head<tail){
  const index=queue[head++]!,x=index%width,y=Math.floor(index/width);
  if(x>0)seed(index-1);if(x<width-1)seed(index+1);if(y>0)seed(index-width);if(y<height-1)seed(index+width);
 }
 for(let index=0;index<total;index++)if(removed[index])pixels[index*4+3]=0;
 // Reduce the one-pixel pale fringe left by JPEG compression without erasing enclosed white highlights.
 for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
  const index=y*width+x;if(removed[index])continue;
  let edge=false;for(let oy=-1;oy<=1&&!edge;oy++)for(let ox=-1;ox<=1;ox++)if(removed[(y+oy)*width+x+ox]){edge=true;break;}
  if(!edge)continue;
  const offset=index*4,r=pixels[offset]??0,g=pixels[offset+1]??0,b=pixels[offset+2]??0,min=Math.min(r,g,b),max=Math.max(r,g,b),brightness=(r+g+b)/3;
  if(min>170&&max-min<62){const fringe=Math.max(0,Math.min(.9,(brightness-170)/82));pixels[offset+3]=Math.round((pixels[offset+3]??255)*(1-fringe));}
 }
 let left=width,right=-1,top=height,bottom=-1,bodyLeft=width,bodyRight=-1,bodyTop=height,bodyBottom=-1;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const index=y*width+x,offset=index*4,alpha=pixels[offset+3]??0;if(alpha>10){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  const r=pixels[offset]??255,g=pixels[offset+1]??255,b=pixels[offset+2]??255;
  if(alpha>24&&r<112&&g<112&&b<138){bodyLeft=Math.min(bodyLeft,x);bodyRight=Math.max(bodyRight,x);bodyTop=Math.min(bodyTop,y);bodyBottom=Math.max(bodyBottom,y);}
 }
 if(right<left||bottom<top)return Promise.resolve(fallback);
 const padding=3,cropWidth=right-left+1,cropHeight=bottom-top+1,output=document.createElement('canvas');
 output.width=cropWidth+padding*2;output.height=cropHeight+padding*2;
 const out=output.getContext('2d');if(!out)return Promise.resolve(fallback);
 context.putImageData(frame,0,0);out.imageSmoothingEnabled=false;out.drawImage(canvas,left,top,cropWidth,cropHeight,padding,padding,cropWidth,cropHeight);
 const hasBody=bodyRight>=bodyLeft&&bodyBottom>=bodyTop;
 const prepared={anchorX:hasBody?(bodyLeft+bodyRight)/2-left+padding:output.width/2,baseY:hasBody?bodyBottom-top+padding:output.height,bodyHeight:hasBody?bodyBottom-bodyTop+1:output.height};
 return new Promise(resolve=>{const image=new Image();image.onload=()=>resolve({...prepared,image});image.onerror=()=>resolve(fallback);image.src=output.toDataURL('image/png');});
}


async function prepareSwordAttackSprites(sources:HTMLImageElement[]):Promise<PreparedSpecialSprite[]>{
 const cleaned=await Promise.all(sources.map(source=>prepareTransparentSprite(source)));
 const bounds=cleaned.map(({image,anchorX,baseY,bodyHeight})=>{
  const width=image.naturalWidth,height=image.naturalHeight,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return {image,left:anchorX,right:anchorX,bottom:baseY,height:bodyHeight};
  context.drawImage(image,0,0);const pixels=context.getImageData(0,0,width,height).data,mask=new Uint8Array(width*height),visited=new Uint8Array(width*height),queue=new Int32Array(width*height);
  for(let i=0;i<width*height;i++){const o=i*4,a=pixels[o+3]??0,r=pixels[o]??255,g=pixels[o+1]??255,b=pixels[o+2]??255;if(a>28&&Math.max(r,g,b)<158&&Math.max(r,g,b)-Math.min(r,g,b)<58)mask[i]=1;}
  let best={left:width,right:-1,top:height,bottom:-1,area:0};
  for(let seed=0;seed<mask.length;seed++){if(!mask[seed]||visited[seed])continue;let head=0,tail=0,left=width,right=-1,top=height,bottom=-1;queue[tail++]=seed;visited[seed]=1;
   while(head<tail){const index=queue[head++]!,x=index%width,y=Math.floor(index/width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){if(!ox&&!oy)continue;const nx=x+ox,ny=y+oy;if(nx<0||nx>=width||ny<0||ny>=height)continue;const next=ny*width+nx;if(mask[next]&&!visited[next]){visited[next]=1;queue[tail++]=next;}}
   }
   if(tail>best.area&&bottom-top+1>=height*.2)best={left,right,top,bottom,area:tail};
  }
  if(best.area===0)return {image,left:anchorX,right:anchorX,bottom:baseY,height:bodyHeight};
  return {image,left:best.left,right:best.right,bottom:best.bottom,height:best.bottom-best.top+1};
 });
 // Todos los cuadros comparten la misma escala y la misma línea de suelo.
 const referenceHeight=Math.max(...bounds.map(frame=>frame.height)),scale=112/Math.max(1,referenceHeight),frameWidth=560,frameHeight=320,anchorX=280,baseY=300;
 return Promise.all(bounds.map(frame=>{const normalized=document.createElement('canvas');normalized.width=frameWidth;normalized.height=frameHeight;const out=normalized.getContext('2d');
  if(!out)return {image:frame.image,anchorX:frame.image.naturalWidth/2,baseY:frame.image.naturalHeight,bodyHeight:frame.height};
  out.imageSmoothingEnabled=false;const center=(frame.left+frame.right)/2;out.drawImage(frame.image,anchorX-center*scale,baseY-frame.bottom*scale,frame.image.naturalWidth*scale,frame.image.naturalHeight*scale);
  return new Promise<PreparedSpecialSprite>(resolve=>{const preparedImage=new Image();preparedImage.onload=()=>resolve({image:preparedImage,anchorX,baseY,bodyHeight:112});preparedImage.onerror=()=>resolve({image:frame.image,anchorX:frame.image.naturalWidth/2,baseY:frame.image.naturalHeight,bodyHeight:frame.height});preparedImage.src=normalized.toDataURL('image/png');});
 }));
}
function prepareCrossRiseFrames(source:HTMLImageElement):CrossRiseFrames {
 const empty:CrossRiseFrames={player:[],cat:[]};
 const width=source.naturalWidth,height=source.naturalHeight,total=width*height;
 if(!width||!height)return empty;
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return empty;
 try{
  context.drawImage(source,0,0);
  const pixels=context.getImageData(0,0,width,height).data;
  const visited=new Uint8Array(total),queue=new Int32Array(total);
  const components:{x:number;y:number;width:number;height:number;area:number;centerY:number}[]=[];
  const alphaThreshold=8,minArea=Math.max(1200,Math.floor(total*.001));
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const start=y*width+x;
   if(visited[start]||pixels[start*4+3]<=alphaThreshold)continue;
   let head=0,tail=0,minX=x,maxX=x,minY=y,maxY=y;
   visited[start]=1;queue[tail++]=start;
   while(head<tail){
    const index=queue[head++]!,px=index%width,py=Math.floor(index/width);
    minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);
    for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){
     if(ox===0&&oy===0)continue;
     const nx=px+ox,ny=py+oy;if(nx<0||nx>=width||ny<0||ny>=height)continue;
     const next=ny*width+nx;
     if(!visited[next]&&pixels[next*4+3]>alphaThreshold){visited[next]=1;queue[tail++]=next;}
    }
   }
   if(tail>=minArea)components.push({x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1,area:tail,centerY:(minY+maxY)/2});
  }
  if(components.length<12)return empty;
  const selected=components.sort((a,b)=>b.area-a.area).slice(0,12).sort((a,b)=>a.centerY-b.centerY);
  const crop=(part:typeof selected[number]):CrossRiseFrame=>{
   const padding=3,frame=document.createElement('canvas');
   frame.width=part.width+padding*2;frame.height=part.height+padding*2;
   const frameContext=frame.getContext('2d');if(!frameContext)throw new Error('No se pudo crear un cuadro de la animación');
   frameContext.imageSmoothingEnabled=false;
   frameContext.drawImage(source,part.x,part.y,part.width,part.height,padding,padding,part.width,part.height);
   return {image:frame,bodyWidth:part.width,bodyHeight:part.height,padding};
  };
  const playerParts=selected.slice(0,6).sort((a,b)=>a.x-b.x);
  const catParts=selected.slice(6,12).sort((a,b)=>a.x-b.x);
  return {player:playerParts.map(crop),cat:catParts.map(crop)};
 }catch(error){
  console.warn('No se pudieron separar los cuadros de levantarse en La Cruz',error);
  return empty;
 }
}

const LOADING_PHRASES = [
  'Cargando Cerro Piltriquitron',
  'Cargando OVNIS de El Bolsón',
  'Cargando Awka',
  'Cargando Cerro La Cruz',
  'Cargando Extraterrestres',
];

export function UfoGame() {
 const cv=useRef<HTMLCanvasElement>(null), host=useRef<HTMLDivElement>(null), st=useRef(newState()), images=useRef<GameImages|null>(null), palette=useRef<Palette|null>(null);
 const [screen,setScreen]=useState<Screen>('title'), [ending,setEnding]=useState<Ending|null>(null), [touch,setTouch]=useState(false),[expanded,setExpanded]=useState(false),[nativeFullscreen,setNativeFullscreen]=useState(false),[loading,setLoading]=useState(true),[loadingProgress,setLoadingProgress]=useState(0),[loadingPhrase,setLoadingPhrase]=useState('Cargando Cerro Piltriquitrón'),[assetError,setAssetError]=useState(false),[context,setContext]=useState(false),[combat,setCombat]=useState(false);
 const [action,setAction]=useState<string|null>(null), [intro,setIntro]=useState(false), [freeRoom,setFreeRoom]=useState(false), [specialCooldown,setSpecialCooldown]=useState(0),[catUltimateUsed,setCatUltimateUsed]=useState(false),[catUltimateReady,setCatUltimateReady]=useState(false),[agentMana,setAgentMana]=useState(0),[agentUltimateReady,setAgentUltimateReady]=useState(false);
 const [skipScene,setSkipScene]=useState<'opening'|'aftermath'|null>(null);
 const audio=useRef<GameAudio|null>(null);
 const [computer,setComputer]=useState(false),[creditsOpen,setCreditsOpen]=useState(false),[controlsOpen,setControlsOpen]=useState(false);
 const [masterVolume,setMasterVolume]=useState(.8),[volumeOpen,setVolumeOpen]=useState(false);
 const screenRef=useRef(screen);screenRef.current=screen;
 useEffect(()=>{
  if(!loading)return;
  const choosePhrase=()=>setLoadingPhrase(current=>{
   const alternatives=LOADING_PHRASES.filter(phrase=>phrase!==current);
   return alternatives[Math.floor(Math.random()*alternatives.length)]??LOADING_PHRASES[0]!;
  });
  choosePhrase();
  const interval=window.setInterval(choosePhrase,1900);
  return()=>window.clearInterval(interval);
 },[loading]);
 useEffect(()=>{
  const mq=window.matchMedia('(pointer: coarse)');const changed=()=>setTouch(mq.matches||navigator.maxTouchPoints>0);const pointerSeen=(event:globalThis.PointerEvent)=>{if(event.pointerType==='touch')setTouch(true);};changed();mq.addEventListener('change',changed);window.addEventListener('pointerdown',pointerSeen,{passive:true});
  const readPalette=()=>{if(!host.current)return;const css=getComputedStyle(host.current);const colors={} as Palette;for(const key of ['turquoise','sky','rose','gold','sunset','light','ice','panel','ink','forest','trunk','wall','roof','leaf','road','curb','lane','shadow','hill','metal','glass','laser','smoke','stone','skin','red','alien','energy'] as const)colors[key]=css.getPropertyValue('--game-'+key).trim();palette.current=colors;};readPalette();
  let loadPhase:'base'|'armed'|'restaurant'|'sureste'='base',baseLoaded=0,baseTotal=0,armedLoaded=0,armedTotal=0,finishLoadingTimer:number|undefined,progressUpdateTimer:number|undefined,pendingProgress=0,lastProgressUpdate=0;let active=true;
  const reportProgress=(value:number,immediate=false)=>{pendingProgress=Math.max(pendingProgress,value);if(immediate){if(progressUpdateTimer!==undefined)window.clearTimeout(progressUpdateTimer);progressUpdateTimer=undefined;lastProgressUpdate=Date.now();setLoadingProgress(pendingProgress);return;}if(progressUpdateTimer!==undefined)return;const delay=Math.max(0,100-(Date.now()-lastProgressUpdate));progressUpdateTimer=window.setTimeout(()=>{progressUpdateTimer=undefined;if(active){lastProgressUpdate=Date.now();setLoadingProgress(pendingProgress);}},delay);};
  const load=(url:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{if(loadPhase==='base')baseTotal++;else if(loadPhase==='armed')armedTotal++;const i=new Image();i.crossOrigin='anonymous';i.onload=()=>{if(active){if(loadPhase==='base'){baseLoaded++;reportProgress(Math.min(72,Math.round(baseLoaded/Math.max(1,baseTotal)*72)));}else if(loadPhase==='armed'){armedLoaded++;reportProgress(82+Math.round(armedLoaded/Math.max(1,armedTotal)*10));}else reportProgress(99);}resolve(i);};i.onerror=()=>reject(new Error('No se pudo cargar '+url));i.src=url;});
    Promise.all([load(mountain.url),load(player.url),load(cat.url),load(alien.url),load(reunion.url),load('/imagens/imagem-cb85a873.png'),load('/imagens/imagem-4233f6e4.png'),load('/imagens/imagem-3241014a.png'),load('/imagens/imagem-97d3754a.png'),load('/imagens/imagem-2fed5c3b.webp'),load('/imagens/imagem-499d0608.png'),load('/imagens/imagem-28e06bb0.webp'),load('/imagens/imagem-debb83e3.webp'),load('/imagens/imagem-63fa9a4e.webp'),load(awkaBuilding.url),load(awkaMountain.url),load(awkaSeated.url),load(awkaBeer.url),load(awkaDrink.url),load(awkaSmokeIn.url),load(awkaSmokeOut.url),load(awkaRise.url),load(awkaCat.url),load(truckArt.url),load(trumpArt.url),load(mileiArt.url),load(argArt.url),load(usaArt.url),load(roomArt.url),load(eatingArt.url),load(sleepingArt.url),load(darkArt.url),load(walkArt.url),load(upArt.url),load(downArt.url),load(runArt.url),load(restArt.url),load(forestArt.url),load(deerArt.url),load(shipArt.url),load(greyArt.url),load(pickupArt.url),load(pushArt.url),load(rollArt.url),load(contemplateArt.url),load(shipCatArt.url),load(weaponArt.url),load(labArt.url),load(mainArt.url),load(crossArt.url),load('/imagens/la%20cruz%20plano.png'),load('/imagens/bosque%20despues%20de%20la%20cruz.png'),load('/imagens/sendero%20alejandose%20de%20la%20cruz.png'),load('/imagens/caminando%20hacia%20abajo%20secuencia%20de%20imagenes.png'),load('/imagens/Base%20secreta%20bajo%20la%20luna%20llena.png'),load('/imagens/soldado%20cubriendose.png'),load('/imagens/soldado%20disparando%20bazooka.png'),load('/imagens/soldados%20avanzando.png'),load('/imagens/soldados%20cubriendose%20de%20disparo.png'),load('/imagens/soldados%20cubriendose%20y%20disparando.png'),load('/imagens/soldados%20disparando%20desde%20el%20suelo.png'),load('/imagens/1a.png'),load('/imagens/2a.png'),load('/imagens/3a.png'),load('/imagens/4a.png'),load('/imagens/5a.png'),load('/imagens/6a.png'),load('/imagens/7a.png'),load('/imagens/8a.png'),load('/imagens/9a.png'),load('/imagens/gato%20volando%20en%20el%20aire.png'),load('/imagens/arbol.png'),load('/imagens/1.jpg'),load('/imagens/2.jpg'),load('/imagens/3.jpg'),load('/imagens/4.jpg'),load('/imagens/5.jpg'),load('/imagens/6.jpg'),load('/imagens/7.jpg'),load('/imagens/bola%20violeta.jpg'),load('/imagens/consejo%201.png'),load('/imagens/consejo%202.png'),load('/imagens/acostado%20en%20el%20ovni.png'),load('/imagens/PERSONAJE%20POR%20DORMIRSE%20%20Y%20POR%20LEVANTARSE%20corregido.png'),load('/imagens/abduccion%201.png'),load('/imagens/abduccion%202.png'),load('/imagens/abduccion%203.png'),load('/imagens/levantandose%20despues%20de%20la%20cruz.png'),load('/imagens/gato%20caminando%20bosque%201.png'),load('/imagens/gato%20caminando%20bosque%202.png'),load('/imagens/gato%20caminando%20bosque%203.png'),load('/imagens/escenario%20espada.png'),load('/imagens/espada.png'),load('/imagens/agarrando%20la%20espada%201.png'),load('/imagens/agarrando%20la%20espada%202.png'),load('/imagens/agarrando%20la%20espada%203.png'),load('/imagens/agarrando%20la%20espada%204.png'),load('/imagens/agarrando%20la%20espada%205.png'),load('/imagens/1ataque%20primario.png'),load('/imagens/2ataque%20primario.png'),load('/imagens/3ataque%20primario.png'),load('/imagens/4ataque%20primario.png'),load('/imagens/5ataqueprimario.png'),load('/imagens/6ataqueprimario.png'),load('/imagens/7%20ataque%20primario.png'),load('/imagens/8%20ataque%20primario.png'),load('/imagens/caminando%20con%20espada%201.png'),load('/imagens/caminando%20con%20espada%202.png'),load('/imagens/caminando%20con%20espada%203.png'),load('/imagens/caminando%20con%20espada%204.png'),load('/imagens/caminando%20con%20espada%205.png'),load('/imagens/agente%20secreto.png'),load('/imagens/agente%20secreto%20caminando.png'),load('/imagens/agente%20secreto%20apuntando.png'),load('/imagens/agentre%20secreto%20escudo.png'),load('/imagens/agentre%20secreto%20escudo%202.png'),load('/imagens/ULTI%200.png'),load('/imagens/ulti%201.png'),load('/imagens/ulti%202.png'),load('/imagens/ULTI%203.png'),load('/imagens/ULTI%204.png'),load('/imagens/ULTI%205.png'),load('/imagens/ULTI%206.png'),load('/imagens/ULTI%207.png'),load('/imagens/ULTI%208.png'),load('/imagens/ULTI%209.png'),load('/imagens/soldado%20incinerado.png')] as const).then(async ([mountain,player,cat,alien,reunion,alien1,alien2,alien3,alien4,fighter,gun,ally1,ally2,house,building,introMountain,seated,beer,drink,smokeIn,smokeOut,rise,introCat,truck,trump,milei,arg,usa,bedroom,eating,sleeping,dark,walk,up,down,run,restingCat,forest,deer,ship,grey,pickup,push,roll,contemplate,shipCat,weapon,laboratory,main,cross,roadCross,afterCross,trailBackground,walkDownSequence,secretBaseBackground,soldierCover,soldierBazooka,soldierAdvance,soldierUnderFire,soldierShieldFire,soldierProneFire,catUltimateFrame1,catUltimateFrame2,catUltimateFrame3,catUltimateFrame4,catUltimateFrame5,catUltimateFrame6,catUltimateFrame7,catUltimateFrame8,catUltimateFrame9,catFlying,tree,special1,special2,special3,special4,special5,special6,special7,specialBall,consejo1,consejo2,shipLying,correctedWaking,abduction1,abduction2,abduction3,crossRiseSheet,trailCat1,trailCat2,trailCat3,swordScene,swordGround,swordPickup1,swordPickup2,swordPickup3,swordPickup4,swordPickup5,swordAttack1,swordAttack2,swordAttack3,swordAttack4,swordAttack5,swordAttack6,swordAttack7,swordAttack8,swordWalk1,swordWalk2,swordWalk3,swordWalk4,swordWalk5,secretAgent,secretAgentWalk,secretAgentAim,secretAgentShield,secretAgentShieldAlt,ultimate0,ultimate1,ultimate2,ultimate3,ultimate4,ultimate5,ultimate6,ultimate7,ultimate8,ultimate9,incineratedSoldier])=>{if(!active)return;const [catUltimateFrames,catFlyingPrepared,abduction1Prepared,abduction2Prepared,abduction3Prepared]=await Promise.all([Promise.all([catUltimateFrame1,catUltimateFrame2,catUltimateFrame3,catUltimateFrame4,catUltimateFrame5,catUltimateFrame6,catUltimateFrame7,catUltimateFrame8,catUltimateFrame9].map(frame=>prepareTransparentSprite(frame))),prepareTransparentSprite(catFlying),prepareTransparentSprite(abduction1),prepareTransparentSprite(abduction2),prepareTransparentSprite(abduction3)]);reportProgress(74);const specialFrames=await Promise.all([special1,special2,special3,special4,special5,special6,special7].map(source=>prepareTransparentSprite(source)));reportProgress(76);const half=Math.floor(specialBall.naturalWidth/2);const specialProjectileFrames=await Promise.all([prepareTransparentSprite(specialBall,0,half),prepareTransparentSprite(specialBall,half,specialBall.naturalWidth-half)]);reportProgress(78);const crossRiseFrames=prepareCrossRiseFrames(crossRiseSheet);reportProgress(79);const trailCatFrames=await Promise.all([trailCat1,trailCat2,trailCat3].map(async frame=>(await prepareTransparentSprite(frame)).image)) as [HTMLImageElement,HTMLImageElement,HTMLImageElement];const preparedSwordGround=await prepareTransparentSprite(swordGround);reportProgress(80);const swordPickupFrames=await Promise.all([swordPickup1,swordPickup2,swordPickup3,swordPickup4,swordPickup5].map(async frame=>(await prepareTransparentSprite(frame)).image)) as [HTMLImageElement,HTMLImageElement,HTMLImageElement,HTMLImageElement,HTMLImageElement];reportProgress(81);const swordAttackFrames=await prepareSwordAttackSprites([swordAttack1,swordAttack2,swordAttack3,swordAttack4,swordAttack5,swordAttack6,swordAttack7,swordAttack8]);const burnedSoldierPrepared=await prepareTransparentSprite(incineratedSoldier);const swordWalkFrames=await Promise.all([swordWalk1,swordWalk2,swordWalk3,swordWalk4,swordWalk5].map(async frame=>(await prepareTransparentSprite(frame)).image)) as [HTMLImageElement,HTMLImageElement,HTMLImageElement,HTMLImageElement,HTMLImageElement];const [secretAgentPrepared,secretAgentWalkPrepared,secretAgentAimPrepared,secretAgentShieldPrepared,secretAgentShieldAltPrepared]=await Promise.all([secretAgent,secretAgentWalk,secretAgentAim,secretAgentShield,secretAgentShieldAlt].map(async source=>(await prepareTransparentSprite(source)).image));const agentUltimateFrames=await Promise.all([ultimate0,ultimate1,ultimate2,ultimate3,ultimate4,ultimate5,ultimate6,ultimate7,ultimate8,ultimate9].map(source=>prepareTransparentSprite(source)));reportProgress(82);loadPhase='armed';
 const armedSources=await Promise.all([
  '/imagens/caminando1.png','/imagens/caminando2.png','/imagens/caminando3.png','/imagens/caminando4.png','/imagens/caminando5.png',
  '/imagens/caminando%20y%20disparando%201.png','/imagens/caminando%20y%20disparando%202.png','/imagens/caminando%20y%20disparando%203.png','/imagens/caminando%20y%20disparando%204.png','/imagens/caminando%20y%20disparando%205.png','/imagens/caminando%20y%20disparando%206.png','/imagens/caminando%20y%20disparando%207.png'
 ].map(load));
 const armedFrames=await prepareSwordAttackSprites(armedSources);reportProgress(96);
 const armedPlayer={
  idle:armedFrames[0]!,
  walk:[armedFrames[1]!,armedFrames[9]!,armedFrames[2]!,armedFrames[10]!,armedFrames[4]!,armedFrames[11]!,armedFrames[3]!,armedFrames[9]!],
  aim:[armedFrames[7]!,armedFrames[8]!,armedFrames[3]!,armedFrames[4]!],
  fire:[armedFrames[5]!,armedFrames[6]!]
 };
 loadPhase='restaurant';const restaurantSource=await load('/imagens/restaurante.png').catch(()=>null);reportProgress(99);
  loadPhase='sureste';const suresteImage=(await load('/imagens/sureste.png').catch(()=>null))??undefined;reportProgress(99);
 let restaurantImage:HTMLImageElement|undefined;
 if(restaurantSource){
  try{restaurantImage=(await prepareTransparentSprite(restaurantSource)).image;}
  catch{restaurantImage=restaurantSource;}
 }
 if(!active)return;
 images.current={ship:{grey,pickup,push,roll,contemplate,cat:shipCat,weapon,laboratory,main,cross,road:roadCross,afterCross,trail:trailBackground,walkDown:walkDownSequence,base:secretBaseBackground,swordScene,swordGround:preparedSwordGround.image,swordPickupFrames,swordAttackFrames,swordWalkFrames,secretAgent:secretAgentPrepared,secretAgentWalk:secretAgentWalkPrepared,secretAgentAim:secretAgentAimPrepared,secretAgentShield:secretAgentShieldPrepared,secretAgentShieldAlt:secretAgentShieldAltPrepared,agentUltimateFrames,burnedSoldier:burnedSoldierPrepared.image,soldiers:{cover:soldierCover,bazooka:soldierBazooka,advancing:soldierAdvance,underFire:soldierUnderFire,shieldFire:soldierShieldFire,proneFire:soldierProneFire},catThrow:catUltimateFrames.map(frame=>frame.image),catFlying:catFlyingPrepared.image,lying:shipLying,crossRiseFrames,trailCat:trailCatFrames},chapter:{truck,trump,milei,arg,usa,bedroom,eating,sleeping,waking:correctedWaking,dark,walk,up,down,run,restingCat,forest,deer,ship,abduction:[abduction1Prepared.image,abduction2Prepared.image,abduction3Prepared.image]},specialFrames,specialProjectileFrames:[specialProjectileFrames[0].image,specialProjectileFrames[1].image],combatTips:[consejo1,consejo2],mountain,player,cat,alien,reunion,fighter,gun,armedPlayer,allies:[ally1,ally2],house,tree,restaurant:restaurantImage,sureste:suresteImage,alienFrames:[alien1,alien2,alien3,alien4],intro:{building,mountain:introMountain,seated,beer,drink,smokeIn,smokeOut,rise,cat:introCat}};reportProgress(100,true);finishLoadingTimer=window.setTimeout(()=>{if(active)setLoading(false);},60);}).catch(()=>{if(active){setAssetError(true);setLoading(false);}});
  return()=>{active=false;if(finishLoadingTimer!==undefined)window.clearTimeout(finishLoadingTimer);if(progressUpdateTimer!==undefined)window.clearTimeout(progressUpdateTimer);audio.current?.close();mq.removeEventListener('change',changed);window.removeEventListener('pointerdown',pointerSeen);};
 },[]);
 useEffect(()=>{
  const map:Record<string,string>={a:'l',arrowleft:'l',d:'r',arrowright:'r',w:'j',arrowup:'j',' ':'j',s:'c',arrowdown:'c',e:'e',shift:'roll'};
  const down=(e:KeyboardEvent)=>{if(st.current.chapter.computer)return;const key=e.key.toLowerCase();if(st.current.phase==='spaceship'&&['trailWalk','trailEnd'].includes(st.current.ship.stage)&&key!=='w'&&key!=='escape'){e.preventDefault();return;}if(key==='r'&&screenRef.current==='play'&&!e.repeat){e.preventDefault();if(triggerSpecial(st.current))setSpecialCooldown(5);return;}if(key==='x'&&screenRef.current==='play'&&!e.repeat){e.preventDefault();if(triggerAgentUltimate(st.current)){setAgentMana(0);setAgentUltimateReady(false);return;}if(triggerCatUltimate(st.current)){setCatUltimateUsed(true);setCatUltimateReady(false);}return;}if(key==='escape'){clear();setCreditsOpen(false);setScreen(s=>s==='play'?'paused':s==='paused'?'play':s);return;}if(map[key]&&screenRef.current==='play'){e.preventDefault();st.current.keys[map[key]]=true;}};
  const up=(e:KeyboardEvent)=>{const k=map[e.key.toLowerCase()];if(k)st.current.keys[k]=false;};
  const blur=()=>{clear();setScreen(s=>s==='play'?'paused':s);};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);
  const fs=()=>{const nativeDocument=document as Document & {webkitFullscreenElement?:Element|null};const active=Boolean(document.fullscreenElement||nativeDocument.webkitFullscreenElement);setNativeFullscreen(active);setExpanded(active);};document.addEventListener('fullscreenchange',fs);document.addEventListener('webkitfullscreenchange',fs as EventListener);
  return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);document.removeEventListener('fullscreenchange',fs);document.removeEventListener('webkitfullscreenchange',fs as EventListener);};
 },[]);
 useEffect(()=>{if(screen!=='play'&&!expanded)return;const previousBody=document.body.style.overflow,previousRoot=document.documentElement.style.overflow,previousOverscroll=document.body.style.overscrollBehavior;document.body.style.overflow='hidden';document.documentElement.style.overflow='hidden';document.body.style.overscrollBehavior='none';return()=>{document.body.style.overflow=previousBody;document.documentElement.style.overflow=previousRoot;document.body.style.overscrollBehavior=previousOverscroll;};},[screen,expanded]);
 useEffect(()=>{
  const ctx=cv.current?.getContext('2d');if(!ctx||loading||assetError||!palette.current)return;
  const colors=palette.current;
  ctx.imageSmoothingEnabled=false;let raf=0,last=performance.now(),acc=0;
  const loop=(now:number)=>{const dt=Math.min(.05,(now-last)/1000);last=now;
      try{
    
    if(screen==='play'){ 
     const result=update(st.current,dt);acc+=dt;
     if(acc>.12){acc=0;setComputer(st.current.chapter.computer);setContext(canAskHelp(st.current));setCombat(st.current.phase==='fight'||shipIsCombat(st.current));setSpecialCooldown(st.current.phase==='spaceship'?st.current.ship.specialCd:st.current.specialCd);setCatUltimateUsed(st.current.ship.catUltimateUsed);setCatUltimateReady(st.current.phase==='spaceship'&&st.current.ship.stage==='soldierFight'&&st.current.ship.time>=CAT_ULTIMATE_READY_DELAY&&!st.current.ship.catUltimateUsed&&st.current.ship.soldiers.some(soldier=>soldier.hp>0));setAgentMana(st.current.phase==='spaceship'?st.current.ship.agentMana:0);setAgentUltimateReady(st.current.phase==='spaceship'&&st.current.ship.stage==='agentFight'&&st.current.ship.agentMana>=100);setAction(introAction(st.current)??chapterAction(st.current));setIntro(st.current.phase==='awka'||CINEMATIC.has(st.current.phase)||st.current.phase==='spaceship'&&!shipIsCombat(st.current)&&!shipIsFree(st.current));setFreeRoom(roomIsFree(st.current)||shipIsFree(st.current)||forestIsFree(st.current));setSkipScene(canSkipOpeningScene(st.current)?'opening':canSkipAftermathScene(st.current)?'aftermath':null);}
     if(result==='lose'&&st.current.phase==='spaceship'&&st.current.ship.stage==='combat'){
      respawnAtShipCheckpoint(st.current);setComputer(false);setContext(false);setCombat(false);setAction(null);setIntro(true);setFreeRoom(false);
     }else if(result==='lose'&&st.current.phase==='spaceship'&&st.current.ship.stage==='soldierFight'){
      respawnAtSoldierCheckpoint(st.current);setCatUltimateUsed(false);setCatUltimateReady(false);setComputer(false);setContext(false);setCombat(true);setAction(null);setIntro(false);setFreeRoom(false);
     }else if(result==='lose'&&st.current.phase==='spaceship'&&st.current.ship.stage==='agentFight'){
      respawnAtAgentCheckpoint(st.current);setComputer(false);setContext(false);setCombat(true);setAction(null);setIntro(false);setFreeRoom(false);setSpecialCooldown(0);
     }else if(result){setEnding(result==='win'?'revenge':result==='continue'?(['end','soldierEnd','trailWalk'].includes(st.current.ship.stage)?'cross':st.current.chapter.stage==='complete'?'abduction':'continuation'):null);setScreen(result==='lose'?'lose':'win');}
    }else if(screen!=='paused'&&screen!=='play'){
     // Mantener vivos humo y chispas detrás de las pantallas finales.
     const s=st.current;s.t+=dt;s.fx=s.fx.filter(f=>(f.life-=dt)>0);
     if(s.phase==='over'&&Math.random()<dt*6)s.fx.push({x:s.u.x+(Math.random()-.5)*60,y:st.current.p.y-20,life:1.2,c:'smoke'});
    }
    audio.current?.update(st.current,screen==='play');
     draw(ctx,st.current,images.current,colors);host.current?.setAttribute('data-ship-stage',st.current.ship.stage);host.current?.setAttribute('data-phase',st.current.phase);host.current?.setAttribute('data-ufo-health',String(st.current.u.hp));host.current?.setAttribute('data-intro-stage',st.current.intro.stage);host.current?.setAttribute('data-chapter-stage',st.current.chapter.stage);
   }catch(err){console.error('Error en el juego',err);}
   raf=requestAnimationFrame(loop);
  };raf=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf);
 },[screen,loading,assetError]);
 const start=()=>{setCreditsOpen(false);setControlsOpen(false);setVolumeOpen(false);audio.current??=new GameAudio();try{audio.current.unlock();audio.current.setVolume(masterVolume);audio.current.resetForestAudio();}catch{ /* Audio must never block gameplay. */ }st.current=newIntroState();setSkipScene(null);setComputer(false);setIntro(true);setAction(null);setEnding(null);setContext(false);setCombat(false);setCatUltimateUsed(false);setCatUltimateReady(false);setAgentMana(0);setAgentUltimateReady(false);setScreen('play');};
 const pause=()=>{st.current.keys={};st.current.fire=false;setScreen('paused');};
 const fullscreen=async()=>{const el=host.current as (HTMLDivElement & {webkitRequestFullscreen?:()=>Promise<void>|void})|null;const doc=document as Document & {webkitFullscreenElement?:Element|null;webkitExitFullscreen?:()=>Promise<void>|void;webkitFullscreenEnabled?:boolean};if(!el)return;const active=document.fullscreenElement||doc.webkitFullscreenElement;if(active){try{if(document.exitFullscreen)await document.exitFullscreen();else await doc.webkitExitFullscreen?.();}catch{/* Safari can reject a native fullscreen transition; keep the in-page fallback available. */}return;}if(expanded){setExpanded(false);setNativeFullscreen(false);return;}try{const request=el.requestFullscreen?.bind(el)??el.webkitRequestFullscreen?.bind(el);const enabled=document.fullscreenEnabled??doc.webkitFullscreenEnabled;if(request&&enabled!==false){await request();if(document.fullscreenElement||doc.webkitFullscreenElement){setNativeFullscreen(true);setExpanded(true);return;}}}catch{/* Use the CSS immersive mode when the browser does not allow element fullscreen. */}setNativeFullscreen(false);setExpanded(true);};
  const hold=(k:string)=>({onPointerDown:(e:PointerEvent<HTMLButtonElement>)=>{e.preventDefault();try{e.currentTarget.setPointerCapture(e.pointerId);}catch{/* Pointer capture may be unavailable after cancellation. */}st.current.keys[k]=true;},onPointerUp:()=>{st.current.keys[k]=false;},onPointerCancel:()=>{st.current.keys[k]=false;},onLostPointerCapture:()=>{st.current.keys[k]=false;}});
 const joystickMove=(e:PointerEvent<HTMLDivElement>)=>{if(!e.currentTarget.hasPointerCapture(e.pointerId))return;const r=e.currentTarget.getBoundingClientRect(),dx=(e.clientX-(r.left+r.width/2))/(r.width*.34),dy=(e.clientY-(r.top+r.height/2))/(r.height*.34);st.current.keys.l=dx<-.18;st.current.keys.r=dx>.18;if(roomIsFree(st.current)||forestIsFree(st.current)||st.current.ship.stage==='crossFree'||st.current.ship.stage==='soldierFight'||st.current.ship.stage==='agentFight'||st.current.ship.stage==='soldierExit'){st.current.keys.j=dy<-.25;st.current.keys.c=dy>.25;}};
 const joystickStart=(e:PointerEvent<HTMLDivElement>)=>{e.preventDefault();try{e.currentTarget.setPointerCapture(e.pointerId);}catch{/* Touch may be cancelled by the browser or an orientation change. */}joystickMove(e);};
 const joystickStop=()=>{st.current.keys.l=false;st.current.keys.r=false;st.current.keys.j=false;st.current.keys.c=false;};
 const aim=(e:PointerEvent)=>{if(!shipIsCombat(st.current)||!cv.current)return;const r=cv.current.getBoundingClientRect();st.current.ship.aimX=(e.clientX-r.left)/r.width*W;st.current.ship.aimY=(e.clientY-r.top)/r.height*H;st.current.ship.aimActive=true;};
 const fire=(e:PointerEvent)=>{if(screen!=='play'||!(st.current.phase==='fight'||shipIsCombat(st.current)||['swordEquipped','swordAttack'].includes(st.current.ship.stage)))return;e.preventDefault();try{e.currentTarget.setPointerCapture(e.pointerId);}catch{/* Continue firing even if pointer capture is unavailable. */}if(e.currentTarget===cv.current)aim(e);st.current.fire=true;};
 const controlClass='game-control rounded-full border border-silver/50 bg-background/70 text-foreground touch-none';
 const specialProgress=Math.max(0,Math.min(1,1-specialCooldown/5));
 const specialLabel=specialCooldown>0?Math.ceil(specialCooldown):'R';
 const verticalExplore=roomIsFree(st.current)||forestIsFree(st.current)||st.current.ship.stage==='crossFree';
 const canJump=verticalExplore||st.current.phase==='fight'||st.current.ship.stage==='soldierFight'||st.current.ship.stage==='agentFight';
 const canCrouch=verticalExplore||st.current.phase==='fight';
 return <div ref={host} className={`ufo-game ${expanded?'game-expanded':''}`} data-screen={screen}>
  <div className="game-stage">
   {screen==='title'&&<img className="game-title-background" src="/imagens/menu%20de%20juego.png" alt=""/>}
   <canvas ref={cv} width={W} height={H} aria-label="OVNIS EN EL BOLSÓN, escenario de juego" className="h-full w-full" onPointerDown={e=>{if(e.pointerType==='mouse'&&e.button===0)fire(e);}} onPointerMove={aim} onPointerUp={()=>{st.current.fire=false;}} onPointerCancel={()=>{st.current.fire=false;}} onLostPointerCapture={()=>{st.current.fire=false;}} onContextMenu={e=>e.preventDefault()}/>
   {<div className="absolute right-2 top-2 z-20 flex gap-2">
    {screen==='play'&&<Button size="icon" variant="outline" title="Pausar" aria-label="Pausar" onClick={pause}><Pause/></Button>}
    <div className="game-volume-anchor">
     <Button size="icon" variant="outline" title="Control de volumen" aria-label="Control de volumen" aria-expanded={volumeOpen} aria-controls="game-volume-panel" onClick={()=>setVolumeOpen(open=>!open)}>
      {masterVolume===0?<VolumeX/>:<Volume2/>}
     </Button>
     {volumeOpen&&<div id="game-volume-panel" className="game-volume-panel" role="group" aria-label="Volumen del juego">
      <label htmlFor="ufo-game-volume">VOLUMEN</label>
      <input id="ufo-game-volume" type="range" min="0" max="100" step="1" value={Math.round(masterVolume*100)} aria-label="Volumen del juego" onChange={e=>{const next=Number(e.currentTarget.value)/100;setMasterVolume(next);audio.current?.setVolume(next);}}/>
      <output htmlFor="ufo-game-volume">{Math.round(masterVolume*100)}%</output>
     </div>}
    </div>
    <Button size="icon" variant="outline" title={expanded?'Salir de pantalla completa':'Pantalla completa'} title={expanded?(nativeFullscreen?'Salir de pantalla completa':'Salir del modo ampliado'):'Pantalla completa'} aria-label={expanded?(nativeFullscreen?'Salir de pantalla completa':'Salir del modo ampliado'):'Pantalla completa'} onClick={fullscreen}>{expanded?<Minimize/>:<Maximize/>}</Button>
   </div>}
          {screen==='play'&&!computer&&skipScene==='opening'&&<Button type="button" variant="outline" className="absolute left-1/2 top-14 z-30 -translate-x-1/2 border-white/60 bg-black/75 text-white shadow-lg hover:bg-black/90" onClick={()=>{if(skipOpeningScene(st.current)){setSkipScene(null);setIntro(false);setCombat(true);setContext(false);setAction(null);setFreeRoom(false);setSpecialCooldown(0);}}}>SALTAR ESCENA</Button>}
    {screen==='play'&&!computer&&skipScene==='aftermath'&&<Button type="button" variant="outline" className="absolute left-1/2 top-14 z-30 -translate-x-1/2 border-white/60 bg-black/75 text-white shadow-lg hover:bg-black/90" onClick={()=>{if(skipAftermathScene(st.current)){setSkipScene(null);setIntro(false);setCombat(false);setContext(false);setAction(null);setComputer(false);setFreeRoom(false);}}}>SALTAR ESCENA</Button>}
{screen==='play'&&!computer&&touch&&st.current.ship.stage==='trailWalk'&&<div className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center"><Button className={`${controlClass} game-trail-forward-control pointer-events-auto`} aria-label="Avanzar por el sendero" {...hold('j')}><ArrowUp/><span>W</span></Button></div>}
      {screen==='play'&&!computer&&touch&&(freeRoom||combat||(!intro&&!CINEMATIC.has(st.current.phase)))&&!['trailWalk','trailEnd','agentUltimate','agentUltimateBlast'].includes(st.current.ship.stage)&&<div className={`game-touch game-mobile-layout ${shipIsCombat(st.current)?'game-ship-touch':''} ${combat?'game-combat-layout':''} pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-between px-3`}>
        <div className="game-touch-left pointer-events-auto flex items-end gap-2">
         <div className="game-joystick" role="group" aria-label="Joystick de movimiento" onPointerDown={joystickStart} onPointerMove={joystickMove} onPointerUp={joystickStop} onPointerCancel={joystickStop} onLostPointerCapture={joystickStop}><span className="game-joystick-thumb"/><ArrowLeft className="game-joystick-left"/><ArrowRight className="game-joystick-right"/></div>
         {canCrouch&&<Button className={`${controlClass} game-move-control`} aria-label={freeRoom?"Caminar hacia abajo":"Agacharse"} {...hold('c')}><ArrowDown/></Button>}
        </div>
        <div className="game-touch-right game-action-cluster pointer-events-auto">
         {context&&<Button className={`${controlClass} game-context-control`} aria-label="Pedir ayuda a los pibes" {...hold('e')}><Hand/></Button>}
         {canJump&&<Button className={`${controlClass} game-jump-control pointer-events-auto`} aria-label={freeRoom?"Caminar hacia arriba":"Saltar"} {...hold('j')}><ArrowUp/></Button>}
         {combat&&<Button className={`${controlClass} game-roll-control pointer-events-auto`} aria-label="Rodar" {...hold('roll')}><RotateCcw/></Button>}
         {st.current.ship.stage==='agentFight'&&agentUltimateReady&&<Button className={`${controlClass} game-agent-ultimate-control`} aria-label="Ultimate de la espada · X" title="Ultimate de la espada · X" onClick={()=>{if(triggerAgentUltimate(st.current)){setAgentMana(0);setAgentUltimateReady(false);}}}><span>X</span><small>ESPADA</small></Button>}
         {st.current.ship.stage==='soldierFight'&&<Button className={`${controlClass} game-cat-ultimate-control`} aria-label="Ataque definitivo del gato · X" title="Ataque definitivo del gato · X" disabled={!catUltimateReady||catUltimateUsed} onClick={()=>{if(triggerCatUltimate(st.current)){setCatUltimateUsed(true);setCatUltimateReady(false);}}}><span>X</span></Button>}
         {(combat||['swordEquipped','swordAttack'].includes(st.current.ship.stage))&&<Button className={`${controlClass} game-fire-control pointer-events-auto`} aria-label={st.current.ship.agentCombatActive||st.current.ship.stage==='swordEquipped'||st.current.ship.stage==='swordAttack'?'Atacar con espada':'Disparar'} onPointerDown={fire} onPointerUp={()=>{st.current.fire=false;}} onPointerCancel={()=>{st.current.fire=false;}} onLostPointerCapture={()=>{st.current.fire=false;}}>{st.current.ship.agentCombatActive||st.current.ship.stage==='swordEquipped'||st.current.ship.stage==='swordAttack'?'⚔':<Crosshair/>}</Button>}
        </div>
   </div>}
    {screen==='play'&&!computer&&!touch&&st.current.ship.stage==='agentFight'&&agentUltimateReady&&<Button type="button" variant="outline" className="game-agent-ultimate-hud" aria-label="Ultimate de la espada · X" title="Ultimate de la espada · X" onClick={()=>{if(triggerAgentUltimate(st.current)){setAgentMana(0);setAgentUltimateReady(false);}}}><span>X</span><small>ESPADA</small></Button>}
   {screen==='play'&&!computer&&!touch&&st.current.ship.stage==='soldierFight'&&<Button type="button" variant="outline" className="game-cat-ultimate-hud" aria-label="Ataque definitivo del gato · X" title="Ataque definitivo del gato · X" disabled={!catUltimateReady||catUltimateUsed} onClick={()=>{if(triggerCatUltimate(st.current)){setCatUltimateUsed(true);setCatUltimateReady(false);}}}><span>X</span><small>GATO</small></Button>}
   {screen==='play'&&combat&&!computer&&!['agentUltimate','agentUltimateBlast'].includes(st.current.ship.stage)&&<Button type="button" variant="outline" className="game-special-hud" aria-label={specialCooldown>0?`Ataque especial, disponible en ${Math.ceil(specialCooldown)} segundos`:'Ataque especial disponible · R'} title={specialCooldown>0?`Recargando: ${Math.ceil(specialCooldown)} s`:'Ataque especial · R'} disabled={specialCooldown>0} onClick={()=>{if(triggerSpecial(st.current))setSpecialCooldown(5);}}>
      <svg className="game-special-ring" viewBox="0 0 64 64" aria-hidden="true">
       <circle className="game-special-ring-track" cx="32" cy="32" r="25"/>
       <circle className="game-special-ring-progress" cx="32" cy="32" r="25" strokeDasharray="157.08" strokeDashoffset={157.08*(1-specialProgress)}/>
      </svg>
      <Zap className="game-special-icon" aria-hidden="true"/>
      <span className="game-special-count">{specialLabel}</span>
     </Button>}
   {screen==='play'&&!computer&&action&&<Button className={`game-intro-action ${(freeRoom||shipIsCombat(st.current))&&touch?'game-room-action':''} absolute bottom-3 left-1/2 z-20 -translate-x-1/2`} onClick={()=>{if(st.current.phase==='awka')interactIntro(st.current);else interactChapter(st.current);setAction(null);}}><Hand/>{action}</Button>}
   {screen==='play'&&!computer&&!touch&&context&&<Button className="absolute bottom-4 left-1/2 -translate-x-1/2" onClick={()=>{st.current.keys.e=true;}}><Hand/> PEDIR AYUDA A LOS PIBES · E</Button>}
   {screen==='play'&&computer&&<GameComputer onClose={()=>{closeComputer(st.current);setComputer(false);}}/>}
    {screen==='title'&&<nav className="game-menu" aria-label="Menú principal de UFOCAT">
     <button type="button" className="game-menu-hit game-menu-play" aria-label="Jugar" onClick={start} disabled={loading||assetError}/>
     <button type="button" className="game-menu-hit game-menu-controls" aria-label="Controles" aria-expanded={controlsOpen} aria-controls="game-controls-dialog" onClick={()=>setControlsOpen(true)}>CONTROLES</button>
     <button type="button" className="game-menu-hit game-menu-credits" aria-label="Créditos" onClick={()=>setCreditsOpen(true)}/>
     <Link to="/" className="game-menu-hit game-menu-exit" aria-label="Salir de UFOCAT"/>
     {controlsOpen&&<div className="game-credits-backdrop" onClick={()=>setControlsOpen(false)}>
      <section id="game-controls-dialog" className="game-credits-card game-controls-card" role="dialog" aria-modal="true" aria-labelledby="game-controls-title" onClick={e=>e.stopPropagation()}>
       <div className="game-controls-heading">
        <h2 id="game-controls-title">CONTROLES</h2>
        <button type="button" className="game-controls-dismiss" aria-label="Cerrar controles" onClick={()=>setControlsOpen(false)}><X size={16} aria-hidden="true"/> CERRAR</button>
       </div>
       <div className="game-controls-list">
        <p><kbd>W A S D</kbd><span>Moverse. A/D para los lados; W/S para subir y bajar según la escena.</span></p>
        <p><kbd>W / ESPACIO</kbd><span>Saltar durante la aventura y los combates.</span></p>
        <p><kbd>SHIFT / <RotateCcw aria-hidden="true"/></kbd><span>Rodar para esquivar. En móvil, botón con icono de girar.</span></p>
        <p><kbd>R / <Zap aria-hidden="true"/></kbd><span>Usar la habilidad especial.</span></p>
        <p><kbd>X</kbd><span>Ultimate de la espada en el combate contra agentes (cuando el maná está lleno) y ataque definitivo del gato durante el combate militar.</span></p>
        <p><kbd>E / TAP / <Hand aria-hidden="true"/></kbd><span>Interactuar, aceptar opciones o pedir ayuda.</span></p>
        <p><kbd>CLIC IZQ. / <Crosshair aria-hidden="true"/></kbd><span>Disparar durante los combates. En móvil, botón de disparo.</span></p>
        <p><kbd>JOYSTICK</kbd><span>Moverse en celulares y dispositivos táctiles.</span></p>
       </div>
       <h3>CONTROLES TÁCTILES</h3>
       <div className="game-controls-list">
        <p><kbd>JOYSTICK</kbd><span>Caminar en cualquier dirección cuando la escena lo permite.</span></p>
        <p><kbd>↑ / ↓</kbd><span>Saltar o subir/bajar en escenas de exploración. El botón inferior cambia según la escena.</span></p>
        <p><kbd>DISPARO / ⚔</kbd><span>Mantené presionado para disparar o atacar con espada.</span></p>
        <p><kbd>↻</kbd><span>Rodar para esquivar durante los combates.</span></p>
        <p><kbd>R / X</kbd><span>Habilidad especial y ataque definitivo cuando estén disponibles.</span></p>
        <p><kbd>MANO</kbd><span>Tocar las opciones que aparecen abajo para interactuar o continuar.</span></p>
       </div>
       <button type="button" className="game-credits-close" onClick={()=>setControlsOpen(false)}>VOLVER</button>
      </section>
     </div>}
     {creditsOpen&&<div className="game-credits-backdrop" onClick={()=>setCreditsOpen(false)}>
      <section className="game-credits-card game-credits-panel" role="dialog" aria-modal="true" aria-labelledby="game-credits-title" onClick={e=>e.stopPropagation()}>
       <h2 id="game-credits-title">CRÉDITOS</h2>
       <div className="game-credit-sections">
        <div className="game-credit-section">
         <span className="game-credit-heading">CREACIÓN</span>
         <p className="game-credit-author">Creado por <strong>Gennaro Montecino</strong></p>
        </div>
        <div className="game-credit-section">
         <span className="game-credit-heading">IMÁGENES, EFECTOS Y ANIMACIONES</span>
         <p>Realizados con ChatGPT de <strong>OpenAI</strong>.</p>
        </div>
        <div className="game-credit-section">
         <span className="game-credit-heading">MÚSICA</span>
         <ul>
          <li><em>Interstellar</em> — Soundtrack</li>
          <li><em>Project Hail Mary</em> — Soundtrack</li>
          <li><em>The Vast of Night</em> — Soundtrack</li>
         </ul>
        </div>
       </div>
       <button type="button" className="game-credits-close" onClick={()=>setCreditsOpen(false)}>VOLVER</button>
      </section>
     </div>}
     {loading&&<div className="game-loading-overlay" role="status" aria-label="Cargando el juego">
      <div className="game-loading-card">
       <div className="game-loading-track" aria-hidden="true">
        <span className="game-loading-stars"/>
        <span className="game-loading-ridge"/>
        <span className="game-loading-track-glow"/>
        <span className="game-loading-yarn">
         <svg viewBox="0 0 150 48" className="game-loading-yarn-art">
          <path d="M3 39 C24 19 42 43 62 25 S91 13 116 25" fill="none" stroke="#f0c5ad" strokeWidth="2.1" strokeLinecap="round"/>
          <path d="M7 39 C27 24 43 45 65 28" fill="none" stroke="#fff0dc" strokeWidth="1" strokeLinecap="round" opacity=".72"/>
          <g className="game-loading-yarn-ball">
           <circle cx="124" cy="25" r="16" fill="#c96d62" stroke="#f4c9a9" strokeWidth="1.8"/>
           <path d="M111 15 C122 23 130 31 137 38 M110 25 C119 17 129 12 139 15 M111 34 C120 27 128 22 139 20 M116 11 C114 22 117 33 125 40 M130 10 C124 20 123 30 130 40" fill="none" stroke="#f6d8bd" strokeWidth="2.2" strokeLinecap="round"/>
           <path d="M109 20 C116 25 122 29 128 37 M121 10 C127 18 132 26 137 32" fill="none" stroke="#8f424b" strokeWidth="1.5" strokeLinecap="round" opacity=".82"/>
           <circle cx="119" cy="18" r="2.2" fill="#ffe8d3" opacity=".86"/>
          </g>
         </svg>
        </span>
        <span className="game-loading-cat">
         <svg viewBox="0 0 100 72" className="game-loading-cat-art">
          <path className="game-loading-cat-tail" d="M25 49 C9 55 5 37 14 27 C20 20 28 25 24 33" fill="none" stroke="#171d2c" strokeWidth="8" strokeLinecap="round"/>
          <ellipse cx="45" cy="47" rx="27" ry="16" fill="#202737"/>
          <path d="M25 47 C23 55 26 63 30 66 M42 52 C40 59 40 64 44 67 M62 51 C62 58 65 64 69 66" fill="none" stroke="#202737" strokeWidth="7" strokeLinecap="round"/>
          <path d="M25 64 Q31 68 36 64 M40 66 Q46 70 51 66 M64 65 Q71 69 75 65" fill="none" stroke="#f0eee5" strokeWidth="3" strokeLinecap="round"/>
          <path d="M53 38 C53 25 63 16 76 18 C88 20 94 31 89 42 C85 51 72 54 61 48Z" fill="#202737"/>
          <path d="M62 24 L63 8 L76 20 M79 19 L91 10 L91 29" fill="#202737" stroke="#111827" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M65 17 L66 23 L72 21Z M82 20 L89 15 L88 24Z" fill="#c98783"/>
          <path d="M61 38 C68 32 82 34 88 42 C83 51 70 53 63 46Z" fill="#f1ede4"/>
          <ellipse cx="73" cy="36" rx="2.3" ry="3" fill="#f6d36b"/><ellipse cx="85" cy="36" rx="2.3" ry="3" fill="#f6d36b"/>
          <path d="M75 43 L81 43 L78 47Z" fill="#d97983"/>
          <path d="M64 45 Q55 43 51 39" fill="none" stroke="#f1ede4" strokeWidth="3" strokeLinecap="round"/>
          <g className="game-loading-cat-legs">
           <path d="M30 51 L25 64 M48 53 L48 66 M67 49 L70 65 M83 48 L89 62" fill="none" stroke="#202737" strokeWidth="6" strokeLinecap="round"/>
          </g>
          <path d="M92 44 L98 42 M92 48 L99 49" stroke="#f4e9dd" strokeWidth="1.2" strokeLinecap="round"/>
         </svg>
        </span>
       </div>
       <div className="game-loading-progress" role="progressbar" aria-label="Progreso de carga" aria-valuemin={0} aria-valuemax={100} aria-valuenow={loadingProgress} aria-valuetext={`${loadingProgress}%`}><span style={{width:`${loadingProgress}%`}}/></div>
       <div className="game-loading-meta"><p className="game-loading-label" aria-live="polite">{loadingPhrase}</p><span className="game-loading-percent">{loadingProgress}%</span></div>
      </div>
     </div>}
     {assetError&&<p className="game-menu-error" role="alert">No se pudieron cargar las imágenes. Recargá la página para reintentar.</p>}
    </nav>}
    {screen!=='play'&&screen!=='title'&&<div className="game-overlay absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/65 px-5 text-center">
     {screen==='paused'&&<><h2 className="game-title font-serif">Pausa</h2><Button size="lg" onClick={()=>setScreen('play')}><Play/>CONTINUAR</Button><Button variant="ghost" onClick={()=>{setScreen('title');st.current=newState();}}>MENÚ DEL JUEGO</Button></>}
     {screen==='win'&&ending&&<><h2 className="game-ending font-serif">{ENDINGS[ending].title}</h2><p className="font-mono text-xs text-celeste">{ENDINGS[ending].sub}</p><Button onClick={start}><RotateCcw/> VOLVER A JUGAR</Button><Button variant="outline" onClick={()=>{st.current=newState();setScreen('title');}}>MENÚ DEL JUEGO</Button></>}
     {screen==='lose'&&<><h2 className="game-title font-serif">TE DERROTARON</h2><p className="font-mono text-xs">El gato sigue a bordo del platillo.</p><Button onClick={start}><RotateCcw/>VOLVER A JUGAR</Button></>}
     {!loading&&<Button variant="link" asChild><Link to="/">VOLVER A APFAA</Link></Button>}
    </div>}
  </div>
 </div>;
}
