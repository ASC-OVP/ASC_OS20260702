"use client";

import { updateTaskChecklistItemAction } from "@/features/tasks/actions/taskActions";
import type { CSSProperties } from "react";
import { useRef, useState } from "react";

export default function ChecklistAutoSubmit({
  itemId,
  taskId,
  title,
  done = false,
  disabled,
}: {
  itemId: string;
  taskId: string;
  title: string;
  done?: boolean;
  disabled?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isDone, setIsDone] = useState(done);

  return (
    <form
      ref={formRef}
      action={updateTaskChecklistItemAction}
      style={{
        ...row,
        ...(isDone ? doneRow : null),
        ...(disabled ? disabledRow : null),
      }}
    >
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="taskId" value={taskId} />
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
    </form>
  );
}

const row: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "16px minmax(0, 1fr)",
  gap: 8,
  alignItems: "center",
  minWidth: 0,
  minHeight: 30,
  borderRadius: 6,
  padding: "5px 7px",
  fontSize: 13,
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
