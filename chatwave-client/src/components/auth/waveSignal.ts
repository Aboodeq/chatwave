type Listener = (strength: number) => void;

const listeners = new Set<Listener>();

/** Send a ripple through the sign-in pages' wave: a keystroke, a submitted form… */
export function sendWave(strength = 0.5): void {
  for (const listener of listeners) listener(strength);
}

export function onWave(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
