import { useEffect, useRef } from 'react';
import { store } from '../store';
import { useReactor } from 'sia-reactor/adapters/react';
import gsap from 'gsap';

export function AudioController() {
  const bgmRef = useRef<HTMLAudioElement>(null);
  
  // Bind directly to our reactive store
  useReactor(store);
  const { playing, activeMediaIndex, audioUnlocked, isOutroVisible } = store.state;
  const data = store.data;

  // 1. Listen for ALL user interactions to unlock native audio reliably
  useEffect(() => {
    const handleInteraction = () => {
      if (!store.state.audioUnlocked) {
        store.state.audioUnlocked = true;
        if (bgmRef.current) {
          // A pure, native HTML5 play call inside a valid user gesture works 100% of the time.
          bgmRef.current.play().catch(() => {});
        }
      }
    };

    const events = ['click', 'pointerdown', 'keydown'];
    events.forEach(e => document.addEventListener(e, handleInteraction, true));

    return () => {
      events.forEach(e => document.removeEventListener(e, handleInteraction, true));
    };
  }, []);

  // 2. Play/Pause BGM based on playing state
  useEffect(() => {
    if (audioUnlocked && bgmRef.current) {
      if (playing) {
        bgmRef.current.play().catch(() => {});
      } else {
        // Just fade down when not actively playing the experience
      }
    }
  }, [audioUnlocked, playing]);

  // 3. Audio Arbitration Logic (BGM vs Video vs Outro)
  useEffect(() => {
    if (!audioUnlocked) return;
    
    const bgm = bgmRef.current;
    if (!bgm) return;

    const videos = document.querySelectorAll('.memory-media-video');
    const outroVideo = document.querySelector('.outro-media-video') as HTMLVideoElement | null;
    const activeMediaUrl = data?.photos[activeMediaIndex]?.src;
    const isVideoCentered = !!activeMediaUrl?.match(/\.(mp4|webm|mov)$/i);

    // BGM Fade Logic via Native HTML5 Volume + GSAP
    const targetVolume = (isOutroVisible || isVideoCentered) ? 0.15 : (playing ? 1.0 : 0.3);
    gsap.to(bgm, { volume: targetVolume, duration: 0.5, ease: 'power2.out' });

    // Outro Video Play/Pause & Mute/Unmute Logic
    if (outroVideo) {
      if (isOutroVisible) {
        outroVideo.muted = false;
        outroVideo.volume = 1.0;
        outroVideo.play().catch(() => {});
      } else {
        outroVideo.muted = true;
        outroVideo.pause();
      }
    }

    // Memory Videos Play/Pause & Mute/Unmute Logic
    videos.forEach((v) => {
      const video = v as HTMLVideoElement;
      const decodedSrc = decodeURIComponent(video.src);
      const isActiveVideo = !isOutroVisible && isVideoCentered && decodedSrc.includes(activeMediaUrl!);
      
      if (isActiveVideo) {
        video.muted = false;
        video.volume = 1.0;
        video.play().catch(() => {});
      } else {
        video.muted = true;
        video.pause();
      }
    });

  }, [playing, activeMediaIndex, audioUnlocked, isOutroVisible, data]);

  if (!data) return null;

  return (
    <audio
      ref={bgmRef}
      src={data.bgm}
      loop
      style={{ display: 'none' }}
    />
  );
}
