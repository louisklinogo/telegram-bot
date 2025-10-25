import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

interface SpinnerProps extends Omit<SVGProps<SVGSVGElement>, "width" | "height"> {
  /**
   * The size of the spinner in pixels.
   * @default 20
   */
  size?: number;
}

export const Spinner = ({ className, size = 20, style, ...props }: SpinnerProps) => (
  <svg
    className={cn("animate-spin stroke-muted-foreground", className)}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.5"
    style={{ width: size, height: size, ...style }}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M12 3v3m6.366-.366-2.12 2.12M21 12h-3m.366 6.366-2.12-2.12M12 21v-3m-6.366.366 2.12-2.12M3 12h3m-.366-6.366 2.12 2.12" />
  </svg>
);
