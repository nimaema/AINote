"use client";

import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "glass" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium " +
  "cursor-pointer select-none rounded-btn " +
  "transition-[transform,background-color,box-shadow,color,opacity] duration-150 [transition-timing-function:var(--ease-out)] " +
  "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const variants: Record<Variant, string> = {
  // Amber fill: the primary action and the app's only signal color.
  primary:
    "bg-accent text-accent-ink shadow-[0_14px_30px_-18px_rgba(240,182,74,0.8)] hover:shadow-[0_16px_34px_-16px_rgba(240,182,74,0.85)]",
  // Dark fill for secondary committed actions.
  accent:
    "bg-panel-lift text-ink shadow-[inset_0_0_0_1px_var(--color-hairline-strong)] hover:bg-panel",
  glass:
    "glass text-ink hover:bg-panel-lift",
  ghost: "text-muted hover:text-ink hover:bg-panel",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-[15px]",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
