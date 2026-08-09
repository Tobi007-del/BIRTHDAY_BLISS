import { reactive, intent } from "sia-reactor";

// Our strictly typed global state with S.I.A. intent/state separation
export const store = reactive({
  intent: intent({
    mouseX: typeof window !== "undefined" ? window.innerWidth / 2 : 500,
    mouseY: typeof window !== "undefined" ? window.innerHeight / 2 : 500,
    scrollProgress: 0,
    activeChapter: "intro", // "intro" | "vault" | "climax"
    playing: false,
  }),
  state: {
    playing: false,
    lastChapter: "intro",
    playCount: 0,
    hasWatchedClimax: false,
    audioUnlocked: false,
    activeMediaIndex: 0,
    isOutroVisible: false,
  },
  data: null as any | null,
});

// Logic Layer: Capture & arbitrate play intent
store.on("intent.playing", (e: any) => {
  const isPlaying = Boolean(e.value);
  store.state.playing = isPlaying;
  if (isPlaying) {
    store.state.playCount = (store.state.playCount || 0) + 1;
  }
});

if (typeof window !== "undefined") {
  // Track progress in state during the session
  store.watch("intent.activeChapter", (val: string) => {
    if (val) {
      store.state.lastChapter = val;
      if (val === "climax") {
        store.state.hasWatchedClimax = true;
      }
    }
  });

  // The CSS Black Box Pattern!
  // Synchronously write mouse coordinates to the DOM for native CSS lighting performance.
  store.watch("intent.mouseX", (val: number) => {
    document.documentElement.style.setProperty("--mouse-x", `${val}px`);
  });

  store.watch("intent.mouseY", (val: number) => {
    document.documentElement.style.setProperty("--mouse-y", `${val}px`);
  });

  // Sync scroll progress directly to CSS for global timeline-based CSS tweaks if needed
  store.watch("intent.scrollProgress", (val: number) => {
    document.documentElement.style.setProperty("--scroll-progress", `${val}`);
  });

  // Wire up the mouse listener globally
  window.addEventListener("mousemove", (e) => {
    store.intent.mouseX = e.clientX;
    store.intent.mouseY = e.clientY;
  });
}
