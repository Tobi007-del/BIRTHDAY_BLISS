import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { PetalCanvas } from './components/PetalCanvas';
import { AmbienceCanvas } from './components/AmbienceCanvas';
import { Canopy } from './components/Canopy';
import { Roots } from './components/Roots';
import { PlayButton } from './components/PlayButton';
import { AudioController } from './components/AudioController';
import { store } from './store';
import { useReactor } from 'sia-reactor/adapters/react';
import './styles/index.css';
import './styles/app.css';

gsap.registerPlugin(ScrollTrigger);

const MemoryCard: React.FC<{ photo: any; index: number; isLeft: boolean }> = ({ photo, index, isLeft }) => {
  const isVideo = photo.src.match(/\.(mp4|webm|mov)$/i);
  const mediaRef = useRef<any>(null); // Shared ref for both img and video
  
  // Outer ambient glow (Apple Music style)
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Inner ambient fill (Fills the black bars of object-fit: contain)
  const innerCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const media = mediaRef.current;
    const canvas = canvasRef.current;
    const innerCanvas = innerCanvasRef.current;
    if (!media || !canvas || !innerCanvas) return;

    const ctx = canvas.getContext('2d');
    const innerCtx = innerCanvas.getContext('2d');
    if (!ctx || !innerCtx) return;

    // Ultra-low resolution (4x4) is heavily performant because it forces the browser's GPU 
    // to do hardware-accelerated bilinear filtering (stretching it to 100% width/height).
    canvas.width = 4;
    canvas.height = 4;
    innerCanvas.width = 4;
    innerCanvas.height = 4;

    if (isVideo) {
      const handleTimeUpdate = () => {
        if (media.readyState >= 1) {
          ctx.drawImage(media, 0, 0, canvas.width, canvas.height);
          innerCtx.drawImage(media, 0, 0, innerCanvas.width, innerCanvas.height);
        }
      };
      media.addEventListener('timeupdate', handleTimeUpdate);
      return () => media.removeEventListener('timeupdate', handleTimeUpdate);
    } else {
      const drawImage = () => {
        ctx.drawImage(media, 0, 0, canvas.width, canvas.height);
        innerCtx.drawImage(media, 0, 0, innerCanvas.width, innerCanvas.height);
      };
      if (media.complete) {
        drawImage();
      } else {
        media.addEventListener('load', drawImage);
        return () => media.removeEventListener('load', drawImage);
      }
    }
  }, [isVideo, photo.src]);

  return (
    <div className={`timeline-item ${isLeft ? 'left' : 'right'}`} data-photo-index={index}>
      <div className="card-wrapper">
        {/* Outer Glow Canvas used for BOTH video and images */}
        <canvas ref={canvasRef} className="card-ambient" aria-hidden="true" />
        
        <div className="memory-card">
          <div className="card-face card-front" style={{ position: 'relative' }}>
            {/* Inner Fill Canvas used for BOTH video and images */}
            <canvas ref={innerCanvasRef} className="card-inner-ambient" aria-hidden="true" />
            
            {isVideo ? (
              <video
                ref={mediaRef}
                src={photo.src}
                loop
                muted
                playsInline
                onContextMenu={(e) => e.preventDefault()}
                className="memory-media-video"
                style={{ display: 'block', width: '100%', height: '100%', minHeight: '40vh', maxHeight: '75vh', objectFit: 'contain', opacity: 0.9, position: 'relative', zIndex: 1 }}
              />
            ) : (
              <img 
                ref={mediaRef} 
                src={photo.src} 
                alt="Memory" 
                style={{ position: 'relative', zIndex: 1 }} 
              />
            )}
          </div>
          <div className="card-face card-back">
            <p>{photo.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

function BirthdayBliss() {
  const s = useReactor(store);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const climaxRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    // IMPORTANT: First ensure ScrollTrigger knows the real page height
    ScrollTrigger.refresh();

    // --------------------------------------------------------
    // CHAPTER 1: INTRO SEQUENCE
    // --------------------------------------------------------
    // Trigger on the whole SECTION so both lines animate together reliably.
    // No scrub — use simple toggleActions so both lines are always fully visible.
    const introSection = document.querySelector('.chapter-intro');
    const introLines = gsap.utils.toArray('.intro-line');
    gsap.set(introLines, { opacity: 0, y: 30 });

    gsap.to(introLines, {
      opacity: 1,
      y: 0,
      duration: 1.2,
      stagger: 0.3,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: introSection,
        start: 'top 80%',
        toggleActions: 'play none none reverse',
      }
    });

    // --------------------------------------------------------
    // CHAPTER 2: THE STEM DRAWING LINE
    // --------------------------------------------------------
    // clip-path reveal: inset(0% 0% 100% 0%) = fully hidden from bottom
    // inset(0% 0% 0% 0%) = fully shown. This draws the stem top-to-bottom with ZERO compression.
    gsap.set('.timeline-stem-fill', {
      clipPath: 'inset(0% 0% 100% 0%)',
      webkitClipPath: 'inset(0% 0% 100% 0%)',
    });
    gsap.to('.timeline-stem-fill', {
      clipPath: 'inset(0% 0% 0% 0%)',
      webkitClipPath: 'inset(0% 0% 0% 0%)',
      ease: 'none',
      scrollTrigger: {
        trigger: timelineRef.current,
        start: 'top center',
        end: 'bottom center', // Perfect 1:1 mapping with the viewport center
        scrub: true,
        invalidateOnRefresh: true,
      },
    });

    // --------------------------------------------------------
    // CHAPTER 2: CARD ENTRY POP ANIMATIONS
    // --------------------------------------------------------
    const items = gsap.utils.toArray('.timeline-item');
    // Set all cards hidden first
    gsap.set(items, { opacity: 0, scale: 0.6, rotation: 15, y: 200 });

    items.forEach((item: any, index: number) => {
      const wrapper = item.querySelector('.card-wrapper');
      const card = item.querySelector('.memory-card');
      // Start with words side showing (rotateY: 180)
      gsap.set(card, { rotateY: 180 });

      ScrollTrigger.create({
        trigger: item,
        start: 'top 80%',
        onEnter: () => {
          store.state.activeMediaIndex = index;
          item.classList.add('in-view');
          gsap.set(card, { rotateY: 180 }); // Always guarantee text side shows first
          // 1. Enter with words side already showing, pop in
          gsap.to(item, {
            opacity: 1, scale: 1, rotation: 0, y: 0,
            duration: 1.2, ease: 'back.out(1.5)',
            onComplete: () => {
              // 2. When playing, wait 1.8s so you read the text as it floats to the center, then flip to reveal the picture centered
              const flipDelay = store.state.playing ? 1.8 : 0.5;
              const flipDuration = store.state.playing ? 0.9 : 0.9;
              gsap.to(card, { rotateY: 0, duration: flipDuration, delay: flipDelay, ease: 'power2.inOut' });
            }
          });
        },
        onEnterBack: () => {
          store.state.activeMediaIndex = index;
          item.classList.add('in-view');
        },
        onLeave: () => {
          item.classList.remove('in-view');
        },
        onLeaveBack: () => {
          item.classList.remove('in-view');
          gsap.set(card, { rotateY: 180 }); // reset to words side
          gsap.to(item, { opacity: 0, scale: 0.6, rotation: 15, y: 200, duration: 0.5 });
        },
      });

      // GSAP-controlled hover flip (replaces the removed CSS hover rule)
      if (wrapper) {
        wrapper.addEventListener('mouseenter', () => {
          gsap.to(card, { rotateY: 180, duration: 0.7, ease: 'power2.inOut' });
        });
        wrapper.addEventListener('mouseleave', () => {
          gsap.to(card, { rotateY: 0, duration: 0.7, ease: 'power2.inOut' });
        });
      }
    });

    // --------------------------------------------------------
    // CHAPTER 3: THE CLIMAX WISH
    // --------------------------------------------------------
    gsap.set('.climax-wish', { opacity: 0, y: 30 });
    ScrollTrigger.create({
      trigger: '.climax-wish',
      start: 'top 90%',
      onEnter: () => {
        gsap.to('.climax-wish', { opacity: 1, y: 0, duration: 1.5 });
      },
    });

    ScrollTrigger.create({
      trigger: '.chapter-climax',
      start: 'top 50%',
      onEnter: () => {
        store.state.isOutroVisible = true;
      },
      onLeaveBack: () => {
        store.state.isOutroVisible = false;
      }
    });

  }, { scope: containerRef });

  React.useEffect(() => {
    // Auto-play and pause videos when they enter/leave the viewport
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.1 });

    const videos = document.querySelectorAll('.memory-media-video, .outro-media-video');
    videos.forEach(v => observer.observe(v));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="app-container" ref={containerRef}>
      {/* GLOBAL THEME OVERRIDE */}
      <style>
        {`
          :root {
            --accent: ${s.data.theme_color || '#ff8fa3'};
          }
        `}
      </style>

      {/* GLOBAL BACKGROUNDS */}
      <PetalCanvas />
      <AmbienceCanvas photos={s.data.photos} />

      {/* CHAPTER 1 */}
      <section className="chapter-intro">
        {s.data.intro_bg_video && (
          <video
            src={s.data.intro_bg_video}
            autoPlay
            loop
            muted
            playsInline
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100vh',
              objectFit: 'cover',
              zIndex: 0,
              opacity: 0.4,
              WebkitMaskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)',
              maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)'
            }}
          />
        )}
        <Canopy />
        {/* Text is rendered HERE in App, outside Canopy's stacking context entirely.
            z-index 200 means NOTHING in the page can ever render over this text. */}
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 200,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div className="intro-text-container">
            <div className="intro-line">{s.data.intro_poetry[0]}</div>
            <div className="intro-line">{s.data.intro_poetry[1]}</div>
          </div>
        </div>
      </section>

      {/* CHAPTER 2: THE TIMELINE */}
      <section className="chapter-timeline" ref={timelineRef}>
        {/* The Winding Stem */}
        <div className="timeline-stem">
          <div className="timeline-stem-fill"></div>
        </div>

        {/* The Massive Memories */}
        {s.data.photos.map((photo: any, i: number) => (
          <MemoryCard key={i} photo={photo} isLeft={i % 2 === 0} index={i} />
        ))}
      </section>

      {/* CHAPTER 3 */}
      <section className="chapter-climax" ref={climaxRef}>
        {s.data.outro_video && (
          <video
            src={s.data.outro_video}
            loop
            muted
            playsInline
            onContextMenu={(e) => e.preventDefault()}
            className="outro-media-video"
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: '100vh',
              objectFit: 'cover',
              zIndex: 0,
              opacity: 0.95,
              WebkitMaskImage: 'linear-gradient(to top, black 85%, transparent 100%)',
              maskImage: 'linear-gradient(to top, black 85%, transparent 100%)'
            }}
          />
        )}
        <Roots wish={s.data.final_wish} />
      </section>

      {/* Audio Controller */}
      <AudioController />

      {/* Floating Auto-Play Controller */}
      <PlayButton />
    </div>
  );
}

function App() {
  const s = useReactor(store);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    if (!path) {
      setLoading(false);
      return;
    }

    fetch(`/data/${path}.json`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        if (data.title) {
          document.title = data.title;
        }
        store.data = data;
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading || !s.data) {
    return (
      <div style={{ background: '#0a0a0a', width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
        <PetalCanvas />
        <p style={{
          margin: 0,
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.3)',
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '1.5rem',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          animation: 'pulse-memory 3s infinite ease-in-out',
          zIndex: 10
        }}>
          Awaiting a memory...
        </p>
        <style>{`
          @keyframes pulse-memory {
            0% { opacity: 0.2; transform: scale(0.98); }
            50% { opacity: 0.6; transform: scale(1); }
            100% { opacity: 0.2; transform: scale(0.98); }
          }
        `}</style>
      </div>
    );
  }

  return <BirthdayBliss />;
}

export default App;
