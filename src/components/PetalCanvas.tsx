import { useEffect, useRef } from 'react';
import { store } from '../store';

function hexToRgb(hex: string): [number, number, number] {
  let c = (hex || '#ff8da1').replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16) || 0xff8da1;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// Highly optimized canvas particle emitter for falling rose petals
export function PetalCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const petals: Petal[] = [];
    const numPetals = 40;

    class Petal {
      x: number;
      y: number;
      w: number;
      h: number;
      opacity: number;
      flip: number;
      flipSpeed: number;
      dropSpeed: number;
      sway: number;
      swaySpeed: number;
      swayOffset: number;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height - height;
        this.w = 10 + Math.random() * 15;
        this.h = 10 + Math.random() * 15;
        this.opacity = 0.2 + Math.random() * 0.5;
        this.flip = Math.random();
        this.flipSpeed = Math.random() * 0.05 + 0.01;
        this.dropSpeed = Math.random() * 1.5 + 0.5;
        this.sway = Math.random() * Math.PI * 2;
        this.swaySpeed = Math.random() * 0.02 + 0.01;
        this.swayOffset = Math.random() * 2;
      }

      update() {
        this.y += this.dropSpeed;
        this.sway += this.swaySpeed;
        this.x += Math.sin(this.sway) * this.swayOffset;
        this.flip += this.flipSpeed;

        if (this.y > height + this.h) {
          this.y = -this.h;
          this.x = Math.random() * width;
        }
      }

      draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.sway);
        ctx.scale(Math.cos(this.flip), Math.sin(this.flip));
        
        // Petal shape
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.bezierCurveTo(this.w / 2, -this.h / 2, this.w, this.h / 2, 0, this.h);
        ctx.bezierCurveTo(-this.w, this.h / 2, -this.w / 2, -this.h / 2, 0, 0);
        
        const [r, g, b] = hexToRgb(store.data?.petal_color || '#ff8da1');
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${this.opacity})`;
        ctx.fill();
        ctx.restore();
      }
    }

    for (let i = 0; i < numPetals; i++) {
      petals.push(new Petal());
    }

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      for (const petal of petals) {
        petal.update();
        petal.draw(ctx);
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0, // Behind everything
        overflow: 'hidden',
      }}
    />
  );
}
