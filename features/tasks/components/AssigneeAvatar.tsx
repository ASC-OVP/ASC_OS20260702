import type { CSSProperties } from "react";

type Props = {
  seed: string;
  size?: number;
};

const tones = [
  { bg: "var(--asc-primary-soft)", fg: "var(--asc-primary)" },
  { bg: "var(--asc-info-soft)", fg: "var(--asc-info)" },
  { bg: "var(--asc-success-soft)", fg: "var(--asc-success)" },
  { bg: "var(--asc-warning-soft)", fg: "var(--asc-warning-text)" },
];

export default function AssigneeAvatar({ seed, size = 40 }: Props) {
  const tone = tones[hashSeed(seed) % tones.length];
  const headSize = Math.round(size * 0.3);
  const shoulderWidth = Math.round(size * 0.58);
  const shoulderHeight = Math.round(size * 0.25);

  return (
    <span
      aria-hidden="true"
      style={{
        ...avatar,
        width: size,
        height: size,
        background: tone.bg,
        color: tone.fg,
      }}
    >
      <span style={{ ...head, width: headSize, height: headSize, top: Math.round(size * 0.2) }} />
      <span
        style={{
          ...shoulders,
          width: shoulderWidth,
          height: shoulderHeight,
          bottom: Math.round(size * 0.19),
          borderTopLeftRadius: shoulderWidth,
          borderTopRightRadius: shoulderWidth,
        }}
      />
    </span>
  );
}

function hashSeed(value: string) {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
}

const avatar: CSSProperties = {
  position: "relative",
  display: "inline-grid",
  placeItems: "center",
  flex: "0 0 auto",
  borderRadius: "50%",
  overflow: "hidden",
  boxShadow: "inset 0 0 0 1px color-mix(in srgb, currentColor 16%, transparent)",
};

const head: CSSProperties = {
  position: "absolute",
  left: "50%",
  transform: "translateX(-50%)",
  borderRadius: "50%",
  background: "currentColor",
  opacity: 0.72,
};

const shoulders: CSSProperties = {
  position: "absolute",
  left: "50%",
  transform: "translateX(-50%)",
  background: "currentColor",
  opacity: 0.72,
};
