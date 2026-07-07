"use client";

import { updateTaskChecklistItemAction } from "@/features/tasks/actions/taskActions";
import type { CSSProperties } from "react";
import { useRef, useState } from "react";

export default function ChecklistAutoSubmit({
  itemId,
  taskId,
  title,
  disabled,
}: {
  itemId: string;
  taskId: string;
  title: string;
  disabled?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  return (
    <form ref={formRef} action={updateTaskChecklistItemAction} style={row}>
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="taskId" value={taskId} />
      <input
        type="checkbox"
        name="isDone"
        aria-label={title}
        disabled={disabled}
        onChange={(event) => {
          if (!event.currentTarget.checked) return;
          setHidden(true);
          formRef.current?.requestSubmit();
        }}
      />
      <span style={titleStyle}>{title}</span>
    </form>
  );
}

const row: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "16px minmax(0, 1fr)",
  gap: 7,
  alignItems: "center",
  minWidth: 0,
  fontSize: 13,
};

const titleStyle: CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
