import Link from "next/link";
import type { ClassGroup, Student, User } from "@prisma/client";
import type { CSSProperties } from "react";
import { Icon } from "@/components/ui/Icon";
import { createRecurringTaskAction } from "@/features/tasks/actions/taskActions";
import RecurringTaskFormControls from "./RecurringTaskFormControls";

type Props = {
  open: boolean;
  staff: Array<Pick<User, "id" | "name" | "role">>;
  students: Array<Pick<Student, "id" | "name">>;
  classGroups: Array<Pick<ClassGroup, "id" | "name">>;
  error?: string;
};

export default function RecurringTaskCreateModal({ open, staff, students, classGroups, error }: Props) {
  if (!open) return null;

  const assignees = staff.filter((member) => member.role === "ASSISTANT" || member.role === "TEACHER" || member.role === "MANAGER");

  return (
    <div style={overlay}>
      <section style={modal} role="dialog" aria-modal="true" aria-labelledby="recurring-task-title">
        <header style={header}>
          <div>
            <h2 id="recurring-task-title" style={title}>정기 업무 추가</h2>
            {error === "empty" && <p style={errorText}>업무명, 담당자, 시작일을 입력해주세요.</p>}
          </div>
          <Link href="/tasks" aria-label="닫기" style={closeButton}>
            <Icon name="x" size={18} />
          </Link>
        </header>

        <form action={createRecurringTaskAction} style={form}>
          <label style={field}>업무명<input name="title" required style={input} /></label>
          <label style={field}>담당자
            <select name="assigneeId" required defaultValue="" style={input}>
              <option value="">담당자 선택</option>
              {assignees.map((member) => <option key={member.id} value={member.id}>{member.name} / {roleLabel(member.role)}</option>)}
            </select>
          </label>
          <label style={field}>관련 반
            <select name="classGroupId" defaultValue="" style={input}>
              <option value="">없음</option>
              {classGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
            </select>
          </label>
          <label style={field}>관련 학생
            <select name="studentId" defaultValue="" style={input}>
              <option value="">없음</option>
              {students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}
            </select>
          </label>

          <RecurringTaskFormControls />

          <label style={field}>시작일<input name="startDate" type="date" required style={input} /></label>
          <label style={field}>마감일<input name="endDate" type="date" style={input} /></label>
          <label style={wideField}>설명
            <textarea name="description" rows={3} style={textarea} />
          </label>
          <button style={primaryButton}>정기 업무 저장</button>
        </form>
      </section>
    </div>
  );
}

function roleLabel(role: string) {
  if (role === "ADMIN") return "관리자";
  if (role === "MANAGER") return "실장";
  if (role === "TEACHER") return "강사";
  if (role === "ASSISTANT") return "조교";
  return role;
}

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 80,
  display: "grid",
  placeItems: "center",
  background: "rgba(15, 23, 42, 0.54)",
  padding: 24,
};

const modal: CSSProperties = {
  width: "min(1180px, calc(100vw - 48px))",
  maxHeight: "calc(100vh - 48px)",
  overflow: "auto",
  border: "1px solid var(--asc-surface-border)",
  borderRadius: 8,
  background: "var(--asc-surface)",
  color: "var(--asc-text)",
  boxShadow: "var(--asc-shadow-modal)",
};

const header: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  padding: "22px 24px 14px",
  borderBottom: "1px solid var(--asc-row-divider)",
};

const title: CSSProperties = { margin: 0, fontSize: 22, fontWeight: 950 };
const closeButton: CSSProperties = { width: 34, height: 34, border: 0, borderRadius: 6, background: "transparent", color: "var(--asc-text-muted)", display: "inline-grid", placeItems: "center", cursor: "pointer" };
const errorText: CSSProperties = { margin: "6px 0 0", color: "var(--asc-danger)", fontSize: 13, fontWeight: 900 };
const form: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, minmax(180px, 1fr))", gap: 12, alignItems: "start", padding: 24 };
const field: CSSProperties = { display: "grid", gap: 6, fontSize: 13, fontWeight: 900 };
const wideField: CSSProperties = { ...field, gridColumn: "1 / -1" };
const input: CSSProperties = { width: "100%", height: 38, border: "1px solid transparent", borderRadius: 6, padding: "0 10px", background: "var(--asc-bg-subtle)", color: "var(--asc-text)", fontWeight: 850 };
const textarea: CSSProperties = { width: "100%", minHeight: 94, border: "1px solid transparent", borderRadius: 6, padding: 10, resize: "vertical", background: "var(--asc-bg-subtle)", color: "var(--asc-text)", fontWeight: 850 };
const primaryButton: CSSProperties = { width: "min(100%, 240px)", height: 36, border: "1px solid transparent", borderRadius: 6, background: "var(--asc-primary)", color: "#fff", padding: "0 12px", fontSize: 13, fontWeight: 950, cursor: "pointer" };
