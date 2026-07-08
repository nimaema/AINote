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
  // Charcoal fill: the primary action. Solid, authoritative, no shadow.
  primary:
    "bg-ink text-bg hover:bg-ink-soft",
  // Intelligence / AI action: soft-mint tint with deep-green text and a mint edge.
  accent:
    "bg-accent-wash text-accent-deep border border-[color:var(--color-mint)] hover:bg-[color:var(--color-mint)]/25",
  // A white architectural tile that behaves like a button.
  glass:
    "glass text-ink hover:bg-panel",
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
