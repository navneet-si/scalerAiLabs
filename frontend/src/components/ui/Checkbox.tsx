import React from "react";

// Checkbox primitive matching UX spec
type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function Checkbox({ label, className = "", ...props }: CheckboxProps) {
  return (
    <label className={`inline-flex items-center cursor-pointer ${className}`}>
      <input
        type="checkbox"
        className="w-4 h-4 rounded text-purple-600 border-gray-300 focus:ring-purple-600 cursor-pointer accent-[var(--color-purple-600)]"
        {...props}
      />
      {label && <span className="ml-2 text-[14px] text-[var(--color-gray-700)]">{label}</span>}
    </label>
  );
}
