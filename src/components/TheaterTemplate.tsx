import React, { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { store } from '../store';
import '../styles/theater.css';
import { AudioController } from './AudioController';
import 'tmg-media-player/style.css';
(window as any).TMG_MEDIA_CSS_SRC = Symbol('T007_VIRTUAL_RESOURCE');

// @ts-ignore
import * as tmg from 'tmg-media-player/super';

// Video rendering (handled by TVP natively)
const VideoCard = ({ config }: { config: any }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Prevent Strict Mode double-instantiation on the same DOM node
    if (videoRef.current && !(videoRef.current as any).tmgPlayer) {
      const player = new tmg.Player();

      player.configure({
        skeleton: { exclusivePlay: { value: "video" } },
        light: {
          preview: { usePoster: false, min: 0, max: 5, loop: true, tease: true }
        },
        settings: { voice: { active: { value: false } } },
        ...config
      });

      player.attach(videoRef.current).catch((e: any) => {
        console.warn("TMG Player Attach Warning:", e);
      });
    }
  }, [config]);

  return (
    <div className="theater-media-wrapper">
      <video
        ref={videoRef}
        playsInline
        className="theater-video"
        onPlay={() => {
          const bgm = document.querySelector('audio');
          if (bgm) bgm.volume = 0.1;
        }}
        onPause={() => {
          const bgm = document.querySelector('audio');
          if (bgm) bgm.volume = 1.0;
        }}
      />
    </div>
  );
};

// Image rendering with ambient canvas glow
const ImageCard = ({ src }: { src: string }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 4;
    canvas.height = 4;

    const drawImage = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };

    if (img.complete) {
      drawImage();
    } else {
      img.addEventListener('load', drawImage);
      return () => img.removeEventListener('load', drawImage);
    }
  }, [src]);

  return (
    <div className="theater-media-container">
      <canvas ref={canvasRef} className="theater-ambient" aria-hidden="true" />
      <div className="theater-media-inner">
        <img ref={imgRef} src={src} alt="Memory" className="theater-image" />
      </div>
    </div>
  );
};

export const TheaterTemplate: React.FC = () => {
  const data = store.data;
  const [currentSection, setCurrentSection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAnimating = useRef(false);

  // Transition to next section
  const nextSection = () => {
    if (!containerRef.current || isAnimating.current) return;
    const currentSlide = containerRef.current.children[currentSection] as HTMLElement;
    const nextSlide = containerRef.current.children[currentSection + 1] as HTMLElement;
    
    if (nextSlide) {
      isAnimating.current = true;
      // Fade out current
      gsap.to(currentSlide, { opacity: 0, scale: 0.95, duration: 0.8, ease: 'power2.inOut', onComplete: () => {
        setCurrentSection(s => s + 1);
      }});
    }
  };

  // When currentSection changes, animate the new slide in
  useGSAP(() => {
    if (!containerRef.current) return;
    const currentSlide = containerRef.current.children[currentSection] as HTMLElement;
    
    if (currentSlide) {
      gsap.fromTo(currentSlide, 
        { opacity: 0, scale: 1.05, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 1, ease: 'power2.out', delay: 0.2, onComplete: () => {
          isAnimating.current = false;
        }}
      );
    }
  }, { dependencies: [currentSection], scope: containerRef });

  const handleStart = () => {
    if (!store.state.audioUnlocked) {
      store.state.audioUnlocked = true;
    }
    // Set activeMediaIndex so AudioController plays the BGM
    store.intent.playing = true;
    nextSection();
  };

  const handleLetterReveal = (e: React.MouseEvent) => {
    const btn = e.currentTarget as HTMLButtonElement;
    const letterContent = btn.nextElementSibling as HTMLDivElement;
    
    gsap.to(btn, { opacity: 0, height: 0, margin: 0, duration: 0.5 });
    gsap.fromTo(letterContent, 
      { opacity: 0, height: 0 },
      { opacity: 1, height: 'auto', duration: 1, ease: 'power2.out', delay: 0.3 }
    );
  };

  return (
    <div className="theater-container">
      <AudioController />
      
      <div className="theater-slideshow" ref={containerRef}>
        
        {/* Section 0: Opening */}
        <div className="theater-slide" style={{ display: currentSection === 0 ? 'flex' : 'none' }}>
          <div className="theater-content">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <h1 className="theater-title" style={{ margin: 0 }}>{data.opening.title}</h1>
              <span className="beating-heart" style={{ lineHeight: 1 }}>❤️</span>
            </div>
            <p className="theater-subtitle">{data.opening.subtitle}</p>
            <button className="theater-btn" onClick={handleStart}>✨ OPEN YOUR BIRTHDAY SURPRISE ✨</button>
          </div>
        </div>

        {/* Section 1: Message */}
        <div className="theater-slide" style={{ display: currentSection === 1 ? 'flex' : 'none' }}>
          <div className="theater-content">
            <h2 className="theater-heading">{data.message.title}</h2>
            <p className="theater-body">{data.message.body}</p>
            <button className="theater-btn" onClick={nextSection}>Continue ❤️</button>
          </div>
        </div>

        {/* Section 2: Video & Letter */}
        <div className="theater-slide" style={{ display: currentSection === 2 ? 'flex' : 'none' }}>
          <VideoCard config={data.video.config} />
          <div className="theater-content">
            <p className="theater-caption" style={{ marginTop: 0 }}>{data.video.caption}</p>
            <div className="theater-letter-section">
              <button className="theater-btn theater-btn-outline" onClick={handleLetterReveal}>💌 THERE'S MORE I WANT YOU TO KNOW…</button>
              <div className="theater-letter-content" style={{ opacity: 0, height: 0, overflow: 'hidden' }}>
                <p className="theater-body" style={{ whiteSpace: 'pre-line', textAlign: 'left' }}>
                  {data.letter.body}
                </p>
                <button className="theater-btn" onClick={nextSection} style={{ margin: '2rem 0' }}>Next ❤️</button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Distance */}
        <div className="theater-slide" style={{ display: currentSection === 3 ? 'flex' : 'none' }}>
          {data.guy_video && <VideoCard config={data.guy_video.config} />}
          <div className="theater-content">
            {data.guy_video && <p className="theater-caption" style={{ marginTop: 0 }}>{data.guy_video.caption}</p>}
            <h2 className="theater-heading">{data.distance.title}</h2>
            <p className="theater-body theater-highlight">{data.distance.body}</p>
            <button className="theater-btn" onClick={nextSection}>🎁 ONE LAST THING…</button>
          </div>
        </div>

        {/* Section 4: Final */}
        <div className="theater-slide" style={{ display: currentSection === 4 ? 'flex' : 'none' }}>
          <ImageCard src={data.final.image} />
          <div className="theater-content">
            <h2 className="theater-heading">{data.final.message}</h2>
          </div>
        </div>

      </div>
    </div>
  );
};

