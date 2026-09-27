const fs = require('fs');
const file = 'src/components/TheaterTemplate.tsx';
let content = fs.readFileSync(file, 'utf8');

const newVideoCard = `const VideoCard = ({ config }: { config: any }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && !(videoRef.current as any).tmgPlayer) {
      const player = new Player();
      
      const baseConfig: any = {
        skeleton: {
          exclusivePlay: { value: 'video' }
        },
        light: {
          preview: {
            usePoster: false,
            min: 0,
            max: 5,
            loop: true,
            tease: true
          }
        },
        settings: {
          voice: { active: { value: false } }
        }
      };

      player.configure(baseConfig);
      if (config) player.configure(config);

      player.attach(videoRef.current).catch(e => {
        console.warn('TMG Player Attach Warning:', e);
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
};`;

content = content.replace(/const VideoCard = \([^]+?<\/div>\s*\);\s*};/, newVideoCard);

content = content.replace(/<VideoCard src={data\.video\.src} \/>/g, '<VideoCard config={data.video.config} />');
content = content.replace(/<VideoCard src={data\.guy_video\.src} metadata={data\.guy_video\.metadata} \/>/g, '<VideoCard config={data.guy_video.config} />');

fs.writeFileSync(file, content, 'utf8');
