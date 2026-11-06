import { useState } from 'react';
import { Folder, FileVideo, Monitor, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import wallpaper from '@/assets/desktop-wallpaper.png.asset.json';
import google from '@/assets/desktop-google.png.asset.json';
import payment from '@/assets/desktop-payment.png.asset.json';
import video from '@/assets/cat-video.mp4.asset.json';

export function GameComputer({ onClose }: { onClose: () => void }) {
 const [view,setView]=useState<'desktop'|'folder'|'video'>('desktop');
 const [selected,setSelected]=useState('');
 return <div className="game-computer" role="dialog" aria-label="Computadora" onKeyDown={e=>{e.stopPropagation();if(e.key==='Escape'){if(view==='video')setView('folder');else if(view==='folder')setView('desktop');else onClose();}}}>
  <img className="computer-wallpaper" src={wallpaper.url} alt="Plaza Pagano celebrando el Mundial, Piltriquitrón y Messi" />
  <div className="computer-icons">
   <Button variant="ghost" className={`computer-icon ${selected==='google'?'computer-selected':''}`} onClick={()=>setSelected('google')}><img src={google.url} alt=""/><span>Google</span></Button>
   <Button variant="ghost" className={`computer-icon ${selected==='payment'?'computer-selected':''}`} onClick={()=>setSelected('payment')}><img src={payment.url} alt=""/><span>Mercado Pago</span></Button>
   <Button variant="ghost" className="computer-icon" onClick={()=>setView('folder')}><Folder aria-hidden="true"/><span>Videos del gato</span></Button>
  </div>
  {view!=='desktop'&&<section className="computer-window" aria-label={view==='video'?'Reproductor de video':'Videos del gato'}>
   <header className="computer-window-title"><span>{view==='video'?'video del gato':'Videos del gato'}</span><Button size="icon" variant="outline" aria-label={view==='video'?'Cerrar reproductor':'Cerrar carpeta'} title="Cerrar" onClick={()=>setView(view==='video'?'folder':'desktop')}><X/></Button></header>
   {view==='folder'?<div className="computer-folder"><Button variant="ghost" className="computer-file" onClick={()=>setView('video')}><FileVideo/><span>video del gato</span></Button></div>:<video className="computer-video" src={video.url} controls autoPlay playsInline preload="metadata" aria-label="video del gato"/>}
  </section>}
  <footer className="computer-taskbar"><span><Monitor/> UFOCAT</span><Button variant="outline" onClick={onClose}><X/>Salir de la computadora</Button></footer>
 </div>;
}