import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  // The viewBox is adjusted to match the width/height aspect ratio to prevent distortion.
  return (
    <svg
      viewBox="0 0 249 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="PMD Arquitectura Logo"
      {...props}
    >
      {/* Squares */}
      <rect x="15" y="0" width="40" height="40" fill="#38B6FF" />
      <rect x="105" y="0" width="40" height="40" fill="#0072C6" />
      <rect x="195" y="0" width="40" height="40" fill="#004A80" />

      {/* PMD Text */}
      <text
        x="50%"
        y="70"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="hsl(var(--foreground))"
        fontFamily="'PT Sans', sans-serif"
        fontSize="42"
        fontWeight="bold"
      >
        PMD
      </text>
      
      {/* ARQUITECTURA Text */}
       <text
        x="50%"
        y="98"
        dominantBaseline="middle"
        textAnchor="middle"
        fill="hsl(var(--foreground))"
        fontFamily="'Inter', sans-serif"
        fontSize="14"
        letterSpacing="3"
      >
        ARQUITECTURA
      </text>
    </svg>
  );
}
