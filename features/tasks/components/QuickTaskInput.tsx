"use client";

import { createTaskAction } from "@/features/tasks/actions/taskActions";
import type { User } from "@prisma/client";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

export default function QuickTaskInput({
  staff,
}: {
  staff: Array<Pick<User, "id" | "name" | "role">>;
}) {
  const [text, setText] = useState("");
  const parsed = useMemo(() => parseQuickTask(text, staff), [text, staff]);
  const canSubmit = Boolean(parsed.assigneeId && parsed.content);

  return (
    <form action={createTaskAction} style={form}>
      <textarea
        style={quickTextarea}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="예: 신동윤 - 테스트 채점 확인"
      />
      <input type="hidden" name="title" value={parsed.content || "빠른 업무"} />
      <input type="hidden" name="description" value={text} />
      <input type="hidden" name="checklist" value={parsed.content} />
      <input type="hidden" name="type" value="OTHER" />
      <input type="hidden" name="priority" value="NORMAL" />
      {parsed.assigneeId && <input type="hidden" name="assigneeIds" value={parsed.assigneeId} />}
      <div style={footer}>
        <span style={hint}>
          {parsed.assigneeName && parsed.content
            ? `${parsed.assigneeName}에게 바로 추가됩니다.`
            : "이름 - 업무내용 형식으로 입력하세요."}
        </span>
        <button type="submit" style={button} disabled={!canSubmit}>적용하기</button>
      </div>
    </form>
  );
}

function parseQuickTask(text: string, staff: Array<Pick<User, "id" | "name" | "role">>) {
  const normalized = text.trim();
  const dashIndex = normalized.search(/\s[-:]\s|[-:]/);
  if (dashIndex < 0) return { assigneeId: "", assigneeName: "", content: "" };

  const rawName = normalized.slice(0, dashIndex).replace(/^@/, "").trim();
  const content = normalized.slice(dashIndex + 1).replace(/^[-:]\s*/, "").trim();
  const assignee = staff.find((member) => {
    const compactName = member.name.replace(/\s+/g, "");
    const compactInput = rawName.replace(/\s+/g, "");
    return compactName === compactInput || rawName.startsWith(member.name);
  });

  return {
    assigneeId: assignee?.id ?? "",
    assigneeName: assignee?.name ?? "",
    content,
  };
}

const form: CSSProperties = {
  display: "grid",
  gap: 8,
};

const quickTextarea: CSSProperties = {
  minHeight: 92,
  border: "1px solid transparent",
  borderRadius: 6,
  resize: "vertical",
  background: "var(--asc-bg-subtle)",
  color: "var(--asc-text)",
  padding: 10,
  lineHeight: 1.5,
};

const footer: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
};

const hint: CSSProperties = {
  color: "var(--asc-text-muted)",
  fontSize: 12,
  fontWeight: 850,
};

const button: CSSProperties = {
  height: 32,
  border: "1px solid var(--asc-primary)",
  borderRadius: 6,
  background: "var(--asc-primary)",
  color: "#fff",
  padding: "0 10px",
  fontSize: 12,
  fontWeight: 950,
  cursor: "pointer",
};

