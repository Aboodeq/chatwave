import { Switch as RadixSwitch } from "radix-ui";
import { cn } from "../../lib/utils";

interface SwitchProps {
  id?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  "aria-describedby"?: string;
  className?: string;
}

export function Switch({ className, ...props }: SwitchProps) {
  return (
    <RadixSwitch.Root
      {...props}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full bg-surface-3 transition-colors",
        "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        "data-[state=checked]:bg-primary disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <RadixSwitch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow-soft transition-transform data-[state=checked]:translate-x-[1.375rem] rtl:-translate-x-0.5 rtl:data-[state=checked]:-translate-x-[1.375rem]" />
    </RadixSwitch.Root>
  );
}
