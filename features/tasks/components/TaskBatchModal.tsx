"use client";

import { createTaskBatchAction } from "@/features/tasks/actions/taskActions";
import { Icon } from "@/components/ui/Icon";
import type { ClassGroup, User } from "@prisma/client";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

type StaffOption = Pick<User, "id" | "name" | "role">;
type ClassOption = Pick<ClassGroup, "id" | "name">;
type TriggerVariant = "primary" | "secondary";

type ParsedItem = {
  id: string;
  title: string;
  assigneeIds: string[];
  groupLabel: string;
};

type ParsedGroup = {
  key: string;
  label: string;
  items: ParsedItem[];
};

export default function TaskBatchModal({
  staff,
  classGroups,
  initialText,
  triggerLabel = "일반 업무 추가",
  triggerVariant = "primary",
}: {
  staff: StaffOption[];
  classGroups: ClassOption[];
  defaultSelectedAssigneeIds?: string[];
  initialText?: string;
  triggerLabel?: string;
  triggerVariant?: TriggerVariant;
}) {
  const [open, setOpen] = useState(false);
  const [assignmentMode, setAssignmentMode] = useState<"class" | "assignee">("assignee");
  const [selectedClassId, setSelectedClassId] = useState(classGroups[0]?.id ?? "");
  const [dueDate, setDueDate] = useState(todayValue());
  const [taskType, setTaskType] = useState("OTHER");
  const [rawText, setRawText] = useState(initialText?.trim() ? initialText : "");

  const selectedClass = classGroups.find((group) => group.id === selectedClassId);
  const parsed = useMemo(
    () => parseTaskText(rawText, staff, {
      mode: assignmentMode,
      classLabel: selectedClass?.name ?? "선택한 반",
    }),
    [assignmentMode, rawText, selectedClass?.name, staff]
  );
  const payload = useMemo(() => JSON.stringify({
    rawText,
    dueDate,
    taskType,
    classGroupId: assignmentMode === "class" ? selectedClassId : "",
    items: parsed.items.map((item) => ({ title: item.title, assigneeIds: item.assigneeIds })),
  }), [assignmentMode, dueDate, parsed.items, rawText, selectedClassId, taskType]);
  const unassignedCount = parsed.items.filter((item) => item.assigneeIds.length === 0 && assignmentMode === "assignee").length;
  const canSubmit = parsed.items.length > 0 && unassignedCount === 0 && (assignmentMode === "assignee" || Boolean(selectedClassId));

  function openModal() {
    setRawText(initialText?.trim() ? initialText : "");
    setOpen(true);
  }

  function loadInputFromPreview() {
    if (parsed.groups.length === 0) return;
    setRawText(groupsToInput(parsed.groups, assignmentMode));
  }

  return (
    <>
      <button type="button" className={`asc-button asc-button--${triggerVariant} asc-button--sm`} onClick={openModal}>
        <span className="asc-button__label">{triggerLabel}</span>
      </button>
      {open && (
        <div style={overlay}>
          <section style={modal} role="dialog" aria-modal="true" aria-labelledby="task-batch-title">
            <header style={modalHeader}>
              <div>
                <h2 id="task-batch-title" style={modalTitle}>일반 업무 추가</h2>
                <p style={modalDesc}>업무 내용을 자유롭게 입력하면 담당자별 업무로 정리됩니다.</p>
              </div>
              <button type="button" aria-label="닫기" style={closeButton} onClick={() => setOpen(false)}>
                <Icon name="x" size={18} />
              </button>
            </header>

            <form id="task-batch-form" action={createTaskBatchAction} style={modalBody}>
              <input type="hidden" name="payload" value={payload} />

              <div style={modeGrid}>
                <button type="button" style={assignmentMode === "class" ? modeCardActive : modeCard} onClick={() => setAssignmentMode("class")}>
                  <span style={modeIcon}>반</span>
                  <span><b>반/수업 단위 배정</b><small>이름 없이 입력하면 선택한 반 담당자에게 일괄 배정</small></span>
                </button>
                <button type="button" style={assignmentMode === "assignee" ? modeCardActive : modeCard} onClick={() => setAssignmentMode("assignee")}>
                  <span style={modeIcon}>명</span>
                  <span><b>담당자 개별 배정</b><small>이름-업무 또는 이름 줄바꿈 업무로 직접 지정</small></span>
                </button>
              </div>

              <div style={optionGrid}>
                {assignmentMode === "class" && (
                  <label style={fieldBlock}>
                    <span style={fieldLabel}>반/수업</span>
                    <select style={selectInput} value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)}>
                      {classGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
                    </select>
                  </label>
                )}
                <label style={fieldBlock}>
                  <span style={fieldLabel}>마감일</span>
                  <input style={selectInput} type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                </label>
                <label style={fieldBlock}>
                  <span style={fieldLabel}>업무 유형</span>
                  <select style={selectInput} value={taskType} onChange={(event) => setTaskType(event.target.value)}>
                    <option value="OTHER">일반 업무</option>
                    <option value="ATTENDANCE_CHECK">출결</option>
                    <option value="ASSIGNMENT_CHECK">과제</option>
                    <option value="COUNSELING_PREP">상담</option>
                    <option value="OMR_GRADING">테스트</option>
                    <option value="PARENT_CONTACT">리포트</option>
                  </select>
                </label>
              </div>

              <section style={editorGrid}>
                <div style={inputPanel}>
                  <div style={panelHead}>
                    <h3 style={panelTitle}>업무 내용 입력</h3>
                  </div>
                  <textarea
                    style={largeTextarea}
                    value={rawText}
                    onChange={(event) => setRawText(event.target.value)}
                    placeholder={
                      assignmentMode === "class"
                        ? "업무 내용을 줄마다 입력하세요.\n\n예)\n테스트 채점 확인\n결석 학생 보강 필요 여부 정리\n\n특정 담당자를 지정하려면:\n신동윤, 박상우 - 학부모 리포트 검수"
                        : "담당자명과 업무를 입력하세요.\n\n예)\n신동윤 - 테스트 채점 확인\n박상우\n- 미제출 과제 문자 발송\n- 상담 예약 명단 확인\n\n신동윤, 박상우, 데스크 - 공지 발송 확인"
                    }
                  />
                </div>

                <div style={previewPanel}>
                  <div style={previewHead}>
                    <h3 style={panelTitle}>생성될 업무</h3>
                    <span style={countBadge}>{parsed.items.length}개 업무</span>
                    {unassignedCount > 0 && <span style={warnBadge}>미분류 {unassignedCount}건</span>}
                    <button type="button" style={loadButton} onClick={loadInputFromPreview} disabled={parsed.groups.length === 0}>입력 내용 불러오기</button>
                  </div>
                  <div style={previewGroups}>
                    {parsed.groups.map((group) => (
                      <section key={group.key} style={previewGroup}>
                        <div style={previewGroupTitle}>
                          <b>{group.label}</b>
                          <span>{group.items.length}개</span>
                        </div>
                        {group.items.map((item) => (
                          <div key={item.id} style={previewItem}>
                            <span style={boxIcon} />
                            <span>{item.title}</span>
                          </div>
                        ))}
                      </section>
                    ))}
                    {parsed.items.length === 0 && <p style={emptyText}>업무를 입력하면 미리보기가 자동으로 생성됩니다.</p>}
                  </div>
                </div>
              </section>

              <footer style={modalFooter}>
                <p>{assignmentMode === "class" ? "이름 없는 업무는 선택한 반 담당자에게 일괄 배정됩니다." : "여러 명에게 같은 업무를 주려면 이름을 쉼표로 연결해 입력하세요."}</p>
                <div style={modalActions}>
                  <button type="button" style={ghostButton} onClick={() => setOpen(false)}>취소</button>
                  <button type="submit" style={primaryButton} disabled={!canSubmit}>업무 배정하기</button>
                </div>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

function parseTaskText(rawText: string, staff: StaffOption[], options: { mode: "class" | "assignee"; classLabel: string }) {
  const items: ParsedItem[] = [];
  let currentAssignees: StaffOption[] = [];
  let index = 0;

  for (const rawLine of rawText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const split = splitHeaderAndTask(line, staff);
    if (split.names.length > 0) {
      currentAssignees = split.names;
      if (split.title) {
        addParsedItems(items, split.names, split.title, options, index++);
      }
      continue;
    }

    const title = normalizeTaskLine(line);
    if (!title) continue;
    addParsedItems(items, currentAssignees, title, options, index++);
  }

  const groups = groupParsedItems(items, options.classLabel);
  return { items, groups };
}

function splitHeaderAndTask(line: string, staff: StaffOption[]) {
  const delimiter = findDelimiter(line);
  const possibleNames = delimiter >= 0 ? line.slice(0, delimiter).trim() : line.trim();
  const names = parseNames(possibleNames, staff);
  if (names.length === 0) return { names: [], title: "" };

  const title = delimiter >= 0 ? normalizeTaskLine(line.slice(delimiter + 1).replace(/^[-:]\s*/, "")) : "";
  return { names, title };
}

function findDelimiter(line: string) {
  const hyphen = line.search(/\s[-:]\s|[-:]/);
  return hyphen;
}

function parseNames(value: string, staff: StaffOption[]) {
  const candidates = value
    .split(",")
    .map((name) => name.trim().replace(/^@/, "").replace(/^[([{\s]+|[\])}\s]+$/g, ""))
    .filter(Boolean);
  if (candidates.length === 0) return [];

  const matches: StaffOption[] = [];
  for (const candidate of candidates) {
    const compactCandidate = candidate.replace(/\s+/g, "");
    const match = staff.find((member) => {
      const compactName = member.name.replace(/\s+/g, "");
      return compactCandidate === compactName || candidate.startsWith(member.name);
    });
    if (!match) return [];
    matches.push(match);
  }
  return matches;
}

function addParsedItems(items: ParsedItem[], assignees: StaffOption[], rawTitle: string, options: { mode: "class" | "assignee"; classLabel: string }, index: number) {
  const title = normalizeTaskLine(rawTitle);
  if (!title) return;

  if (assignees.length === 0) {
    items.push({
      id: `class-${index}`,
      title,
      assigneeIds: [],
      groupLabel: options.mode === "class" ? options.classLabel : "미분류 업무",
    });
    return;
  }

  for (const assignee of assignees) {
    items.push({
      id: `${assignee.id}-${index}`,
      title,
      assigneeIds: [assignee.id],
      groupLabel: `${assignee.name} ${roleLabel(assignee.role)}`,
    });
  }
}

function groupParsedItems(items: ParsedItem[], classLabel: string) {
  const groups = new Map<string, ParsedGroup>();
  for (const item of items) {
    const key = item.assigneeIds[0] ?? "class";
    const label = item.assigneeIds.length > 0 ? item.groupLabel : `${classLabel} 담당자`;
    const group = groups.get(key) ?? { key, label, items: [] };
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.values()];
}

function groupsToInput(groups: ParsedGroup[], mode: "class" | "assignee") {
  if (mode === "class") {
    return groups.flatMap((group) => group.items.map((item) => item.title)).join("\n");
  }
  return groups
    .map((group) => `${group.label.replace(/\s+(조교|강사|실장|관리자)$/u, "")}\n${group.items.map((item) => `- ${item.title}`).join("\n")}`)
    .join("\n\n");
}

function normalizeTaskLine(line: string) {
  return line.replace(/^(\-|\*|•|□|\[ \]|\d+\.)\s*/, "").trim();
}

function todayValue() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function roleLabel(role: string) {
  if (role === "ADMIN") return "관리자";
  if (role === "MANAGER") return "실장";
  if (role === "TEACHER") return "강사";
  if (role === "ASSISTANT") return "조교";
  return role;
}

const overlay: CSSProperties = { position: "fixed", inset: 0, zIndex: 80, display: "grid", placeItems: "center", background: "rgba(15, 23, 42, 0.54)", padding: 24 };
const modal: CSSProperties = { width: "min(1180px, calc(100vw - 48px))", maxHeight: "calc(100vh - 48px)", overflow: "auto", border: "1px solid var(--asc-surface-border)", borderRadius: 8, background: "var(--asc-surface)", color: "var(--asc-text)", boxShadow: "var(--asc-shadow-modal)" };
const modalHeader: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, padding: "22px 24px 14px", borderBottom: "1px solid var(--asc-row-divider)" };
const modalTitle: CSSProperties = { margin: 0, fontSize: 22, fontWeight: 950 };
const modalDesc: CSSProperties = { margin: "6px 0 0", color: "var(--asc-text-subtle)", fontSize: 13, fontWeight: 800 };
const modalActions: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" };
const closeButton: CSSProperties = { width: 34, height: 34, border: 0, borderRadius: 6, background: "transparent", color: "var(--asc-text-muted)", fontSize: 28, cursor: "pointer" };
const modalBody: CSSProperties = { display: "grid", gap: 16, padding: 24 };
const modeGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 };
const modeCard: CSSProperties = { display: "grid", gridTemplateColumns: "44px 1fr", alignItems: "center", gap: 12, minHeight: 84, textAlign: "left", border: "1px solid var(--asc-border)", borderRadius: 8, background: "var(--asc-bg-subtle)", color: "var(--asc-text)", padding: 14, cursor: "pointer" };
const modeCardActive: CSSProperties = { ...modeCard, boxShadow: "inset 0 0 0 2px var(--asc-primary)", background: "var(--asc-primary-soft)" };
const modeIcon: CSSProperties = { display: "grid", placeItems: "center", width: 42, height: 42, borderRadius: 8, background: "var(--asc-surface)", color: "var(--asc-primary)", fontSize: 12, fontWeight: 950 };
const optionGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 };
const fieldBlock: CSSProperties = { display: "grid", gap: 7 };
const fieldLabel: CSSProperties = { fontSize: 12, fontWeight: 950, color: "var(--asc-text-subtle)" };
const selectInput: CSSProperties = { width: "100%", height: 38, border: "1px solid var(--asc-border)", borderRadius: 6, background: "var(--asc-surface)", color: "var(--asc-text)", padding: "0 10px", fontWeight: 850 };
const editorGrid: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(360px, 0.92fr)", gap: 12 };
const inputPanel: CSSProperties = { borderRadius: 8, background: "var(--asc-bg-subtle)", padding: 12 };
const panelHead: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 };
const panelTitle: CSSProperties = { margin: 0, fontSize: 15, fontWeight: 950 };
const largeTextarea: CSSProperties = { width: "100%", minHeight: 306, marginTop: 10, border: "1px solid var(--asc-border)", borderRadius: 6, resize: "vertical", background: "var(--asc-surface)", color: "var(--asc-text)", padding: 12, lineHeight: 1.6, fontSize: 13 };
const previewPanel: CSSProperties = { borderRadius: 8, background: "var(--asc-bg-subtle)", padding: 12, minWidth: 0 };
const previewHead: CSSProperties = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" };
const countBadge: CSSProperties = { borderRadius: 6, background: "var(--asc-surface)", color: "var(--asc-text-subtle)", padding: "4px 8px", fontSize: 12, fontWeight: 950 };
const warnBadge: CSSProperties = { ...countBadge, background: "var(--asc-warning-soft)", color: "var(--asc-warning-text)" };
const loadButton: CSSProperties = { height: 28, border: "1px solid var(--asc-border)", borderRadius: 6, background: "var(--asc-surface)", color: "var(--asc-text)", padding: "0 9px", fontSize: 12, fontWeight: 900, cursor: "pointer" };
const previewGroups: CSSProperties = { display: "grid", gap: 8, marginTop: 10 };
const previewGroup: CSSProperties = { borderRadius: 8, background: "var(--asc-surface)", padding: 10 };
const previewGroupTitle: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 6, fontSize: 13 };
const previewItem: CSSProperties = { display: "grid", gridTemplateColumns: "18px 1fr", gap: 8, alignItems: "center", minHeight: 30, fontSize: 13, borderTop: "1px solid var(--asc-row-divider)" };
const boxIcon: CSSProperties = { width: 14, height: 14, borderRadius: 3, boxShadow: "inset 0 0 0 1px var(--asc-border)" };
const emptyText: CSSProperties = { color: "var(--asc-text-muted)", fontSize: 13, fontWeight: 850 };
const modalFooter: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, paddingTop: 4, color: "var(--asc-text-subtle)", fontSize: 13, fontWeight: 850 };
const primaryButton: CSSProperties = { height: 36, border: "1px solid var(--asc-primary)", borderRadius: 6, background: "var(--asc-primary)", color: "#fff", padding: "0 14px", fontWeight: 950, cursor: "pointer" };
const ghostButton: CSSProperties = { height: 36, border: "1px solid var(--asc-border)", borderRadius: 6, background: "var(--asc-surface)", color: "var(--asc-text)", padding: "0 12px", fontWeight: 900, cursor: "pointer" };
