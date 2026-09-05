import type { SVGProps } from "react";

export function HourglassIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 2h12M6 22h12" />
      <path d="M7 2v3a5 5 0 0 0 2.5 4.33L12 11l2.5-1.67A5 5 0 0 0 17 5V2" />
      <path d="M7 22v-3a5 5 0 0 1 2.5-4.33L12 13l2.5 1.67A5 5 0 0 1 17 19v3" />
    </svg>
  );
}
