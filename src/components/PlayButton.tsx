import React, { useEffect, useRef } from 'react';
import { useReactor } from 'sia-reactor/adapters/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { store } from '../store';

export const PlayButton: React.FC = () => {
  const s = useReactor(store);
  const rafRef = useRef<number | null>(null);

  const isPlaying = s.state.playing;

  // Re-add manual layout refreshes because entering fullscreen drastically changes viewport height on mobile.
  // To avoid the stutter/hang, we pause the scroll physics while the refresh is happening!
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    const handleResizeOrFS = () => {
      isRefreshingRef.current = true;
      setTimeout(() => {
        ScrollTrigger.refresh();
      }, 200);
      setTimeout(() => {
        ScrollTrigger.refresh();
        isRefreshingRef.current = false;
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

      // Pause physics for 600ms specifically on initial play to hide the initial fullscreen UI shift
      isRefreshingRef.current = true;
      setTimeout(() => {
        ScrollTrigger.refresh();
        isRefreshingRef.current = false;
      }, 600);

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

    // Cache static DOM elements OUTSIDE the highly sensitive physics render loop
    // to prevent garbage collection pressure and DOM searching on every single frame.
    const cards = document.querySelectorAll('.timeline-item');
    const viewportCenterY = window.innerHeight / 2;

    const step = () => {
      // If the page is currently refreshing its geometry (e.g. entering fullscreen), pause movement!
      // This completely eliminates the "stutter" hang, acting as a graceful 600ms starting pause.
      if (!store.state.playing || isRefreshingRef.current) return;

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
      let minDist = Infinity;
      for (let i = 0; i < cards.length; i++) {
        const rect = cards[i].getBoundingClientRect();
        const cardCenterY = rect.top + rect.height / 2;
        const dist = Math.abs(cardCenterY - viewportCenterY);
        if (dist < minDist) {
          minDist = dist;
        }
      }

      // Continuous dynamic scrolling
      // Base drift speed is 1px/frame near cards, speeding up to 6px/frame when far away
      let scrollSpeed = 6;
      
      if (window.scrollY < window.innerHeight * 0.6) {
        // We are at the very top (intro text). Slow down drastically so they can read the poetry!
        scrollSpeed = 1.0;
      } else {
        // Calculate slowdown based on an absolute pixel distance, not viewport height.
        if (minDist < 800) {
          const t = Math.max(0, minDist / 800); // 0 (at center) to 1 (at 800px)
          // 1.0 base speed + up to 5.0 based on distance = max 6
          scrollSpeed = 1.0 + t * 5.0;
        }
      }

      // Use gsap's internal delta ratio to seamlessly normalize speed across all devices (60Hz, 120Hz, etc)
      // We cap it at 1.5 so if the browser hangs or lags (e.g. during a layout shift), it DOES NOT instantly jump a huge distance!
      const multiplier = Math.min(gsap.ticker.deltaRatio(), 1.5);
      window.scrollBy(0, scrollSpeed * multiplier);
      // Removed manual ScrollTrigger.update() because GSAP's ticker automatically updates it!
    };

    gsap.ticker.add(step);

    return () => {
      gsap.ticker.remove(step);
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
