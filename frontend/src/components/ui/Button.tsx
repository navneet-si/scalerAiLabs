import React from "react";

// Button primitive with 32px and 40px heights
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md";
  className?: string;
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center rounded transition-colors text-[14px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-1";

  const variants = {
    primary: "bg-[var(--color-purple-600)] text-white hover:bg-[var(--color-purple-700)]",
    secondary:
      "bg-white text-[var(--color-gray-700)] border border-[var(--color-gray-200)] hover:bg-[var(--color-gray-50)]",
    ghost: "bg-transparent text-[var(--color-gray-700)] hover:bg-[var(--color-gray-50)]",
    destructive: "bg-red-600 text-white hover:bg-red-700",
  };

  // sm: 32px (h-8), md: 40px (h-10)
  const sizes = {
    sm: "h-8 px-3",
    md: "h-10 px-4",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
