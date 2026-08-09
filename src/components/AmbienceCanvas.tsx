import { useEffect, useRef, useCallback } from 'react';
import { store } from '../store';

interface AmbienceCanvasProps {
  photos: { src: string }[];
}

export const AMBIENT_BUILD = {
  blur: 80,
  opacity: 0.5,
  interval: 100,
  smoothness: 0.3,
};

import { useReactor } from 'sia-reactor/adapters/react';

export function AmbienceCanvas({ photos }: AmbienceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeMediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);
  const isFirstDrawRef = useRef<boolean>(true);

  const drawMedia = useCallback((media: HTMLImageElement | HTMLVideoElement, flush = false) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !ctx) return;

    ctx.globalAlpha = flush ? 1.0 : AMBIENT_BUILD.smoothness;
    if (flush) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(media, 0, 0, canvas.width, canvas.height);
  }, []);

  useReactor(store);
  const { activeMediaIndex } = store.state;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Use microscopic resolution matching tmg-media-player for immense GPU performance savings
    const ar = window.innerWidth / window.innerHeight;
    if (ar >= 1) {
      canvas.width = 4;
      canvas.height = Math.max(2, Math.round(4 / ar));
    } else {
      canvas.height = 4;
      canvas.width = Math.max(2, Math.round(4 * ar));
    }

    // Pre-cache images in browser to ensure they are ready when scrolled to
    photos.forEach((p) => {
      if (!p.src.match(/\.(mp4|webm|mov)$/i)) {
        const img = new Image();
        img.src = p.src;
      }
    });
  }, [photos]);

  useEffect(() => {
    const handleTimeUpdate = () => {
      if (activeMediaRef.current instanceof HTMLVideoElement) {
        drawMedia(activeMediaRef.current, false);
      }
    };

    // Clean up old video listener if we are switching away from it
    if (activeMediaRef.current instanceof HTMLVideoElement) {
      activeMediaRef.current.removeEventListener('timeupdate', handleTimeUpdate);
    }

    const currentCard = document.querySelector(`.timeline-item[data-photo-index="${activeMediaIndex}"]`);
    if (!currentCard) return;

    const media = currentCard.querySelector('.memory-media-video, .card-front img') as HTMLImageElement | HTMLVideoElement | null;
    
    if (media) {
      activeMediaRef.current = media;
      const flush = isFirstDrawRef.current;
      if (flush) isFirstDrawRef.current = false;

      if (media instanceof HTMLVideoElement) {
        media.addEventListener('timeupdate', handleTimeUpdate);
        drawMedia(media, flush);
      } else if (media instanceof HTMLImageElement) {
        if (media.complete) {
          drawMedia(media, flush);
        } else {
          media.onload = () => {
            if (activeMediaRef.current === media) drawMedia(media, flush);
          };
        }
      }
    }

    return () => {
      if (activeMediaRef.current instanceof HTMLVideoElement) {
        activeMediaRef.current.removeEventListener('timeupdate', handleTimeUpdate);
      }
    };
  }, [activeMediaIndex, drawMedia]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        filter: `opacity(${AMBIENT_BUILD.opacity}) saturate(2) brightness(0.5)`,
        transform: 'scale(1.2)',
        transformOrigin: 'center',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
