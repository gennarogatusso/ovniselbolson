import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair, Hand, Maximize, Minimize, Pause, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import mountain from '@/assets/piltriquitron-cartoon.png.asset.json';
import player from '@/assets/personaje-juego.png.asset.json';
import cat from '@/assets/gato-juego.png.asset.json';
import alien from '@/assets/alien-rise.png.asset.json';
import reunion from '@/assets/cat-reunion.png.asset.json';
import { W, H, ENDINGS, CINEMATIC, canAskHelp, newState, update, type Ending, type Screen } from './game-engine';
import { draw, type GameImages, type Palette } from './game-renderer';

export function UfoGame() {
 const cv=useRef<HTMLCanvasElement>(null), host=useRef<HTMLDivElement>(null), st=useRef(newState()), images=useRef<GameImages|null>(null), palette=useRef<Palette|null>(null);
 const [screen,setScreen]=useState<Screen>('title'), [ending,setEnding]=useState<Ending|null>(null), [touch,setTouch]=useState(false),[expanded,setExpanded]=useState(false),[loading,setLoading]=useState(true),[assetError,setAssetError]=useState(false),[context,setContext]=useState(false),[combat,setCombat]=useState(false);
 const screenRef=useRef(screen);screenRef.current=screen;
 useEffect(()=>{
  const mq=window.matchMedia('(pointer: coarse)');const changed=()=>setTouch(mq.matches);changed();mq.addEventListener('change',changed);
  const readPalette=()=>{if(!host.current)return;const css=getComputedStyle(host.current);const colors={} as Palette;for(const key of ['sky','rose','gold','sunset','light','ice','panel','ink','forest','trunk','wall','roof','leaf','road','curb','lane','shadow','hill','metal','glass','laser','smoke','stone','skin','red','alien'] as const)colors[key]=css.getPropertyValue('--game-'+key).trim();palette.current=colors;};readPalette();
  const load=(url:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url;});let active=true;
    Promise.all([load(mountain.url),load(player.url),load(cat.url),load(alien.url),load(reunion.url),load('/imagens/imagem-cb85a873.png'),load('/imagens/imagem-4233f6e4.png'),load('/imagens/imagem-3241014a.png'),load('/imagens/imagem-97d3754a.png'),load('/imagens/imagem-2fed5c3b.webp'),load('/imagens/imagem-499d0608.png')]).then(([mountain,player,cat,alien,reunion,alien1,alien2,alien3,alien4,fighter,gun])=>{if(!active)return;images.current={mountain,player,cat,alien,reunion,fighter,gun,alienFrames:[alien1,alien2,alien3,alien4]};setLoading(false);}).catch(()=>{if(active){setAssetError(true);setLoading(false);}});
  return()=>{active=false;mq.removeEventListener('change',changed);};
 },[]);
 useEffect(()=>{
  const map:Record<string,string>={a:'l',arrowleft:'l',d:'r',arrowright:'r',w:'j',arrowup:'j',' ':'j',s:'c',arrowdown:'c',e:'e'};
  const clear=()=>{st.current.keys={};st.current.fire=false;};
  const down=(e:KeyboardEvent)=>{const key=e.key.toLowerCase();if(key==='escape'){clear();setScreen(s=>s==='play'?'paused':s==='paused'?'play':s);return;}if(map[key]&&screenRef.current==='play'){e.preventDefault();st.current.keys[map[key]]=true;}};
  const up=(e:KeyboardEvent)=>{const k=map[e.key.toLowerCase()];if(k)st.current.keys[k]=false;};
  const blur=()=>{clear();setScreen(s=>s==='play'?'paused':s);};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',blur);window.addEventListener('pointerup',clear);
  const fs=()=>setExpanded(Boolean(document.fullscreenElement));document.addEventListener('fullscreenchange',fs);
  return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',blur);window.removeEventListener('pointerup',clear);document.removeEventListener('fullscreenchange',fs);};
 },[]);
 useEffect(()=>{if(screen!=='play'&&!expanded)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[screen,expanded]);
 useEffect(()=>{
  const ctx=cv.current?.getContext('2d');if(!ctx||loading||assetError||!palette.current)return;
  const colors=palette.current;
  ctx.imageSmoothingEnabled=true;let raf=0,last=performance.now(),acc=0;
  const loop=(now:number)=>{const dt=Math.min(.05,(now-last)/1000);last=now;
      try{
    if(st.current.phase==='jets'&&!st.current.jetSoundPlayed){
     st.current.jetSoundPlayed=true;
     try{const audio=new AudioContext();void audio.resume();const start=audio.currentTime;const engine=audio.createOscillator(),gain=audio.createGain();engine.type='sawtooth';engine.frequency.setValueAtTime(58,start);engine.frequency.exponentialRampToValueAtTime(125,start+1.4);gain.gain.setValueAtTime(.001,start);gain.gain.linearRampToValueAtTime(.12,start+.35);gain.gain.exponentialRampToValueAtTime(.001,start+4.5);engine.connect(gain);gain.connect(audio.destination);engine.start(start);engine.stop(start+4.6);for(const t of [1.05,1.75,2.2]){const shot=audio.createOscillator(),volume=audio.createGain();shot.type='square';shot.frequency.setValueAtTime(720,t+start);shot.frequency.exponentialRampToValueAtTime(110,t+start+.16);volume.gain.setValueAtTime(.09,t+start);volume.gain.exponentialRampToValueAtTime(.001,t+start+.18);shot.connect(volume);volume.connect(audio.destination);shot.start(t+start);shot.stop(t+start+.2);}}catch{}
    }
    if(screen==='play'){ 
     const result=update(st.current,dt);acc+=dt;
     if(acc>.12){acc=0;setContext(canAskHelp(st.current));setCombat(st.current.phase==='fight');}
     if(result){setEnding(result==='win'?'revenge':result==='continue'?'continuation':null);setScreen(result==='lose'?'lose':'win');}
    }else if(screen!=='paused'){
     // Mantener vivos humo y chispas detrás de las pantallas finales.
     const s=st.current;s.t+=dt;s.fx=s.fx.filter(f=>(f.life-=dt)>0);
     if(s.phase==='over'&&Math.random()<dt*6)s.fx.push({x:s.u.x+(Math.random()-.5)*60,y:st.current.p.y-20,life:1.2,c:'smoke'});
    }
    draw(ctx,st.current,images.current,colors);host.current?.setAttribute('data-phase',st.current.phase);host.current?.setAttribute('data-ufo-health',String(st.current.u.hp));
   }catch(err){console.error('Error en el juego',err);}
   raf=requestAnimationFrame(loop);
  };raf=requestAnimationFrame(loop);return()=>cancelAnimationFrame(raf);
 },[screen,loading,assetError]);
 const start=()=>{st.current=newState();setEnding(null);setContext(false);setCombat(false);setScreen('play');};
 const pause=()=>{st.current.keys={};st.current.fire=false;setScreen('paused');};
 const fullscreen=async()=>{const el=host.current;if(!el)return;if(document.fullscreenElement){await document.exitFullscreen();return;}if(expanded){setExpanded(false);return;}try{if(el.requestFullscreen){await el.requestFullscreen();setExpanded(true);}else setExpanded(true);}catch{setExpanded(true);}};
 const hold=(k:string)=>({onPointerDown:(e:PointerEvent<HTMLButtonElement>)=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);st.current.keys[k]=true;},onPointerUp:()=>{st.current.keys[k]=false;},onPointerCancel:()=>{st.current.keys[k]=false;}});
 const fire=(e:PointerEvent)=>{if(screen!=='play'||CINEMATIC.has(st.current.phase))return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);st.current.fire=true;};
 const controlClass='game-control rounded-full border border-silver/50 bg-background/70 text-foreground touch-none';
 return <div ref={host} className={`ufo-game ${expanded?'game-expanded':''}`} data-screen={screen}>
  <div className="game-stage">
   <canvas ref={cv} width={W} height={H} aria-label="OVNIS EN EL BOLSÓN, escenario de juego" className="h-full w-full" onPointerDown={e=>{if(e.pointerType==='mouse'&&e.button===0)fire(e);}} onPointerUp={()=>{st.current.fire=false;}} onPointerCancel={()=>{st.current.fire=false;}} onContextMenu={e=>e.preventDefault()}/>
   <div className="absolute right-2 top-2 z-20 flex gap-2">
    {screen==='play'&&<Button size="icon" variant="outline" title="Pausar" aria-label="Pausar" onClick={pause}><Pause/></Button>}
    <Button size="icon" variant="outline" title={expanded?'Salir de pantalla completa':'Pantalla completa'} aria-label={expanded?'Salir de pantalla completa':'Pantalla completa'} onClick={fullscreen}>{expanded?<Minimize/>:<Maximize/>}</Button>
   </div>
   {screen==='play'&&touch&&!CINEMATIC.has(st.current.phase)&&<div className="game-touch pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-between px-3">
    <div className="pointer-events-auto flex items-end gap-2"><Button className={controlClass} aria-label="Mover izquierda" {...hold('l')}><ArrowLeft/></Button><Button className={controlClass} aria-label="Mover derecha" {...hold('r')}><ArrowRight/></Button><Button className={controlClass} aria-label="Agacharse" {...hold('c')}><ArrowDown/></Button></div>
    <div className="pointer-events-auto flex items-end gap-2">{context&&<Button className={controlClass} aria-label="Pedir ayuda a los pibes" {...hold('e')}><Hand/></Button>}<Button className={controlClass} aria-label="Saltar" {...hold('j')}><ArrowUp/></Button>{combat&&<Button className={controlClass} aria-label="Disparar" onPointerDown={fire} onPointerUp={()=>{st.current.fire=false;}} onPointerCancel={()=>{st.current.fire=false;}}><Crosshair/></Button>}</div>
   </div>}
   {screen==='play'&&!touch&&context&&<Button className="absolute bottom-4 left-1/2 -translate-x-1/2" onClick={()=>{st.current.keys.e=true;}}><Hand/> PEDIR AYUDA A LOS PIBES · E</Button>}
   {screen!=='play'&&<div className="game-overlay absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/65 px-5 text-center">
        {screen==='title'&&<div className="game-title-card"><p className="font-mono text-xs text-celeste">UFOCAT Test 1.1</p><p className="font-serif text-lg italic text-foreground/90">Vos y tu gato pasan un momento de terror en las afueras de El Bolsón</p><Button size="lg" onClick={start} disabled={loading||assetError}><Play/>{loading?'CARGANDO…':'JUGAR'}</Button>{assetError&&<p role="alert">No se pudieron cargar las imágenes. Recargá la página para reintentar.</p>}</div>}
    {screen==='paused'&&<><h2 className="game-title font-serif">Pausa</h2><Button size="lg" onClick={()=>setScreen('play')}><Play/>CONTINUAR</Button><Button variant="ghost" onClick={()=>{setScreen('title');st.current=newState();}}>MENÚ DEL JUEGO</Button></>}
    {screen==='win'&&ending&&<><h2 className="game-ending font-serif">{ENDINGS[ending].title}</h2><p className="font-mono text-xs text-celeste">{ENDINGS[ending].sub}</p><Button onClick={start}><RotateCcw/> VOLVER A JUGAR</Button><Button variant="outline" onClick={()=>{st.current=newState();setScreen('title');}}>MENÚ DEL JUEGO</Button></>}
    {screen==='lose'&&<><h2 className="game-title font-serif">TE DERROTARON</h2><p className="font-mono text-xs">El gato sigue a bordo del platillo.</p><Button onClick={start}><RotateCcw/>VOLVER A JUGAR</Button></>}
    {!loading&&<Button variant="link" asChild><Link to="/">VOLVER A APFAA</Link></Button>}
   </div>}
  </div>
 </div>;
}
