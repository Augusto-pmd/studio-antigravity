import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 40"
      width="120"
      height="30"
      aria-label="PMD Manager Logo"
      {...props}
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: "hsl(var(--primary))" }} />
          <stop offset="100%" style={{ stopColor: "hsl(var(--secondary))" }} />
        </linearGradient>
      </defs>
      <text
        x="0"
        y="30"
        fontFamily="var(--font-headline), sans-serif"
        fontSize="32"
        fontWeight="bold"
        fill="url(#logo-gradient)"
      >
        PMD
      </text>
      <text
        x="80"
        y="28"
        fontFamily="var(--font-body), sans-serif"
        fontSize="18"
        fontWeight="500"
        fill="hsl(var(--foreground))"
      >
        Manager
      </text>
    </svg>
  );
}
