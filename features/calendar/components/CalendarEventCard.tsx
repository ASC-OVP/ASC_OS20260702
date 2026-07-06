"use client";

import type { CSSProperties } from "react";
import { eventDisplayCategory, type CalendarEventCategoryTone } from "@/features/calendar/lib/calendarEvents";
import type { CalendarViewMode, MaterializedCalendarEvent } from "@/features/calendar/types";

type Props = {
  event: MaterializedCalendarEvent;
  viewMode: CalendarViewMode;
  hasMemo?: boolean;
  onSelect: (event: MaterializedCalendarEvent) => void;
};

export default function CalendarEventCard({ event, viewMode, hasMemo = false, onSelect }: Props) {
  const category = eventDisplayCategory(event);
  const compact = viewMode === "month";

  return (
    <button
      type="button"
      onClick={() => onSelect(event)}
      style={{ ...card, ...toneStyle(category.tone), ...(compact ? compactCard : {}) }}
      title={`${category.label} · ${event.title}`}
    >
      <span style={chipRow}>
        <span style={{ ...chip, ...chipTone(category.tone) }}>{category.label}</span>
        {hasMemo && <span style={memoChip}>메모</span>}
      </span>
      <b style={title}>{event.title}</b>
      {!compact && event.ownerLabel && <span style={meta}>{event.ownerLabel}</span>}
    </button>
  );
}

function toneStyle(tone: CalendarEventCategoryTone): CSSProperties {
  if (tone === "red") return { borderColor: "transparent", background: "var(--asc-danger-soft)" };
  if (tone === "orange") return { borderColor: "transparent", background: "var(--asc-warning-soft)" };
  if (tone === "green") return { borderColor: "transparent", background: "var(--asc-success-soft)" };
  if (tone === "purple") return { borderColor: "transparent", background: "var(--asc-accent-soft)" };
  if (tone === "amber") return { borderColor: "transparent", background: "var(--asc-warning-soft)" };
  if (tone === "teal") return { borderColor: "transparent", background: "var(--asc-info-soft)" };
  return { borderColor: "transparent", background: "var(--asc-accent-soft)" };
}

function chipTone(tone: CalendarEventCategoryTone): CSSProperties {
  if (tone === "red") return { color: "var(--asc-danger)", background: "var(--asc-surface)" };
  if (tone === "orange") return { color: "var(--asc-warning-text)", background: "var(--asc-surface)" };
  if (tone === "green") return { color: "var(--asc-success)", background: "var(--asc-surface)" };
  if (tone === "purple") return { color: "var(--asc-accent)", background: "var(--asc-surface)" };
  if (tone === "amber") return { color: "var(--asc-warning-text)", background: "var(--asc-surface)" };
  if (tone === "teal") return { color: "var(--asc-info)", background: "var(--asc-surface)" };
  return { color: "var(--asc-accent)", background: "var(--asc-surface)" };
}

const card: CSSProperties = {
  width: "100%",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "transparent",
  borderRadius: "var(--asc-radius-md)",
  padding: "5px 6px",
  display: "grid",
  gap: 2,
  textAlign: "left",
  cursor: "pointer",
  color: "var(--asc-text)",
  minWidth: 0,
};
const compactCard: CSSProperties = { padding: "4px 5px", gap: 2 };
const chipRow: CSSProperties = { display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", minWidth: 0 };
const chip: CSSProperties = { borderRadius: "var(--asc-radius-sm)", padding: "2px 5px", fontSize: 10, fontWeight: 900, lineHeight: 1.2 };
const memoChip: CSSProperties = { ...chip, color: "var(--asc-warning-text)", background: "var(--asc-surface)" };
const title: CSSProperties = { fontSize: 12, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" };
const meta: CSSProperties = { color: "var(--asc-text-muted)", fontSize: 10, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
