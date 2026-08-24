import type { SVGProps } from "react";

interface LogoProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

/**
 * Venster brand mark — an asymmetric grid of workspace "panels" (micro-hubs)
 * with a filled "capsule" in the bottom-right cell. Drawn with currentColor so
 * it inherits the surrounding text color (set style={{ color: "var(--color-accent)" }}).
 */
export default function Logo({ size = 36, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      {/* Outer rounded-square frame */}
      <rect x="4" y="4" width="40" height="40" rx="10" stroke="currentColor" strokeWidth="4" />
      {/* Full-width horizontal divider */}
      <path d="M4 24H44" stroke="currentColor" strokeWidth="4" />
      {/* Top vertical divider (slightly left of center) */}
      <path d="M23 4V24" stroke="currentColor" strokeWidth="4" />
      {/* Bottom vertical divider (further left) */}
      <path d="M20 24V44" stroke="currentColor" strokeWidth="4" />
      {/* Capsule in the bottom-right cell */}
      <rect x="24" y="28.5" width="16" height="11" rx="5.5" fill="currentColor" />
    </svg>
  );
}
