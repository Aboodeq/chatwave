import type { ReactNode } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "../../lib/utils";

export function Alert({
  tone = "error",
  children,
  className,
}: {
  tone?: "error" | "success";
  children: ReactNode;
  className?: string;
}) {
  const Icon = tone === "error" ? CircleAlert : CircleCheck;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex animate-fade-in items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm",
        tone === "error" ? "bg-danger-soft text-danger" : "bg-success-soft text-success",
        className,
      )}
    >
      <Icon className="mt-px size-4 shrink-0" aria-hidden="true" />
      <div className="font-medium">{children}</div>
    </div>
  );
}
