"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import PhoneInput from "@/components/PhoneInput";
import { createStudentFromSheet } from "@/features/students/actions/studentActions";
import StudentClassGroupDropdownField from "@/features/students/components/StudentClassGroupDropdownField";

type ClassGroupOption = { id: string; name: string; teacherName?: string; status?: string | null; effectiveStatus?: string | null };

type Props = {
  classGroups: ClassGroupOption[];
  defaultClassGroupId?: string | null;
};

const grades = ["중1", "중2", "중3", "고1", "고2", "고3", "N수"];

export default function StudentCreateModal({ classGroups, defaultClassGroupId }: Props) {
  const router = useRouter();
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const operatingClassGroups = classGroups.filter((classGroup) => !isEndedClassGroup(classGroup));
  const endedClassGroups = classGroups.filter(isEndedClassGroup);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || isPending) return;
      setOpen(false);
      window.setTimeout(() => triggerButtonRef.current?.focus(), 0);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, isPending]);

  function openModal() {
    setMessage("");
    setOpen(true);
  }

  function closeModal() {
    if (isPending) return;
    setOpen(false);
    window.setTimeout(() => triggerButtonRef.current?.focus(), 0);
  }

  function submitStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setMessage("학생을 등록하고 있습니다.");
    startTransition(() => {
      void createStudentFromSheet(formData)
        .then(() => {
          formRef.current?.reset();
          setMessage("");
          setOpen(false);
          router.refresh();
        })
        .catch((error) => {
          setMessage(error instanceof Error ? error.message : "학생 등록에 실패했습니다.");
        });
    });
  }

  return (
    <>
      <button
        ref={triggerButtonRef}
        type="button"
        onMouseDown={(event) => {
          if (event.button !== 0) return;
          openModal();
        }}
        onClick={openModal}
        style={triggerButton}
      >
        + 학생 추가
      </button>

      {open && (
        <div style={overlay} role="presentation" onMouseDown={closeModal}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-create-title"
            style={modal}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <form ref={formRef} onSubmit={submitStudent} style={form}>
              <div style={modalHeader}>
                <div>
                  <h2 id="student-create-title" style={title}>학생 추가</h2>
                  <p style={description}>기본 학생 정보와 배정할 반을 입력합니다.</p>
                </div>
                <button type="button" onClick={closeModal} style={closeButton} aria-label="닫기">
                  ×
                </button>
              </div>

              <div style={fieldGrid}>
                <label style={field}>
                  <span style={label}>이름</span>
                  <input name="name" required autoFocus style={input} />
                </label>
                <label style={field}>
                  <span style={label}>소속 반</span>
                  <StudentClassGroupDropdownField
                    classGroups={operatingClassGroups}
                    secondaryClassGroups={endedClassGroups}
                    defaultSelectedIds={defaultClassGroupId ? [defaultClassGroupId] : []}
                    emptyText="운영중인 반이 없습니다."
                  />
                </label>
                <label style={field}>
                  <span style={label}>학생 연락처</span>
                  <PhoneInput name="phone" style={input} />
                </label>
                <label style={field}>
                  <span style={label}>보호자 연락처</span>
                  <PhoneInput name="parentPhone" style={input} />
                </label>
                <label style={field}>
                  <span style={label}>학교</span>
                  <input name="schoolName" style={input} />
                </label>
                <label style={field}>
                  <span style={label}>학년</span>
                  <select name="grade" defaultValue="고1" style={input}>
                    {grades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
                  </select>
                </label>
                <label style={field}>
                  <span style={label}>과목</span>
                  <input name="subject" style={input} />
                </label>
                <label style={field}>
                  <span style={label}>레벨</span>
                  <input name="currentLevel" style={input} />
                </label>
              </div>

              <label style={field}>
                <span style={label}>기본 메모</span>
                <textarea name="memo" rows={4} style={{ ...input, ...textarea }} />
              </label>

              {message ? <p style={messageText}>{message}</p> : null}

              <div style={actions}>
                <button type="button" onClick={closeModal} style={cancelButton} disabled={isPending}>취소</button>
                <button type="submit" style={submitButton} disabled={isPending}>학생 등록</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function isEndedClassGroup(classGroup: ClassGroupOption) {
  return classGroup.effectiveStatus === "ENDED" || classGroup.status === "ENDED";
}

const triggerButton: CSSProperties = {
  height: 32,
  display: "inline-flex",
  alignItems: "center",
  background: "var(--asc-primary)",
  color: "#fff",
  border: "1px solid var(--asc-primary)",
  borderRadius: "var(--asc-radius-md)",
  padding: "0 11px",
  fontSize: 13,
  fontWeight: 900,
  whiteSpace: "nowrap",
  cursor: "pointer",
};

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1400,
  display: "grid",
  placeItems: "center",
  padding: 16,
  background: "rgba(15, 23, 42, 0.48)",
};

const modal: CSSProperties = {
  width: "min(720px, 100%)",
  maxHeight: "calc(100vh - 32px)",
  overflow: "auto",
  border: "1px solid transparent",
  borderRadius: "var(--asc-radius-lg)",
  background: "var(--asc-surface)",
  boxShadow: "var(--asc-shadow-modal)",
};

const form: CSSProperties = { display: "grid", gap: 14, padding: 22 };
const modalHeader: CSSProperties = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 };
const title: CSSProperties = { margin: 0, color: "var(--asc-text)", fontSize: 20, fontWeight: 950, lineHeight: 1.1 };
const description: CSSProperties = { margin: "5px 0 0", color: "var(--asc-text-muted)", fontSize: 13, fontWeight: 750 };
const closeButton: CSSProperties = { width: 30, height: 30, border: 0, background: "transparent", color: "var(--asc-text)", fontSize: 24, lineHeight: 1, cursor: "pointer" };
const fieldGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 };
const field: CSSProperties = { display: "grid", gap: 5, minWidth: 0 };
const label: CSSProperties = { color: "var(--asc-text-muted)", fontSize: 13, fontWeight: 900 };
const input: CSSProperties = { width: "100%", minHeight: 36, border: "1px solid transparent", borderRadius: 8, background: "var(--asc-bg-subtle)", color: "var(--asc-text)", padding: "7px 10px", fontSize: 14, fontWeight: 800, boxSizing: "border-box" };
const textarea: CSSProperties = { minHeight: 76, resize: "vertical" };
const messageText: CSSProperties = { margin: 0, color: "var(--asc-text-muted)", fontSize: 13, fontWeight: 800 };
const actions: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: 8 };
const cancelButton: CSSProperties = { minHeight: 36, border: 0, borderRadius: "var(--asc-radius-lg)", background: "var(--asc-bg-subtle)", color: "var(--asc-text-muted)", padding: "0 16px", fontSize: 14, fontWeight: 950, cursor: "pointer" };
const submitButton: CSSProperties = { minHeight: 36, border: 0, borderRadius: "var(--asc-radius-lg)", background: "var(--asc-primary)", color: "#fff", padding: "0 18px", fontSize: 14, fontWeight: 950, cursor: "pointer" };
