"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import AssigneeAvatar from "./AssigneeAvatar";

export type AssigneeTaskModalRow = {
  assigneeId: string;
  name: string;
  roleLabel: string;
  totalCount: number;
  doneCount: number;
  openCount: number;
  overdueCount: number;
  todayDueCount: number;
  progress: number;
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    type: string;
    dueLabel: string;
    contextLabel: string;
    isRecurring: boolean;
    recurrenceLabel: string;
    description: string;
    checklistItems: Array<{
      id: string;
      title: string;
      done: boolean;
      badge?: string;
    }>;
  }>;
};

export default function AssigneeTaskModal({ row }: { row: AssigneeTaskModalRow }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" style={trigger} onClick={() => setOpen(true)}>업무 보기</button>
      {open && (
        <div style={overlay}>
          <section style={modal} role="dialog" aria-modal="true" aria-label={`${row.name} 업무 보기`}>
            <header style={header}>
              <div style={profile}>
                <AssigneeAvatar seed={row.assigneeId} size={44} />
                <div>
                  <h2 style={title}>{row.name} {row.roleLabel}</h2>
                  <p style={desc}>배정 업무 {row.tasks.length}개 · 미완료 {row.openCount}개 · 진행률 {row.progress}%</p>
                </div>
              </div>
              <button type="button" aria-label="닫기" style={closeButton} onClick={() => setOpen(false)}>
                <Icon name="x" size={18} />
              </button>
            </header>

            <div style={summaryGrid}>
              <Summary label="전체 업무" value={`${row.doneCount}/${row.totalCount}`} />
              <Summary label="미완료" value={`${row.openCount}건`} />
              <Summary label="오늘 마감" value={`${row.todayDueCount}건`} />
              <Summary label="지연" value={`${row.overdueCount}건`} />
            </div>

            <div style={taskList}>
              {row.tasks.map((task) => (
                <article key={task.id} style={taskCard}>
                  <div style={taskHead}>
                    <div>
                      <span style={taskTitleLine}>
                        <b>{task.title}</b>
                        {task.isRecurring && <span style={recurringBadge}>정기 업무</span>}
                      </span>
                      <p style={taskMeta}>{[task.contextLabel, task.dueLabel].filter(Boolean).join(" · ")}</p>
                      {task.isRecurring && <p style={taskMeta}>{task.recurrenceLabel}</p>}
                      {task.isRecurring && task.description && <p style={taskDesc}>{task.description}</p>}
                    </div>
                    <span style={statusBadge}>{task.status}</span>
                  </div>
                  <div style={checkList}>
                    {task.checklistItems.length > 0 ? (
                      task.checklistItems.map((item) => (
                        <div key={item.id} style={checkRow}>
                          <span style={item.done ? checkDone : checkBox}>{item.done ? "✓" : ""}</span>
                          <span style={item.done ? doneText : undefined}>{item.title}</span>
                          {item.badge && <span style={recurringBadge}>{item.badge}</span>}
                        </div>
                      ))
                    ) : (
                      <span style={emptyText}>업무가 없습니다.</span>
                    )}
                  </div>
                </article>
              ))}
              {row.tasks.length === 0 && <div style={emptyBox}>배정된 업무가 없습니다.</div>}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div style={summaryItem}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

const trigger: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 30,
  border: "1px solid var(--asc-accent-border)",
  borderRadius: 6,
  background: "var(--asc-primary-soft)",
  color: "var(--asc-primary-hover)",
  padding: "0 10px",
  fontSize: 12,
  fontWeight: 950,
  cursor: "pointer",
};

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 90,
  display: "grid",
  placeItems: "center",
  background: "rgba(15, 23, 42, 0.52)",
  padding: 24,
};

const modal: CSSProperties = {
  width: "min(860px, calc(100vw - 48px))",
  maxHeight: "calc(100vh - 48px)",
  display: "grid",
  gridTemplateRows: "auto auto minmax(0, 1fr)",
  gap: 12,
  borderRadius: 8,
  background: "var(--asc-surface)",
  color: "var(--asc-text)",
  boxShadow: "var(--asc-shadow-modal)",
  padding: 18,
};

const header: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
};

const profile: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "44px minmax(0, 1fr)",
  gap: 12,
  alignItems: "center",
};

const title: CSSProperties = { margin: 0, fontSize: 18, fontWeight: 950 };
const desc: CSSProperties = { margin: "4px 0 0", color: "var(--asc-text-muted)", fontSize: 13, fontWeight: 850 };
const closeButton: CSSProperties = { width: 34, height: 34, display: "inline-grid", placeItems: "center", border: 0, background: "transparent", color: "var(--asc-text-muted)", cursor: "pointer" };
const summaryGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 };
const summaryItem: CSSProperties = { display: "grid", gap: 3, borderRadius: 8, background: "var(--asc-bg-subtle)", padding: "9px 10px", fontSize: 12, color: "var(--asc-text-muted)" };
const taskList: CSSProperties = { display: "grid", gap: 8, overflowY: "auto", paddingRight: 4 };
const taskCard: CSSProperties = { display: "grid", gap: 8, borderRadius: 8, background: "var(--asc-bg-subtle)", padding: 12 };
const taskHead: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" };
const taskTitleLine: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 };
const taskMeta: CSSProperties = { margin: "4px 0 0", color: "var(--asc-text-muted)", fontSize: 12, fontWeight: 850 };
const taskDesc: CSSProperties = { margin: "5px 0 0", color: "var(--asc-text-subtle)", fontSize: 12, lineHeight: 1.45 };
const recurringBadge: CSSProperties = { display: "inline-flex", alignItems: "center", height: 18, borderRadius: 6, background: "var(--asc-primary-soft)", color: "var(--asc-primary-hover)", padding: "0 6px", fontSize: 10, fontWeight: 950, whiteSpace: "nowrap" };
const statusBadge: CSSProperties = { borderRadius: 6, background: "var(--asc-surface)", color: "var(--asc-text-subtle)", padding: "4px 7px", fontSize: 11, fontWeight: 900, whiteSpace: "nowrap" };
const checkList: CSSProperties = { display: "grid", gap: 5 };
const checkRow: CSSProperties = { display: "grid", gridTemplateColumns: "16px minmax(0, 1fr) auto", gap: 7, alignItems: "center", fontSize: 13 };
const checkBox: CSSProperties = { width: 14, height: 14, borderRadius: 3, boxShadow: "inset 0 0 0 1px var(--asc-border)" };
const checkDone: CSSProperties = { ...checkBox, display: "grid", placeItems: "center", background: "var(--asc-success)", color: "#fff", fontSize: 10, fontWeight: 950, boxShadow: "none" };
const doneText: CSSProperties = { color: "var(--asc-text-muted)", textDecoration: "line-through" };
const emptyText: CSSProperties = { color: "var(--asc-text-muted)", fontSize: 12, fontWeight: 850 };
const emptyBox: CSSProperties = { borderRadius: 8, background: "var(--asc-bg-subtle)", color: "var(--asc-text-muted)", padding: 14, textAlign: "center", fontWeight: 900 };
