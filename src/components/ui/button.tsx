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
  // Vermilion fill: the primary action and the app's signal color.
  primary:
    "bg-accent text-accent-ink shadow-[0_10px_24px_-14px_rgba(255,79,0,0.7)] hover:shadow-[0_14px_30px_-14px_rgba(255,79,0,0.85)]",
  // Ink fill for secondary committed actions.
  accent:
    "bg-ink text-bg-2 hover:bg-ink-soft",
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
