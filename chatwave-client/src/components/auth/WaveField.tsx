import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "../../lib/utils";
import { onWave } from "./waveSignal";

export interface WaveRider {
  /** Across the field: 0 is the start edge, 1 the end edge. */
  at: number;
  /** Into the field: 0 is the nearest line, 1 the horizon. */
  depth: number;
  /** Hide it on small screens with classes on the content (e.g. "hidden lg:flex"). */
  children: ReactNode;
}

interface Ripple {
  born: number;
  strength: number;
}

/** A glowing dot travelling along one line of the wave: a message in transit. */
interface Signal {
  /** Depth of the line it rides (0 near, 1 far). */
  z: number;
  /** Across the field, 0 to 1. */
  u: number;
  /** Fraction of the width per second; negative travels toward the start side. */
  speed: number;
  born: number;
  /** Milliseconds; ambient signals loop forever. */
  life: number;
}

const AMBIENT_DEPTHS = [0.1, 0.2, 0.31, 0.43, 0.56, 0.7];

interface Palette {
  background: string;
  near: [number, number, number];
  far: [number, number, number];
  signal: [number, number, number];
  signalCore: [number, number, number];
  glow: boolean;
}

/** Where far lines converge, as a fraction of the field's height. */
const HORIZON = 0.08;
/** How strongly lines bunch up with distance. */
const PERSPECTIVE = 2.8;
const FAR = 1 / (1 + PERSPECTIVE);

const project = (z: number) => {
  const p = 1 / (1 + z * PERSPECTIVE);
  return { p, t: (p - FAR) / (1 - FAR) };
};

const rgb = (value: string): [number, number, number] => {
  const parts = value.trim().split(/[\s,]+/).map(Number);
  return parts.length >= 3 && parts.every(Number.isFinite) ? [parts[0], parts[1], parts[2]] : [15, 127, 124];
};

function readPalette(element: HTMLElement): Palette {
  const styles = getComputedStyle(element);
  const dark = document.documentElement.classList.contains("dark");
  return {
    background: styles.getPropertyValue("--auth-bg").trim() || "#eef4f4",
    near: rgb(styles.getPropertyValue("--wave-near")),
    far: rgb(styles.getPropertyValue("--wave-far")),
    signal: dark ? [94, 234, 212] : [20, 184, 166],
    signalCore: dark ? [220, 255, 250] : [8, 94, 92],
    glow: dark,
  };
}

/**
 * The sign-in pages' backdrop: a field of fine lines in perspective, like a sound wave
 * receding to the horizon. It drifts on its own, and every `sendWave()` (each keystroke
 * in the form) sends a ripple through it. Riders are small cards that bob on the surface.
 *
 * Drawn on a canvas, far lines first, each filling the space below it so nearer lines
 * hide farther ones. Respects reduced motion, and pauses while the tab is hidden.
 */
export function WaveField({
  className,
  riders = [],
  origin = { at: 0.72, depth: 0.08 },
}: {
  className?: string;
  riders?: WaveRider[];
  /** Where ripples start. */
  origin?: { at: number; depth: number };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const riderRefs = useRef<(HTMLDivElement | null)[]>([]);
  const ridersRef = useRef(riders);
  const originRef = useRef(origin);

  useEffect(() => {
    ridersRef.current = riders;
    originRef.current = origin;
  });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!container || !canvas || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let palette = readPalette(container);
    let width = 0;
    let height = 0;
    let rtl = false;
    let ripples: Ripple[] = [];
    let signals: Signal[] = AMBIENT_DEPTHS.map((z, i) => ({
      z,
      u: (i * 0.37 + 0.11) % 1,
      speed: 0.028 + (i % 3) * 0.012,
      born: 0,
      life: Infinity,
    }));
    let energy = 0;
    let phase = 7.3; // a pleasing starting shape for the still frame
    let last = performance.now();
    let frame = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = container.clientWidth;
      height = container.clientHeight;
      rtl = getComputedStyle(container).direction === "rtl";
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    // Surface coordinates: x across (wider in the distance, as in real perspective), z into it.
    const surfaceX = (screenX: number, p: number) => ((screenX - width / 2) / (width * 0.5 * p)) * 1.6;

    const draw = (now: number) => {
      const lines = width < 640 ? 28 : 52;
      const step = width < 640 ? 9 : 7;
      const o = originRef.current;
      const originP = project(o.depth).p;
      const originX = surfaceX((rtl ? 1 - o.at : o.at) * width, originP);
      const live = ripples.filter((ripple) => now - ripple.born < 3200);

      // A broad swell, tallest toward the start side where the riders float.
      const swell = (fraction: number) => 0.62 + 0.55 * Math.exp(-((fraction - 0.3) ** 2) / 0.09);

      const surface = (x: number, z: number, fraction: number) => {
        let h =
          Math.sin(x * 1.9 + phase * 0.5 + z * 3.1) * 0.55 +
          Math.sin(x * 3.3 - phase * 0.37 + z * 5.3 + 1.7) * 0.32 +
          Math.sin((x * 0.8 + z) * 6.1 + phase * 0.85) * 0.16;
        h *= (0.72 + 0.28 * Math.sin(z * 2.2 - phase * 0.21)) * (1 + energy * 0.55) * swell(fraction);
        for (const ripple of live) {
          const age = (now - ripple.born) / 1000;
          const dx = x - originX;
          const dz = (z - o.depth) * 2.4;
          const off = Math.sqrt(dx * dx + dz * dz) - age * 1.35;
          // Gentle enough that nearer lines never fold over farther ones.
          h += 0.45 * ripple.strength * Math.exp(-age * 1.2) * Math.exp(-(off * off) / 0.045) * Math.cos(off * 11);
        }
        return h;
      };

      context.clearRect(0, 0, width, height);
      context.lineJoin = "round";

      // Each signal rides the line nearest its depth, drawn with that line so nearer lines hide it.
      const signalsByLine = new Map<number, Signal[]>();
      for (const signal of signals) {
        const index = Math.round(signal.z * (lines - 1));
        signalsByLine.set(index, [...(signalsByLine.get(index) ?? []), signal]);
      }

      for (let j = lines - 1; j >= 0; j--) {
        const z = j / (lines - 1);
        const { p, t } = project(z);
        const baseY = height * HORIZON + (height * 1.04 - height * HORIZON) * t;
        const amplitude = height * 0.15 * p;

        context.beginPath();
        for (let sx = -step; sx <= width + step; sx += step) {
          const sy = baseY - surface(surfaceX(sx, p), z, (rtl ? width - sx : sx) / width) * amplitude;
          if (sx === -step) context.moveTo(sx, sy);
          else context.lineTo(sx, sy);
        }

        // Hide the farther lines behind this one.
        context.save();
        context.lineTo(width + step, height + 4);
        context.lineTo(-step, height + 4);
        context.closePath();
        context.fillStyle = palette.background;
        context.fill();
        context.restore();

        const mix = Math.pow(z, 0.8);
        const [r, g, b] = palette.near.map((near, i) => Math.round(near + (palette.far[i] - near) * mix));
        let alpha = 0.9 * Math.pow(1 - z, 1.1) + 0.07;
        if (z > 0.86) alpha *= (1 - z) / 0.14;
        const lineWidth = 0.55 + 1.15 * Math.pow(1 - z, 1.5);

        if (palette.glow) {
          context.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.16})`;
          context.lineWidth = lineWidth * 3.4;
          context.stroke();
        }
        context.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        context.lineWidth = lineWidth;
        context.stroke();

        for (const signal of signalsByLine.get(j) ?? []) {
          const age = now - signal.born;
          const fade = Number.isFinite(signal.life)
            ? Math.min(1, age / 250) * Math.min(1, (signal.life - age) / 700)
            : Math.min(1, Math.max(0, Math.min(signal.u, 1 - signal.u) / 0.08));
          if (fade <= 0) continue;
          const radius = 1.4 + 2.2 * t;
          // A short tail, then the head with a soft halo.
          for (let k = 4; k >= 0; k--) {
            const u = signal.u - Math.sign(signal.speed) * k * 0.006;
            const sx = (rtl ? 1 - u : u) * width;
            const sy = baseY - surface(surfaceX(sx, p), z, u) * amplitude;
            const tailAlpha = fade * (k === 0 ? 1 : 0.32 * (1 - k / 5));
            if (k === 0) {
              const halo = context.createRadialGradient(sx, sy, 0, sx, sy, radius * 4.5);
              halo.addColorStop(0, `rgba(${palette.signal.join(",")},${0.5 * fade})`);
              halo.addColorStop(1, `rgba(${palette.signal.join(",")},0)`);
              context.fillStyle = halo;
              context.beginPath();
              context.arc(sx, sy, radius * 4.5, 0, Math.PI * 2);
              context.fill();
            }
            context.fillStyle = `rgba(${palette.signalCore.join(",")},${tailAlpha})`;
            context.beginPath();
            context.arc(sx, sy, k === 0 ? radius : radius * (1 - k * 0.15), 0, Math.PI * 2);
            context.fill();
          }
        }
      }

      // Riders sit on the surface at their spot.
      ridersRef.current.forEach((rider, index) => {
        const element = riderRefs.current[index];
        if (!element) return;
        const { p, t } = project(rider.depth);
        const sx = (rtl ? 1 - rider.at : rider.at) * width;
        const sy =
          height * HORIZON +
          (height * 1.04 - height * HORIZON) * t -
          surface(surfaceX(sx, p), rider.depth, rider.at) * height * 0.15 * p;
        // Farther riders look a little smaller.
        const scale = 0.86 + 0.14 * t;
        element.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -100%) translateY(-12px) scale(${scale.toFixed(3)})`;
      });

      ripples = live;
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      energy *= Math.exp(-dt * 1.6);
      phase += dt * (1 + energy * 0.8);
      signals = signals.filter((signal) => {
        signal.u += signal.speed * dt * (1 + energy * 0.5);
        if (!Number.isFinite(signal.life)) {
          if (signal.u > 1.04) signal.u -= 1.08;
          return true;
        }
        return now - signal.born < signal.life && signal.u > -0.05 && signal.u < 1.05;
      });
      draw(now);
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      cancelAnimationFrame(frame);
      if (reducedMotion.matches || document.hidden) {
        draw(performance.now());
        return;
      }
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    resize();
    start();

    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw(performance.now());
    });
    resizeObserver.observe(container);

    const themeObserver = new MutationObserver(() => {
      palette = readPalette(container);
      draw(performance.now());
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

    const stopListening = onWave((strength) => {
      if (reducedMotion.matches) return;
      const now = performance.now();
      ripples = [...ripples.slice(-9), { born: now, strength }];
      energy = Math.min(1.6, energy + strength * 0.35);
      // Words travel: each keystroke sends a signal from the form toward the start side.
      const count = strength >= 1 ? 5 : 1;
      const o = originRef.current;
      const sent = Array.from({ length: count }, () => ({
        z: 0.04 + Math.random() * 0.3,
        u: o.at + (Math.random() - 0.5) * 0.06,
        speed: -(0.14 + Math.random() * 0.1),
        born: now,
        life: 2600 + Math.random() * 600,
      }));
      signals = [...signals.filter((signal) => !Number.isFinite(signal.life) || now - signal.born < signal.life).slice(-24), ...sent];
    });

    document.addEventListener("visibilitychange", start);
    reducedMotion.addEventListener("change", start);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      stopListening();
      document.removeEventListener("visibilitychange", start);
      reducedMotion.removeEventListener("change", start);
    };
  }, []);

  return (
    <div ref={containerRef} aria-hidden="true" className={cn("pointer-events-none", className)}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full [mask-image:linear-gradient(to_bottom,transparent,black_40%)]"
      />
      {riders.map((rider, index) => (
        <div
          key={index}
          ref={(element) => {
            riderRefs.current[index] = element;
          }}
          className="absolute top-0 left-0 origin-bottom will-change-transform"
        >
          {rider.children}
        </div>
      ))}
    </div>
  );
}
