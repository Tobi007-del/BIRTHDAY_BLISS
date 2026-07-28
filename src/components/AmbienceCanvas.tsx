import { useEffect, useRef, useCallback } from 'react';

interface AmbienceCanvasProps {
  photos: { src: string }[];
}

/**
 * TMG Media Player AMBIENT_BUILD config (with opacity adjusted to 0.35)
 */
export const AMBIENT_BUILD = {
  blur: 80,
  opacity: 0.5,
  interval: 100,
  smoothness: 0.3,
};

/**
 * AmbienceCanvas — built directly from TMG Media Player's AmbiencePlug architecture.
 *
 * Implements TMG's exact config and rendering pipeline:
 *  - Small resolution (32px width) heavily performant for blurs, preserving aspect ratio
 *  - Uses AMBIENT_BUILD.blur and AMBIENT_BUILD.opacity in the canvas filter
 *  - Uses AMBIENT_BUILD.smoothness (0.3 alpha) when transitioning to new memories without clearing,
 *    creating a smooth alpha blend over previous frames
 *  - Uses AMBIENT_BUILD.interval (100ms) to throttle glow updates
 */
export function AmbienceCanvas({ photos }: AmbienceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentSrcRef = useRef<string>('');
  const imgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const pendingSrcRef = useRef<string>('');
  const isFirstDrawRef = useRef<boolean>(true);

  const drawPhoto = useCallback((img: HTMLImageElement, flush = false) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !ctx) return;

    // TMG syncGlow logic:
    // (this.context.globalAlpha = flush ? 1.0 : this.config.smoothness), flush && this.context.clearRect(...)
    ctx.globalAlpha = flush ? 1.0 : AMBIENT_BUILD.smoothness;
    if (flush) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }, []);

  const loadAndDraw = useCallback((src: string) => {
    if (currentSrcRef.current === src) return;
    currentSrcRef.current = src;

    const flush = isFirstDrawRef.current;
    if (flush) {
      isFirstDrawRef.current = false;
    }

    const cached = imgCacheRef.current.get(src);
    if (cached && cached.complete) {
      drawPhoto(cached, flush);
    } else {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = src;
      imgCacheRef.current.set(src, img);
      img.onload = () => {
        if (pendingSrcRef.current === src) drawPhoto(img, flush);
      };
      pendingSrcRef.current = src;
    }
  }, [drawPhoto]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Small resolution is heavily performant for blurs; preserve aspect ratio (TMG line 82-83)
    canvas.width = 32;
    canvas.height = Math.round(32 / (window.innerWidth / window.innerHeight));

    // Pre-cache all photos so drawing is instant when scrolled to
    photos.forEach((p) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = p.src;
      imgCacheRef.current.set(p.src, img);
    });

    let lastCheckTime = 0;
    let rafId: number;

    const checkCenterCard = (timestamp: number) => {
      // Throttle checks by AMBIENT_BUILD.interval (100ms) like TMG pulseGlow
      if (timestamp - lastCheckTime >= AMBIENT_BUILD.interval) {
        lastCheckTime = timestamp;
        const cards = document.querySelectorAll('.timeline-item[data-photo-index]');
        const viewportCenterY = window.innerHeight / 2;
        let closestCard: Element | null = null;
        let minDist = Infinity;

        for (let i = 0; i < cards.length; i++) {
          const rect = cards[i].getBoundingClientRect();
          const cardCenterY = rect.top + rect.height / 2;
          const dist = Math.abs(cardCenterY - viewportCenterY);
          if (dist < minDist) {
            minDist = dist;
            closestCard = cards[i];
          }
        }

        if (closestCard) {
          const idx = Number((closestCard as HTMLElement).dataset.photoIndex ?? 0);
          const src = photos[idx]?.src;
          if (src && src !== currentSrcRef.current) {
            loadAndDraw(src);
          }
        }
      }

      rafId = requestAnimationFrame(checkCenterCard);
    };

    rafId = requestAnimationFrame(checkCenterCard);

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [photos, loadAndDraw]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        filter: `blur(${AMBIENT_BUILD.blur}px) opacity(${AMBIENT_BUILD.opacity}) saturate(2) brightness(0.5)`,
        transform: 'scale(1.2)', // prevent blur edge bleed
        transformOrigin: 'center',
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
