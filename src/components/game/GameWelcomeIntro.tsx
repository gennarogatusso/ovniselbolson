import { useEffect, useRef } from 'react';

type TextParticle = {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number;
  color: string;
  ease: number;
  vx: number;
  vy: number;
  scattered: boolean;
};

type SnowFlake = {
  x: number;
  y: number;
  radius: number;
  speedX: number;
  speedY: number;
};

type GameWelcomeIntroProps = {
  onComplete: () => void;
};

const TITLE_TEXT = 'Gennaro Montecino Presenta';
const MAIN_TEXT = 'Ovnis: El Bolsón';
const HOLD_MS = 4000;
const FADE_MS = 1400;

export function GameWelcomeIntro({ onComplete }: GameWelcomeIntroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) {
      onCompleteRef.current();
      return;
    }

    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let particles: TextParticle[] = [];
    let backgroundFlakes: SnowFlake[] = [];
    let animationFrameId = 0;
    let startTime = 0;
    let lastTime = 0;
    let active = true;
    let completed = false;

    const initBackgroundFlakes = () => {
      backgroundFlakes = [];
      const count = Math.min(Math.floor((width * height) / 8000), 140);
      for (let i = 0; i < count; i += 1) {
        backgroundFlakes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: Math.random() * 1.8 + 0.5,
          speedY: Math.random() * 28 + 12,
          speedX: Math.random() * 18 - 9,
        });
      }
    };

    const initTextParticles = () => {
      particles = [];
      if (!width || !height) return;

      const offscreenCanvas = document.createElement('canvas');
      offscreenCanvas.width = Math.ceil(width);
      offscreenCanvas.height = Math.ceil(height);
      const offCtx = offscreenCanvas.getContext('2d');
      if (!offCtx) return;

      const mainSize = Math.max(22, Math.min(width / (MAIN_TEXT.length * 0.66), height * 0.15, 96));
      const titleSize = Math.max(14, Math.min(mainSize * 0.42, width / (TITLE_TEXT.length * 0.58)));
      const centerY = height / 2;

      offCtx.textAlign = 'center';
      offCtx.textBaseline = 'middle';
      offCtx.fillStyle = '#ffffff';
      offCtx.font = `700 ${titleSize}px "Cinzel", Georgia, serif`;
      offCtx.fillText(TITLE_TEXT, width / 2, centerY - mainSize * 0.68);
      offCtx.font = `700 ${mainSize}px "Cinzel", Georgia, serif`;
      offCtx.fillText(MAIN_TEXT, width / 2, centerY + mainSize * 0.32);

      const pixels = offCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height).data;
      const step = width < 640 ? 3 : 4;
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const alpha = pixels[(Math.floor(y) * offscreenCanvas.width + Math.floor(x)) * 4 + 3];
          if (alpha <= 80) continue;

          const brightness = Math.floor(Math.random() * 40) + 215;
          particles.push({
            x: x + (Math.random() - 0.5) * 200,
            y: -Math.random() * height,
            targetX: x,
            targetY: y,
            radius: Math.random() * 1.8 + 1.2,
            color: `rgba(${brightness}, ${Math.min(255, brightness + 10)}, 255, ${Math.random() * 0.3 + 0.7})`,
            ease: Math.random() * 0.08 + 0.04,
            vx: 0,
            vy: 0,
            scattered: false,
          });
        }
      }
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;

      width = bounds.width;
      height = bounds.height;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      initBackgroundFlakes();
      initTextParticles();
    };

    const drawBackgroundSnow = (dt: number, opacity: number) => {
      ctx.beginPath();
      for (const flake of backgroundFlakes) {
        flake.y += flake.speedY * dt;
        flake.x += flake.speedX * dt;
        if (flake.y > height + 5) {
          flake.y = -5;
          flake.x = Math.random() * width;
        }
        if (flake.x < -5) flake.x = width + 5;
        if (flake.x > width + 5) flake.x = -5;
        ctx.moveTo(flake.x + flake.radius, flake.y);
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
      }
      ctx.fillStyle = `rgba(225, 241, 255, ${0.72 * opacity})`;
      ctx.fill();
    };

    const scatterParticles = () => {
      for (const particle of particles) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 180 + 110;
        particle.vx = Math.cos(angle) * speed + 35;
        particle.vy = Math.sin(angle) * speed - 25;
        particle.scattered = true;
      }
    };

    const animate = (now: number) => {
      if (!active) return;
      if (!startTime) {
        startTime = now;
        lastTime = now;
      }
      const elapsed = now - startTime;
      const dt = Math.min(0.04, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;

      if (elapsed >= HOLD_MS + FADE_MS) {
        if (!completed) {
          completed = true;
          onCompleteRef.current();
        }
        return;
      }

      ctx.clearRect(0, 0, width, height);
      const fade = elapsed <= HOLD_MS ? 1 : Math.max(0, 1 - (elapsed - HOLD_MS) / FADE_MS);

      drawBackgroundSnow(dt, fade);

      if (elapsed >= HOLD_MS && particles.length && !particles[0].scattered) {
        scatterParticles();
      }

      ctx.save();
      ctx.globalAlpha = fade;
      for (const particle of particles) {
        if (particle.scattered) {
          particle.x += particle.vx * dt;
          particle.y += particle.vy * dt;
          particle.vx *= 0.985;
          particle.vy *= 0.985;
        } else {
          particle.x += (particle.targetX - particle.x) * particle.ease;
          particle.y += (particle.targetY - particle.y) * particle.ease;
        }

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.fill();
      }
      ctx.restore();

      animationFrameId = window.requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener('resize', resize);
    animationFrameId = window.requestAnimationFrame(animate);

    return () => {
      active = false;
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="game-welcome-intro" role="status" aria-label="Gennaro Montecino Presenta. Ovnis: El Bolsón">
      <canvas ref={canvasRef} className="game-welcome-canvas" aria-hidden="true" />
    </div>
  );
}
