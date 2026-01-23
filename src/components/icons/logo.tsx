import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 150 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="PMD Arquitectura Logo"
      {...props}
    >
      <rect x="0" y="0" width="40" height="40" rx="8" fill="#38B6FF" />
      <rect x="55" y="0" width="40" height="40" rx="8" fill="#0072C6" />
      <rect x="110" y="0" width="40" height="40" rx="8" fill="#004A80" />
    </svg>
  );
}
