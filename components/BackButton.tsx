"use client";

import type { CSSProperties } from "react";

export default function BackButton({ label = "뒤로가기" }: { label?: string }) {
  return <button type="button" onClick={() => history.back()} style={style}>← {label}</button>;
}

const style: CSSProperties = {
  border: "1px solid transparent",
  background: "var(--asc-bg-subtle)",
  color: "var(--asc-text)",
  borderRadius: "var(--asc-radius-md)",
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
};
