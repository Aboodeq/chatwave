import { LogoMark } from "./Logo";

/** While a screen (or the language file) loads. */
export function FullScreenLoader() {
  return (
    <div className="grid min-h-dvh place-items-center bg-canvas">
      <LogoMark className="size-10 animate-pulse" />
    </div>
  );
}
