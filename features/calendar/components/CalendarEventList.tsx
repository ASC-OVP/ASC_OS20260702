"use client";

import type { CSSProperties } from "react";
import CalendarEventCard from "@/features/calendar/components/CalendarEventCard";
import { dayLabel, isoDate, weekdayLabel } from "@/features/calendar/lib/calendarFormatters";
import { eventDisplayCategory, type CalendarEventCategoryTone } from "@/features/calendar/lib/calendarEvents";
import type { CalendarDisplayMode, CalendarViewMode, MaterializedCalendarEvent } from "@/features/calendar/types";

type Props = {
  days: Date[];
  cursorDate: Date;
  viewMode: CalendarViewMode;
  displayMode: CalendarDisplayMode;
  eventsByDate: Map<string, MaterializedCalendarEvent[]>;
  selectedDate: string | null;
  todayKey: string;
  emptyTitle: string;
  emptyDescription: string;
  hasDateMemo: (dateKey: string) => boolean;
  hasEventMemo: (eventKey: string) => boolean;
  onDateSelect: (dateKey: string) => void;
  onDateExpand: (dateKey: string) => void;
  onEventSelect: (event: MaterializedCalendarEvent) => void;
};

export default function CalendarEventList({
  days,
  cursorDate,
  viewMode,
  displayMode,
  eventsByDate,
  selectedDate,
  todayKey,
  emptyTitle,
  emptyDescription,
  hasDateMemo,
  hasEventMemo,
  onDateSelect,
  onDateExpand,
  onEventSelect,
}: Props) {
  const totalCount = days.reduce((count, day) => count + (eventsByDate.get(isoDate(day))?.length ?? 0), 0);

  if (viewMode === "day") {
    const day = days[0];
    const dateKey = isoDate(day);
    const list = eventsByDate.get(dateKey) ?? [];
    const threadGroups = groupDayThreadEvents(list);

    return (
      <div style={dayThreadWrap}>
        <button type="button" onClick={() => onDateSelect(dateKey)} style={threadDateHeader}>
          <b>{dayLabel(day, "day")}</b>
          <span>{weekdayLabel(day)}</span>
          {hasDateMemo(dateKey) && <span style={memoBadge}>메모</span>}
        </button>
        {list.length === 0 ? (
          <EmptyCalendarState title={emptyTitle} description={emptyDescription} />
        ) : (
          <div style={threadStream}>
            <div style={threadRoot}>
              <span style={threadRootMark}>{list.length}</span>
              <div style={threadRootText}>
                <b>이 날의 운영 흐름</b>
                <span>시간대별로 묶어서 확인합니다.</span>
              </div>
            </div>
            {threadGroups.map((group) => (
              <section key={group.key} style={threadGroup}>
                <div style={threadTimeRail}>
                  <span style={threadTimeBadge}>{group.label}</span>
                </div>
                <div style={threadGroupBody}>
                  <div style={threadGroupHeader}>
                    <b>{group.title}</b>
                    <span>{group.events.length}건</span>
                  </div>
                  <div style={threadMessages}>
                    {group.events.map((event) => (
                      <ThreadMessage
                        key={event.occurrenceKey}
                        event={event}
                        hasMemo={hasEventMemo(event.occurrenceKey)}
                        onSelect={onEventSelect}
                      />
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (displayMode === "list") {
    return (
      <div style={agendaWrap}>
        {totalCount === 0 && <EmptyCalendarState title={emptyTitle} description={emptyDescription} />}
        {days.map((day) => {
          const dateKey = isoDate(day);
          const list = eventsByDate.get(dateKey) ?? [];
          if (list.length === 0) return null;

          return (
            <section key={dateKey} style={agendaDay}>
              <button type="button" onClick={() => onDateSelect(dateKey)} style={agendaDate}>
                <b>{dayLabel(day, "day")}</b>
                <span>{weekdayLabel(day)}</span>
              </button>
              <div style={agendaItems}>
                {list.map((event) => (
                  <CalendarEventCard key={event.occurrenceKey} event={event} viewMode="week" hasMemo={hasEventMemo(event.occurrenceKey)} onSelect={onEventSelect} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  return (
    <div style={calendarWrap}>
      <div style={weekdayHeader(viewMode)}>
        {days.slice(0, 7).map((day) => (
          <div key={`weekday-${isoDate(day)}`} style={weekdayCell}>
            {weekdayLabel(day)}
          </div>
        ))}
      </div>
      <div style={calendarGrid(viewMode)}>
        {days.map((day) => {
          const dateKey = isoDate(day);
          const list = eventsByDate.get(dateKey) ?? [];
          const isCurrentMonth = day.getMonth() === cursorDate.getMonth();
          const isToday = dateKey === todayKey;
          const isSelected = dateKey === selectedDate;
          const visibleLimit = viewMode === "month" ? 3 : 7;
          const visible = list.slice(0, visibleLimit);
          const hiddenCount = list.length - visible.length;

          return (
            <div
              key={dateKey}
              style={{
                ...dayCell,
                ...(!isCurrentMonth && viewMode === "month" ? mutedDayCell : {}),
                ...(isToday ? todayCell : {}),
                ...(isSelected ? selectedCell : {}),
              }}
            >
              <button type="button" onClick={() => onDateSelect(dateKey)} style={dayHeaderButton} aria-label={`${dateKey} 날짜 선택`}>
                <b>{dayLabel(day, viewMode)}</b>
                <span style={dayHeaderMeta}>
                  {hasDateMemo(dateKey) && <span style={memoBadge}>메모</span>}
                </span>
              </button>
              <div style={eventList}>
                {visible.map((event) => (
                  <CalendarEventCard key={event.occurrenceKey} event={event} viewMode={viewMode} hasMemo={hasEventMemo(event.occurrenceKey)} onSelect={onEventSelect} />
                ))}
                {hiddenCount > 0 && (
                  <button type="button" onClick={() => onDateExpand(dateKey)} style={moreButton}>
                    +{hiddenCount}개 더 보기
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {totalCount === 0 && <EmptyCalendarState title={emptyTitle} description={emptyDescription} />}
    </div>
  );
}

function EmptyCalendarState({ title, description }: { title: string; description: string }) {
  return (
    <section style={emptyState}>
      <b>{title}</b>
      <span>{description}</span>
    </section>
  );
}

function ThreadMessage({
  event,
  hasMemo,
  onSelect,
}: {
  event: MaterializedCalendarEvent;
  hasMemo: boolean;
  onSelect: (event: MaterializedCalendarEvent) => void;
}) {
  const category = eventDisplayCategory(event);
  const details = threadDetails(event);

  return (
    <button type="button" onClick={() => onSelect(event)} style={threadMessage} title={`${category.label} · ${event.title}`}>
      <span style={threadMetaLine}>
        <b style={{ ...threadCategory, ...categoryTone(category.tone) }}>{category.label}</b>
        {event.ownerLabel ? <span>{event.ownerLabel}</span> : null}
        {hasMemo ? <span style={threadMemo}>메모</span> : null}
      </span>
      <strong style={threadMessageTitle}>{event.title}</strong>
      {details ? <span style={threadDetailLine}>{details}</span> : null}
      {event.description ? <span style={threadDescription}>{event.description}</span> : null}
    </button>
  );
}

function groupDayThreadEvents(events: MaterializedCalendarEvent[]) {
  const groups = new Map<string, MaterializedCalendarEvent[]>();
  for (const event of events) {
    const key = event.displayTime || "종일";
    const group = groups.get(key) ?? [];
    group.push(event);
    groups.set(key, group);
  }

  return [...groups.entries()].map(([label, group]) => ({
    key: label,
    label,
    title: threadGroupTitle(label, group),
    events: group,
  }));
}

function threadGroupTitle(label: string, events: MaterializedCalendarEvent[]) {
  const categories = [...new Set(events.map((event) => eventDisplayCategory(event).label))];
  return `${label} · ${categories.join(", ")}`;
}

function threadDetails(event: MaterializedCalendarEvent) {
  return [
    event.subtitle,
    event.className,
    event.studentName,
    event.room ? `${event.room}` : null,
    event.metadata?.scheduleText ? String(event.metadata.scheduleText) : null,
  ].filter(Boolean).join(" · ");
}

function categoryTone(tone: CalendarEventCategoryTone): CSSProperties {
  if (tone === "red") return { color: "var(--asc-danger)", background: "var(--asc-danger-soft)" };
  if (tone === "orange" || tone === "amber") return { color: "var(--asc-warning-text)", background: "var(--asc-warning-soft)" };
  if (tone === "green") return { color: "var(--asc-success)", background: "var(--asc-success-soft)" };
  if (tone === "teal") return { color: "var(--asc-info)", background: "var(--asc-info-soft)" };
  if (tone === "purple") return { color: "var(--asc-accent)", background: "var(--asc-accent-soft)" };
  return { color: "var(--asc-primary-deep)", background: "var(--asc-primary-softer)" };
}

const calendarWrap: CSSProperties = { display: "grid", gap: 0, position: "relative" };
const weekdayHeader = (viewMode: CalendarViewMode): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: viewMode === "day" ? "1fr" : "repeat(7, minmax(0, 1fr))",
  minWidth: 0,
  borderTop: "1px solid var(--asc-border-subtle)",
  borderLeft: "1px solid var(--asc-border-subtle)",
});
const weekdayCell: CSSProperties = { borderRight: "1px solid var(--asc-border-subtle)", borderBottom: "1px solid var(--asc-border-subtle)", background: "var(--asc-bg-subtle)", color: "var(--asc-text-muted)", padding: "8px 10px", fontSize: 12, fontWeight: 950 };
const calendarGrid = (viewMode: CalendarViewMode): CSSProperties => ({
  display: "grid",
  gridTemplateColumns: viewMode === "day" ? "1fr" : "repeat(7, minmax(0, 1fr))",
  gap: 0,
  borderLeft: "1px solid var(--asc-border-subtle)",
  minWidth: 0,
});
const dayCell: CSSProperties = {
  borderRight: "1px solid var(--asc-border-subtle)",
  borderBottom: "1px solid var(--asc-border-subtle)",
  background: "var(--asc-surface)",
  minHeight: 128,
  padding: 8,
  display: "grid",
  gridTemplateRows: "auto 1fr",
  gap: 6,
  alignContent: "start",
  minWidth: 0,
};
const mutedDayCell: CSSProperties = { background: "var(--asc-bg-subtle)", color: "var(--asc-text-muted)" };
const todayCell: CSSProperties = { boxShadow: "inset 0 0 0 2px var(--asc-accent)" };
const selectedCell: CSSProperties = { background: "var(--asc-accent-soft)" };
const dayHeaderButton: CSSProperties = { border: 0, background: "transparent", color: "inherit", padding: 0, display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left", fontSize: 13, cursor: "pointer" };
const dayHeaderMeta: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4 };
const memoBadge: CSSProperties = { borderRadius: "var(--asc-radius-sm)", background: "var(--asc-warning-soft)", color: "var(--asc-warning-text)", padding: "2px 5px", fontSize: 10, fontWeight: 950 };
const eventList: CSSProperties = { display: "grid", gap: 5, alignContent: "start", minWidth: 0 };
const moreButton: CSSProperties = { border: "1px dashed var(--asc-border-subtle)", borderRadius: "var(--asc-radius-md)", background: "var(--asc-surface)", color: "var(--asc-text-muted)", padding: "5px 6px", fontSize: 11, fontWeight: 900, cursor: "pointer" };
const emptyState: CSSProperties = { border: "1px dashed var(--asc-border-subtle)", borderRadius: "var(--asc-radius-md)", background: "var(--asc-bg-subtle)", padding: 14, marginTop: 10, display: "grid", gap: 4, color: "var(--asc-text-muted)", fontSize: 13 };
const dayThreadWrap: CSSProperties = { borderTop: "1px solid var(--asc-border-subtle)", display: "grid", gap: 0, minHeight: 430 };
const threadDateHeader: CSSProperties = { border: 0, borderBottom: "1px solid var(--asc-border-subtle)", background: "var(--asc-bg-subtle)", color: "var(--asc-text)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, textAlign: "left", fontSize: 13, fontWeight: 950, cursor: "pointer" };
const threadStream: CSSProperties = { position: "relative", display: "grid", gap: 14, padding: "14px 14px 18px 18px" };
const threadRoot: CSSProperties = { display: "grid", gridTemplateColumns: "34px minmax(0, 1fr)", gap: 10, alignItems: "center" };
const threadRootMark: CSSProperties = { width: 30, height: 30, borderRadius: "var(--asc-radius-md)", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--asc-primary-softer)", color: "var(--asc-primary-deep)", fontSize: 12, fontWeight: 950 };
const threadRootText: CSSProperties = { display: "grid", gap: 2, color: "var(--asc-text)", fontSize: 13 };
const threadGroup: CSSProperties = { display: "grid", gridTemplateColumns: "96px minmax(0, 1fr)", gap: 12, alignItems: "start" };
const threadTimeRail: CSSProperties = { position: "sticky", top: 8, display: "flex", justifyContent: "flex-end", paddingTop: 2 };
const threadTimeBadge: CSSProperties = { color: "var(--asc-text-muted)", background: "var(--asc-bg-subtle)", borderRadius: "var(--asc-radius-md)", padding: "5px 7px", fontSize: 11, fontWeight: 950, whiteSpace: "nowrap" };
const threadGroupBody: CSSProperties = { display: "grid", gap: 8, minWidth: 0, borderLeft: "2px solid var(--asc-border-subtle)", paddingLeft: 12 };
const threadGroupHeader: CSSProperties = { display: "flex", alignItems: "baseline", gap: 8, color: "var(--asc-text-muted)", fontSize: 12, fontWeight: 850 };
const threadMessages: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(220px, 1fr))", gap: 10, alignItems: "start" };
const threadMessage: CSSProperties = { border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-bg-subtle)", color: "var(--asc-text)", padding: "10px 11px", display: "grid", gap: 5, textAlign: "left", cursor: "pointer", minWidth: 0 };
const threadMetaLine: CSSProperties = { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", color: "var(--asc-text-muted)", fontSize: 11, fontWeight: 850 };
const threadCategory: CSSProperties = { borderRadius: "var(--asc-radius-sm)", padding: "2px 5px", fontSize: 10, fontWeight: 950 };
const threadMemo: CSSProperties = { borderRadius: "var(--asc-radius-sm)", padding: "2px 5px", color: "var(--asc-warning-text)", background: "var(--asc-warning-soft)", fontSize: 10, fontWeight: 950 };
const threadMessageTitle: CSSProperties = { minWidth: 0, color: "var(--asc-text)", fontSize: 13, lineHeight: 1.35, fontWeight: 950 };
const threadDetailLine: CSSProperties = { color: "var(--asc-text-muted)", fontSize: 11, fontWeight: 800, lineHeight: 1.35 };
const threadDescription: CSSProperties = { color: "var(--asc-text)", fontSize: 12, lineHeight: 1.45, whiteSpace: "pre-wrap" };
const agendaWrap: CSSProperties = { display: "grid", gap: 8 };
const agendaDay: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(104px, 140px) minmax(0, 1fr)", gap: 8, border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-surface)", padding: 8, boxShadow: "var(--asc-shadow-sm)" };
const agendaDate: CSSProperties = { border: 0, background: "var(--asc-bg-subtle)", borderRadius: "var(--asc-radius-md)", padding: 10, textAlign: "left", display: "grid", gap: 4, color: "var(--asc-text)", fontWeight: 950, cursor: "pointer" };
const agendaItems: CSSProperties = { display: "grid", gap: 6 };
