"use client";

import type { CSSProperties, ReactNode } from "react";
import { CALENDAR_CONTENT_FILTERS } from "@/features/calendar/constants";
import { CALENDAR_EVENT_CATEGORY_ITEMS, type CalendarEventCategoryTone } from "@/features/calendar/lib/calendarEvents";
import type { CalendarContentFilter, CalendarDisplayMode, CalendarFilterOption, CalendarFilterValue, CalendarViewMode } from "@/features/calendar/types";

type Props = {
  filters: CalendarFilterValue;
  viewMode: CalendarViewMode;
  displayMode: CalendarDisplayMode;
  staffOptions: CalendarFilterOption[];
  canViewStaffCalendars: boolean;
  onFilterChange: (filters: CalendarFilterValue) => void;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onDisplayModeChange: (mode: CalendarDisplayMode) => void;
};

export default function CalendarToolbar({
  filters,
  viewMode,
  displayMode,
  staffOptions,
  canViewStaffCalendars,
  onFilterChange,
  onViewModeChange,
  onDisplayModeChange,
}: Props) {
  function toggleFilter(contentType: CalendarContentFilter) {
    onFilterChange({
      ...filters,
      contentTypes: filters.contentTypes.includes(contentType)
        ? filters.contentTypes.filter((item) => item !== contentType)
        : [...filters.contentTypes, contentType],
    });
  }

  return (
    <section style={shell}>
      <div style={filterRow}>
        <div style={contentButtons} aria-label="표시 항목 선택">
          {CALENDAR_CONTENT_FILTERS.map((filter) => {
            const active = filters.contentTypes.includes(filter.id);
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => toggleFilter(filter.id)}
                style={{ ...filterButton, ...(active ? filterButtonActive : {}) }}
                title={filter.description}
                aria-pressed={active}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {canViewStaffCalendars && (
          <label style={staffSelectLabel}>
            <span>직원 화면</span>
            <select value={filters.staffId} onChange={(event) => onFilterChange({ ...filters, staffId: event.target.value })} style={staffSelect}>
              <option value="all">전체 직원</option>
              {staffOptions.map((staff) => (
                <option key={staff.id} value={staff.id}>{staff.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div style={viewRow}>
        <div style={legend} aria-label="일정 색상 범례">
          {CALENDAR_EVENT_CATEGORY_ITEMS.map((item) => (
            <span key={item.label} style={legendItem}>
              <span style={{ ...legendDot, ...legendDotTone(item.tone) }} />
              {item.label}
            </span>
          ))}
        </div>
        <div style={viewTabs} aria-label="기간 단위 선택">
          <ViewButton active={viewMode === "month"} onClick={() => onViewModeChange("month")}>월</ViewButton>
          <ViewButton active={viewMode === "week"} onClick={() => onViewModeChange("week")}>주</ViewButton>
          <ViewButton active={viewMode === "day"} onClick={() => onViewModeChange("day")}>일</ViewButton>
        </div>
        <div style={layoutTabs} aria-label="표시 방식 선택">
          <ViewButton active={displayMode === "calendar"} onClick={() => onDisplayModeChange("calendar")}>달력</ViewButton>
          <ViewButton active={displayMode === "list"} onClick={() => onDisplayModeChange("list")}>목록</ViewButton>
        </div>
      </div>
    </section>
  );
}

function ViewButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{ ...viewButton, ...(active ? viewButtonActive : {}) }} aria-pressed={active}>
      {children}
    </button>
  );
}

function legendDotTone(tone: CalendarEventCategoryTone): CSSProperties {
  if (tone === "red") return { background: "var(--asc-danger)" };
  if (tone === "orange") return { background: "var(--asc-warning)" };
  if (tone === "green") return { background: "var(--asc-success)" };
  if (tone === "purple") return { background: "var(--asc-accent-hover)" };
  if (tone === "amber") return { background: "var(--asc-warning)" };
  if (tone === "teal") return { background: "var(--asc-info)" };
  return { background: "var(--asc-accent)" };
}

const shell: CSSProperties = {
  border: "1px solid transparent",
  borderRadius: "var(--asc-radius-lg)",
  background: "var(--asc-surface)",
  padding: 10,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  flexWrap: "wrap",
  boxShadow: "var(--asc-shadow-sm)",
};
const filterRow: CSSProperties = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" };
const contentButtons: CSSProperties = { display: "inline-flex", gap: 4, padding: 2, border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-toggle-bg)" };
const filterButton: CSSProperties = { border: 0, borderRadius: "var(--asc-radius-sm)", background: "transparent", color: "var(--asc-text-muted)", padding: "6px 9px", fontSize: 12, fontWeight: 850, cursor: "pointer" };
const filterButtonActive: CSSProperties = { background: "var(--asc-toggle-active-bg)", color: "var(--asc-toggle-active-text)" };
const staffSelectLabel: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, color: "var(--asc-text-muted)", fontSize: 12, fontWeight: 950 };
const staffSelect: CSSProperties = { height: 34, minWidth: 150, border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-bg-subtle)", color: "var(--asc-text)", padding: "0 8px", fontSize: 12, fontWeight: 850 };
const viewRow: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" };
const viewTabs: CSSProperties = { display: "inline-flex", gap: 3, border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", padding: 2, background: "var(--asc-toggle-bg)" };
const layoutTabs: CSSProperties = { ...viewTabs };
const viewButton: CSSProperties = { border: 0, borderRadius: "var(--asc-radius-sm)", background: "transparent", padding: "6px 10px", fontSize: 12, fontWeight: 950, cursor: "pointer", color: "var(--asc-text-muted)" };
const viewButtonActive: CSSProperties = { background: "var(--asc-toggle-active-bg)", color: "var(--asc-toggle-active-text)" };
const legend: CSSProperties = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", color: "var(--asc-text-muted)", fontSize: 11, fontWeight: 850 };
const legendItem: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" };
const legendDot: CSSProperties = { width: 7, height: 7, borderRadius: "var(--asc-radius-sm)", display: "inline-block" };
