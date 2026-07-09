import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "x"
  | "trash"
  | "plus"
  | "minus"
  | "search"
  | "check"
  | "chevronLeft"
  | "chevronRight"
  | "settings";

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
};

export function Icon({ name, size = 16, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
      style={{ display: "block", flex: "0 0 auto", ...props.style }}
    >
      {paths[name]}
    </svg>
  );
}

const paths: Record<IconName, ReactNode> = {
  x: (
    <>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m15 15 5 5" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  chevronLeft: <path d="m15 18-6-6 6-6" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a7.8 7.8 0 0 0 .1-1l2-1.5-2-3.5-2.4 1a8 8 0 0 0-1.7-1L15 6h-4l-.4 3a8 8 0 0 0-1.7 1L6.5 9l-2 3.5 2 1.5a7.8 7.8 0 0 0 0 2l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 1.7 1l.4 3h4l.4-3a8 8 0 0 0 1.7-1l2.4 1 2-3.5Z" />
    </>
  ),
};
