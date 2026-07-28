import { useMemo, useState, useEffect } from 'react';
import { useReactor } from 'sia-reactor/adapters/react';
import { store } from '../store';

type CanopyBranch = { x1: number; y1: number; x2: number; y2: number; thickness: number };
type Leaf = { x: number; y: number; scale: number; rotate: number; fill: string; isBlurred: boolean };

function hexToRgb(hex: string): [number, number, number] {
  let c = (hex || '#ff8da1').replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16) || 0xff8da1;
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

const getWidth = () => document.documentElement.clientWidth || window.innerWidth;
const getHeight = () => document.documentElement.clientHeight || window.innerHeight;

export const Canopy = () => {
  const s = useReactor(store);
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

  const { branches, leaves } = useMemo(() => {
    const bArr: CanopyBranch[] = [];
    const lArr: Leaf[] = [];
    const [r, g, b] = hexToRgb(s.data.petal_color || '#ff8da1');
    
    const generateCanopy = (x: number, y: number, angle: number, depth: number, length: number) => {
      if (depth === 0) return;
      const x2 = x + Math.cos(angle) * length;
      const y2 = y + Math.sin(angle) * length;
      bArr.push({ x1: x, y1: y, x2, y2, thickness: Math.max(2, depth * 1.0) });
      
      // Add leaves near the end of the branches
      if (depth < 5) {
        for(let i = 0; i < 2; i++) {
          lArr.push({
            x: x2 + (Math.random() * 80 - 40),
            y: y2 + (Math.random() * 80 - 40),
            scale: 0.5 + Math.random() * 2,
            rotate: Math.random() * 360,
            fill: `rgba(${r}, ${g}, ${b}, ${0.4 + Math.random() * 0.4})`,
            isBlurred: Math.random() > 0.6
          });
        }
      }

      const angleOffset1 = 0.5 + Math.random() * 0.8;
      const angleOffset2 = 0.5 + Math.random() * 0.8;
      generateCanopy(x2, y2, angle - angleOffset1, depth - 1, length * (0.7 + Math.random() * 0.2));
      generateCanopy(x2, y2, angle + angleOffset2, depth - 1, length * (0.7 + Math.random() * 0.2));
    };

    const w = dimensions.width;
    const h = dimensions.height;
    // Start at y = h * 0.9 (90vh, exactly where .chapter-intro ends and .timeline-stem begins)
    generateCanopy(w * 0.5, h * 0.9, -Math.PI / 2 - 0.35, 7, 130);
    generateCanopy(w * 0.5, h * 0.9, -Math.PI / 2 + 0.35, 7, 130);

    // Scatter 15 random loose leaves
    for (let i = 0; i < 15; i++) {
      lArr.push({
        x: Math.random() * w,
        y: Math.random() * (h * 0.5), 
        scale: 0.3 + Math.random() * 1.5,
        rotate: Math.random() * 360,
        fill: `rgba(${r}, ${g}, ${b}, ${0.3 + Math.random() * 0.5})`,
        isBlurred: Math.random() > 0.5
      });
    }

    return { branches: bArr, leaves: lArr };
  }, [dimensions.width, dimensions.height, s.data.petal_color]);

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100vh',
      overflow: 'visible',
      pointerEvents: 'none',
      zIndex: 1,
      background: 'linear-gradient(to bottom, rgba(255, 250, 205, 0.45) 0%, transparent 100%)',
    }}>
      <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="blur-canopy">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>
        <g>
          {branches.map((b, i) => (
            <line key={`b-${i}`} x1={b.x1} y1={b.y1} x2={b.x2} y2={b.y2}
              stroke="rgba(100, 50, 20, 0.7)" strokeWidth={b.thickness} strokeLinecap="round"
            />
          ))}
          {leaves.map((leaf, i) => (
            <g key={`l-${i}`} transform={`translate(${leaf.x}, ${leaf.y}) rotate(${leaf.rotate}) scale(${leaf.scale})`}>
              <path d="M0,15 C10,0 20,0 30,15 C20,30 10,30 0,15 Z"
                fill={leaf.fill} filter={leaf.isBlurred ? 'url(#blur-canopy)' : 'none'} />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};
