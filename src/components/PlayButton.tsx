import React, { useEffect, useRef } from 'react';
import { useReactor } from 'sia-reactor/adapters/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { store } from '../store';

export const PlayButton: React.FC = () => {
  const s = useReactor(store);
  const rafRef = useRef<number | null>(null);

  const isPlaying = s.state.playing;

  // Ensure ScrollTrigger recalculates accurate layout metrics whenever Fullscreen mode or window resizing occurs
  useEffect(() => {
    const handleResizeOrFS = () => {
      setTimeout(() => {
        ScrollTrigger.refresh();
      }, 200);
      setTimeout(() => {
        ScrollTrigger.refresh();
      }, 600);
    };
    window.addEventListener('fullscreenchange', handleResizeOrFS);
    window.addEventListener('webkitfullscreenchange', handleResizeOrFS);
    window.addEventListener('resize', handleResizeOrFS);
    return () => {
      window.removeEventListener('fullscreenchange', handleResizeOrFS);
      window.removeEventListener('webkitfullscreenchange', handleResizeOrFS);
      window.removeEventListener('resize', handleResizeOrFS);
    };
  }, []);

  const togglePlay = () => {
    const nextState = !isPlaying;

    if (nextState) {
      // Always reset all memory cards to their text side (rotateY: 180) when playback begins
      const allCards = document.querySelectorAll('.memory-card');
      allCards.forEach((c) => {
        gsap.set(c, { rotateY: 180 });
      });

      // Request Fullscreen on documentElement
      const elem = document.documentElement as any;
      try {
        if (elem.requestFullscreen) {
          elem.requestFullscreen().catch(() => {});
        } else if (elem.webkitRequestFullscreen) {
          elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
          elem.msRequestFullscreen();
        }
      } catch (err) {
        // Fullscreen may be blocked in some iframe environments; continue playback gracefully
      }

      // If at bottom, scroll back to top first
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 20
      ) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      // Exit Fullscreen when pausing
      try {
        if (
          document.fullscreenElement ||
          (document as any).webkitFullscreenElement
        ) {
          if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
          } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen();
          }
        }
      } catch (err) {}
    }

    store.intent.playing = nextState;
  };

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const step = () => {
      if (!isPlaying) return;

      // Check if we reached the bottom of the page (Climax Wish)
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 10
      ) {
        // Exit Fullscreen when playback completes
        try {
          if (
            document.fullscreenElement ||
            (document as any).webkitFullscreenElement
          ) {
            if (document.exitFullscreen) {
              document.exitFullscreen().catch(() => {});
            } else if ((document as any).webkitExitFullscreen) {
              (document as any).webkitExitFullscreen();
            }
          }
        } catch (err) {}

        store.intent.playing = false;
        store.state.hasWatchedClimax = true;
        return;
      }

      // Find closest card to the viewport center
      const cards = document.querySelectorAll('.timeline-item');
      const viewportCenterY = window.innerHeight / 2;
      let minDist = Infinity;

      for (let i = 0; i < cards.length; i++) {
        const rect = cards[i].getBoundingClientRect();
        const cardCenterY = rect.top + rect.height / 2;
        const dist = Math.abs(cardCenterY - viewportCenterY);
        if (dist < minDist) {
          minDist = dist;
        }
      }

      // Continuous dynamic scrolling: fast stem travel (12px/frame), gentle drift (0.5px/frame) around card center
      let scrollSpeed = 12;
      if (minDist < window.innerHeight * 0.45) {
        const t = Math.max(0, minDist / (window.innerHeight * 0.45));
        scrollSpeed = 0.5 + t * 11.5;
      }

      window.scrollBy(0, scrollSpeed);
      ScrollTrigger.update();

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <button
      onClick={togglePlay}
      className="floating-play-btn"
      aria-label={isPlaying ? 'Hold' : 'Experience'}
    >
      <div className="btn-icon">
        {isPlaying ? (
          // Pause bars SVG
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          // Play triangle SVG
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 6v12l10-6z" />
          </svg>
        )}
      </div>
      <span className="btn-text">
        {isPlaying ? 'Hold' : 'Experience'}
      </span>
    </button>
  );
};
