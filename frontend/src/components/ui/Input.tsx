import React from "react";

// Input primitive matching UX spec (4px radius, 14px text)
type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`flex h-10 w-full rounded border border-[var(--color-gray-200)] bg-white px-3 py-2 text-[14px] text-[var(--color-gray-900)] placeholder:text-[var(--color-gray-400)] outline-none focus:border-[var(--color-purple-600)] focus:ring-1 focus:ring-[var(--color-purple-600)] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
