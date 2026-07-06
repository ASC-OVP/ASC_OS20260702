import type { CSSProperties } from "react";

export const page: CSSProperties = {
  minHeight: "100vh",
  padding: 12,
  color: "var(--asc-text)",
  background: "var(--asc-bg-subtle)",
};

export const container: CSSProperties = {
  width: "100%",
  maxWidth: "none",
  margin: 0,
};

export const narrowContainer: CSSProperties = {
  width: "100%",
  maxWidth: "none",
  margin: 0,
};

export const header: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 14,
};

export const title: CSSProperties = {
  fontSize: 22,
  fontWeight: 950,
  margin: "0 0 4px",
};

export const desc: CSSProperties = {
  margin: 0,
  color: "var(--asc-text-muted)",
  fontSize: 13,
};

export const surfaceBorder = "1px solid var(--asc-surface-border)";
export const surfaceShadow = "var(--asc-shadow-sm)";

export const card: CSSProperties = {
  background: "var(--asc-surface)",
  border: surfaceBorder,
  borderRadius: "var(--asc-radius-lg)",
  padding: 12,
  boxShadow: surfaceShadow,
};

export const button: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 36,
  padding: "8px 12px",
  border: "1px solid transparent",
  borderRadius: "var(--asc-radius-md)",
  background: "var(--asc-primary)",
  color: "#fff",
  fontWeight: 900,
  textDecoration: "none",
  cursor: "pointer",
};

export const secondaryButton: CSSProperties = {
  ...button,
  background: "var(--asc-bg-subtle)",
  color: "var(--asc-text)",
  border: "1px solid transparent",
};

export const dangerButton: CSSProperties = {
  ...button,
  background: "var(--asc-danger)",
};

export const input: CSSProperties = {
  width: "100%",
  minHeight: 36,
  padding: "8px 10px",
  border: "1px solid transparent",
  borderRadius: "var(--asc-radius-md)",
  background: "var(--asc-bg-subtle)",
  color: "var(--asc-text)",
};

export const label: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  fontWeight: 800,
};

export const form: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

export const backLink: CSSProperties = {
  display: "inline-block",
  marginBottom: 10,
  color: "var(--asc-primary)",
  fontWeight: 800,
  textDecoration: "none",
};

export const excelWrap: CSSProperties = {
  background: "var(--asc-surface)",
  border: surfaceBorder,
  borderRadius: "var(--asc-radius-md)",
  overflow: "auto",
  boxShadow: surfaceShadow,
};

export const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 14,
};

export const th: CSSProperties = {
  padding: "8px 10px",
  background: "var(--asc-bg-subtle)",
  border: 0,
  borderBottom: "1px solid var(--asc-row-divider)",
  textAlign: "left",
  fontWeight: 900,
  whiteSpace: "nowrap",
};

export const td: CSSProperties = {
  padding: "8px 10px",
  border: 0,
  borderBottom: "1px solid var(--asc-row-divider)",
  verticalAlign: "top",
};
