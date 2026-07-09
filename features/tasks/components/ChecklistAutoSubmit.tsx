"use client";

import { submitTaskAction, updateTaskChecklistItemAction, updateTaskStatus } from "@/features/tasks/actions/taskActions";
import type { CSSProperties } from "react";
import { useRef, useState } from "react";

export default function ChecklistAutoSubmit({
  itemId,
  taskId,
  title,
  done = false,
  disabled,
  mode = "checklist",
  badge,
}: {
  itemId?: string;
  taskId: string;
  title: string;
  done?: boolean;
  disabled?: boolean;
  mode?: "checklist" | "task";
  badge?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isDone, setIsDone] = useState(done);
  const isTaskLine = mode === "task";
  const action = isTaskLine ? (done ? updateTaskStatus : submitTaskAction) : updateTaskChecklistItemAction;

  return (
    <form
      ref={formRef}
      action={action}
      style={{
        ...row,
        ...(isDone ? doneRow : null),
        ...(disabled ? disabledRow : null),
      }}
    >
      {mode === "checklist" && <input type="hidden" name="itemId" value={itemId ?? ""} />}
      <input type="hidden" name="taskId" value={taskId} />
      {mode === "task" && done && <input type="hidden" name="status" value="TODO" />}
      {mode === "task" && done && <input type="hidden" name="memo" value="업무 완료 취소" />}
      {mode === "task" && !done && <input type="hidden" name="content" value="업무 완료 처리" />}
      {mode === "task" && <input type="hidden" name="from" value="/tasks" />}
      <input
        type="checkbox"
        name="isDone"
        aria-label={title}
        disabled={disabled}
        checked={isDone}
        onChange={(event) => {
          setIsDone(event.currentTarget.checked);
          window.requestAnimationFrame(() => formRef.current?.requestSubmit());
        }}
      />
      <span style={{ ...titleStyle, ...(isDone ? doneTitle : null) }}>{title}</span>
      {badge && <span style={badgeStyle}>{badge}</span>}
    </form>
  );
}

const row: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "16px minmax(0, 1fr) auto",
  gap: 5,
  alignItems: "center",
  minWidth: 0,
  minHeight: 20,
  borderRadius: 6,
  padding: "1px 5px",
  fontSize: 12,
  lineHeight: 1.25,
  background: "var(--asc-surface)",
  transition: "background 140ms ease, box-shadow 140ms ease, opacity 140ms ease",
};

const doneRow: CSSProperties = {
  order: 2,
  opacity: 0.72,
};

const disabledRow: CSSProperties = {
  opacity: 0.56,
};

const titleStyle: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const doneTitle: CSSProperties = {
  color: "var(--asc-text-muted)",
  textDecoration: "line-through",
};

const badgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 18,
  borderRadius: 6,
  background: "var(--asc-primary-soft)",
  color: "var(--asc-primary-hover)",
  padding: "0 6px",
  fontSize: 10,
  fontWeight: 950,
  whiteSpace: "nowrap",
};
