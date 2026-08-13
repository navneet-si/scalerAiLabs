import React from "react";

// Avatar primitive supports circular (top bar) or rounded-square 4px (speakers)
type AvatarProps = {
  name: string;
  initials: string;
  color: string;
  shape?: "circle" | "square";
  size?: 20 | 24 | 32;
  className?: string;
};

export function Avatar({
  name,
  initials,
  color,
  shape = "square",
  size = 20,
  className = "",
}: AvatarProps) {
  const shapeClass = shape === "circle" ? "rounded-full" : "rounded"; // rounded is 4px
  
  return (
    <div
      className={`inline-flex items-center justify-center text-white font-medium ${shapeClass} ${className}`}
      style={{
        backgroundColor: color,
        width: `${size}px`,
        height: `${size}px`,
        fontSize: size <= 20 ? "12px" : "14px",
      }}
      title={name}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
