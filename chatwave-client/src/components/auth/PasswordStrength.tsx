import { cn } from "../../lib/utils";

const levels = [
  { label: "Too short", bar: "bg-danger", text: "text-danger" },
  { label: "Weak", bar: "bg-danger", text: "text-danger" },
  { label: "Fair", bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  { label: "Good", bar: "bg-primary", text: "text-primary" },
  { label: "Strong", bar: "bg-success", text: "text-success" },
];

/** Rough guide only: length matters most, variety helps. The server enforces the real rules. */
function scorePassword(password: string): number {
  if (password.length < 8) return 0;
  let score = 1;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score = scorePassword(password);
  const level = levels[score];

  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <div className="flex flex-1 gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <span
            key={step}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              score >= step ? level.bar : "bg-surface-3",
            )}
          />
        ))}
      </div>
      <span className={cn("w-16 text-end text-xs font-medium", level.text)}>
        <span className="sr-only">Password strength: </span>
        {level.label}
      </span>
    </div>
  );
}
