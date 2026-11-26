import { useEffect, useRef, useState } from "react";
import { World } from "@/exhibition/world";
import { SECTIONS } from "@/exhibition/sections";

export function ExhibitionRoad() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  const [station, setStation] = useState(-1);
  const [hintGone, setHintGone] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const world = new World(canvas, { onStation: setStation, onFirstMove: () => setHintGone(true) });
    worldRef.current = world;
    world.start();
    const onResize = () => world.resize();
    window.addEventListener("resize", onResize);

    // Drag-to-look, tracked by pointerId so a second thumb can hold a button.
    let lookId: number | null = null;
    let lx = 0, ly = 0;
    const down = (e: PointerEvent) => {
      if (lookId !== null) return;
      lookId = e.pointerId; lx = e.clientX; ly = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== lookId) return;
      world.look(e.clientX - lx, e.clientY - ly);
      lx = e.clientX; ly = e.clientY;
      world.markMoved();
    };
    const up = (e: PointerEvent) => { if (e.pointerId === lookId) lookId = null; };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    // Keyboard: W/S or up/down move, A/D or left/right turn.
    const keys = new Set<string>();
    const sync = () => {
      world.input = (keys.has("f") ? 1 : 0) - (keys.has("b") ? 1 : 0);
      world.yawInput = (keys.has("l") ? 1 : 0) - (keys.has("r") ? 1 : 0);
    };
    const map: Record<string, string> = { ArrowUp: "f", KeyW: "f", ArrowDown: "b", KeyS: "b", ArrowLeft: "l", KeyA: "l", ArrowRight: "r", KeyD: "r" };
    const kd = (e: KeyboardEvent) => { const k = map[e.code]; if (k) { e.preventDefault(); keys.add(k); sync(); world.markMoved(); } };
    const ku = (e: KeyboardEvent) => { const k = map[e.code]; if (k) { keys.delete(k); sync(); } };
    const blur = () => { keys.clear(); sync(); };
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("blur", blur);
    (window as unknown as { __game?: World }).__game = world;
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("blur", blur);
      world.dispose();
    };
  }, []);

  const holdProps = (dir: 1 | -1) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      if (worldRef.current) worldRef.current.input = dir;
    },
    onPointerUp: () => { if (worldRef.current) worldRef.current.input = 0; },
    onPointerCancel: () => { if (worldRef.current) worldRef.current.input = 0; },
    onLostPointerCapture: () => { if (worldRef.current) worldRef.current.input = 0; },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  return (
    <div ref={wrapRef} className="exhibit-root relative h-dvh w-full overflow-hidden bg-sky">
      <canvas ref={canvasRef} className="block h-full w-full" style={{ touchAction: "none" }} onContextMenu={(e) => e.preventDefault()} aria-hidden="true" />

      {/* Progress dots: tap to glide to a station */}
      <nav aria-label="Stations" className="absolute inset-x-0 top-0 flex justify-center" style={{ paddingTop: "max(14px, env(safe-area-inset-top))" }}>
        <div className="flex items-center gap-1 rounded-full bg-card/80 px-2 py-1.5 shadow-hud backdrop-blur-sm">
          {SECTIONS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => worldRef.current?.glideTo(i)}
              aria-label={`Go to station ${i + 1}: ${s.label}`}
              aria-current={station === i ? "step" : undefined}
              className="group flex items-center gap-2 rounded-full px-2.5 py-1.5 transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className={`block h-2.5 w-2.5 rounded-full transition-all duration-300 ${station === i ? "scale-125 bg-primary" : "bg-muted-foreground/40 group-hover:bg-muted-foreground/70"}`} />
              <span className={`hidden text-xs font-semibold sm:inline ${station === i ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <p
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-0 rounded-2xl bg-card/85 px-4 py-2 text-center text-sm font-medium text-foreground shadow-hud transition-opacity duration-700 ${hintGone ? "opacity-0" : "opacity-100"}`}
        style={{ left: "max(16px, env(safe-area-inset-left))", right: "calc(max(18px, env(safe-area-inset-right)) + 92px)", marginBottom: "max(28px, calc(env(safe-area-inset-bottom) + 20px))", maxWidth: 360 }}
      >
        Hold the arrows to move. Drag to look around.
      </p>

      <div className="absolute flex flex-col gap-3" style={{ right: "max(18px, env(safe-area-inset-right))", bottom: "max(22px, env(safe-area-inset-bottom))" }}>
        <button type="button" aria-label="Move forward" className="road-btn" {...holdProps(1)}>
          <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden="true"><path d="M12 5l7 8h-4.5v6h-5v-6H5z" fill="currentColor" /></svg>
        </button>
        <button type="button" aria-label="Move backward" className="road-btn" {...holdProps(-1)}>
          <svg viewBox="0 0 24 24" className="h-8 w-8 rotate-180" aria-hidden="true"><path d="M12 5l7 8h-4.5v6h-5v-6H5z" fill="currentColor" /></svg>
        </button>
      </div>

      <main className="sr-only">
        <h1>Exhibition Road</h1>
        {SECTIONS.map((s) => (
          <section key={s.id} aria-labelledby={`t-${s.id}`}>
            <h2 id={`t-${s.id}`}>{s.title}</h2>
            <p>{s.description}</p>
          </section>
        ))}
      </main>
    </div>
  );
}
