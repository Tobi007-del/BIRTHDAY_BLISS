import { useMemo, useEffect, useState } from 'react';

type RootBranch = { x1: number; y1: number; x2: number; y2: number; thickness: number };

const getWidth = () => document.documentElement.clientWidth || window.innerWidth;
const getHeight = () => document.documentElement.clientHeight || window.innerHeight;

export const Roots = ({ wish }: { wish: string }) => {
  const [dimensions, setDimensions] = useState({ width: getWidth(), height: getHeight() });

  useEffect(() => {
    const handleResize = () => setDimensions({ width: getWidth(), height: getHeight() });
    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleResize);
    document.addEventListener('webkitfullscreenchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
      document.removeEventListener('webkitfullscreenchange', handleResize);
    };
  }, []);

  const branches = useMemo(() => {
    const arr: RootBranch[] = [];
    const generateRoots = (x: number, y: number, angle: number, depth: number, length: number) => {
      if (depth === 0) return;
      const x2 = x + Math.cos(angle) * length;
      const y2 = y + Math.sin(angle) * length;
      arr.push({ x1: x, y1: y, x2, y2, thickness: Math.max(2, depth * 0.9) });
      
      const angleOffset1 = 0.3 + Math.random() * 0.6;
      const angleOffset2 = 0.3 + Math.random() * 0.6;
      generateRoots(x2, y2, angle - angleOffset1, depth - 1, length * (0.6 + Math.random() * 0.3));
      generateRoots(x2, y2, angle + angleOffset2, depth - 1, length * (0.6 + Math.random() * 0.3));
    };

    const w = dimensions.width;
    // Branch immediately from the tip (y = 0) so there is no fat vertical rectangle block
    generateRoots(w * 0.5, 0, Math.PI / 2 - 0.35, 7, 120);
    generateRoots(w * 0.5, 0, Math.PI / 2 + 0.35, 7, 120);

    return arr;
  }, [dimensions.width]);

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: '100%',
      height: '100vh',
      pointerEvents: 'none',
      zIndex: 1, 
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      paddingBottom: '15vh',
      background: 'linear-gradient(to top, #3e2723 0%, transparent 100%)'
    }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }} xmlns="http://www.w3.org/2000/svg">
        {branches.map((b, i) => (
          <line 
            key={i} 
            x1={b.x1} 
            y1={b.y1} 
            x2={b.x2} 
            y2={b.y2} 
            stroke="rgba(100, 50, 20, 0.6)" 
            strokeWidth={b.thickness}
            strokeLinecap="round"
          />
        ))}
      </svg>

      {/* Embedded Text */}
      <div className="climax-wish" style={{ position: 'relative', zIndex: 2 }}>
        {wish}
      </div>
    </div>
  );
};
