import { Link, type LinkProps } from "react-router-dom";
import { cn } from "../../lib/utils";

export const textLinkStyles =
  "rounded-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring";

export function TextLink({ className, ...props }: LinkProps) {
  return <Link className={cn(textLinkStyles, className)} {...props} />;
}
