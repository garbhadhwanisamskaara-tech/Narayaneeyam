import type { SVGProps } from "react";

interface PeacockFeatherIconProps extends SVGProps<SVGSVGElement> {
  title?: string;
}

/**
 * A stylised peacock feather (mayilpeeli) icon.
 * Uses currentColor so it inherits the surrounding text color (e.g. text-feather-chant, text-secondary).
 */
export function PeacockFeatherIcon({
  title,
  className,
  ...props
}: PeacockFeatherIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden={title ? undefined : "true"}
      aria-label={title}
      role={title ? "img" : "presentation"}
      {...props}
    >
      {title && <title>{title}</title>}
      {/* Quill */}
      <path
        d="M12 21.5V14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.7"
      />
      {/* Outer feather body */}
      <path
        d="M12 14.5c4.2-1.5 7-5.2 7-9.5 0-1.8-0.6-3.3-1.5-4.5-1.5 1.8-3.5 3-5.5 3s-4-1.2-5.5-3C5.6 1.7 5 3.2 5 5c0 4.3 2.8 8 7 9.5z"
        fill="currentColor"
        opacity="0.18"
      />
      {/* Mid feather body */}
      <path
        d="M12 13c3.1-1.1 5.2-4 5.2-7.3 0-1.3-0.4-2.4-1.1-3.3-1.1 1.3-2.6 2.2-4.1 2.2s-3-0.9-4.1-2.2C7.2 3.3 6.8 4.4 6.8 5.7 6.8 9 8.9 11.9 12 13z"
        fill="currentColor"
        opacity="0.35"
      />
      {/* Inner feather */}
      <path
        d="M12 11.5c2-0.7 3.3-2.6 3.3-4.7 0-0.9-0.3-1.6-0.7-2.2-0.7 0.9-1.7 1.4-2.6 1.4s-1.9-0.5-2.6-1.4c-0.4 0.6-0.7 1.3-0.7 2.2 0 2.1 1.3 4 3.3 4.7z"
        fill="currentColor"
        opacity="0.55"
      />
      {/* The eye (outer ring) */}
      <circle cx="12" cy="8" r="3.2" fill="currentColor" />
      {/* The eye (inner ring) */}
      <circle cx="12" cy="8" r="1.9" fill="hsl(var(--background))" />
      {/* Eye centre */}
      <circle cx="12" cy="8" r="0.9" fill="currentColor" />
      {/* Decorative barb lines */}
      <path
        d="M9.5 11c-0.5 0.8-0.8 1.8-0.8 2.8M14.5 11c0.5 0.8 0.8 1.8 0.8 2.8"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

export default PeacockFeatherIcon;
