"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type CSSProperties, type KeyboardEvent } from "react";
import { createMessageTemplateAction } from "@/features/messages/actions/messageActions";
import type { MessageClassGroupOption, MessageExamOption } from "@/features/messages/components/MessageComposer";
import { renderMessageTemplate } from "@/lib/sms/renderTemplate";
import { messageCategories, messageTargetTypes } from "@/lib/sms/types";

const defaultBody = "[ASC학원]\n{{studentName}} 학생 보호자님, ";
const variableGroups = [
  ["이름", ["studentName", "parentName", "parentNameSubject", "parentNameTopic", "className"]],
  ["수업", ["lessonName", "lessonRound", "lessonDate", "attendanceStatus", "assignmentName"]],
  ["시험", ["examName", "examDate", "score", "maxScore", "averageScore", "rank", "correctCount", "wrongCount", "blankCount", "weakType", "wrongQuestions", "remedialReason", "reportLink"]],
] as const;
const contextFields = [
  ["className", "반명"],
  ["lessonName", "강의명"],
  ["lessonRound", "차시명"],
  ["lessonDate", "수업일"],
  ["attendanceStatus", "출결 상태"],
  ["assignmentName", "과제명"],
  ["examName", "시험명"],
  ["examDate", "시험일"],
  ["score", "점수"],
  ["maxScore", "만점"],
  ["averageScore", "평균"],
  ["rank", "석차"],
  ["correctCount", "정답 수"],
  ["wrongCount", "오답 수"],
  ["blankCount", "미응답 수"],
  ["weakType", "취약 유형"],
  ["wrongQuestions", "오답 문항"],
  ["remedialReason", "보강 사유"],
  ["reportLink", "리포트 링크"],
] as const;
type ContextKey = (typeof contextFields)[number][0];
type Props = { classGroups: MessageClassGroupOption[]; exams: MessageExamOption[] };
const variableLabels: Record<string, string> = {
  studentName: "학생명",
  parentName: "학부모명",
  parentNameSubject: "학부모 호칭",
  parentNameTopic: "학부모 관계",
  className: "반명",
  lessonName: "강의명",
  lessonRound: "차시명",
  lessonDate: "수업일",
  attendanceStatus: "출결 상태",
  assignmentName: "과제명",
  examName: "시험명",
  examDate: "시험일",
  score: "점수",
  maxScore: "만점",
  averageScore: "평균",
  rank: "석차",
  correctCount: "정답 수",
  wrongCount: "오답 수",
  blankCount: "미응답 수",
  weakType: "취약 유형",
  wrongQuestions: "오답 문항",
  remedialReason: "보강 사유",
  reportLink: "리포트 링크",
};

export default function MessageTemplateCreateModal({ classGroups, exams }: Props) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState(defaultBody);
  const [context, setContext] = useState<Record<ContextKey, string>>({} as Record<ContextKey, string>);
  const [classGroupId, setClassGroupId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [examId, setExamId] = useState("");
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastRenderedBodyRef = useRef("");
  const selectedClassGroup = classGroups.find((classGroup) => classGroup.id === classGroupId) ?? null;
  const selectedLesson = selectedClassGroup?.lessons?.find((lesson) => lesson.id === lessonId) ?? null;
  const selectedExam = exams.find((exam) => exam.id === examId) ?? null;
  const previewContext = {
    ...context,
    className: selectedClassGroup?.name || context.className,
    lessonName: selectedClassGroup?.name || context.lessonName,
    lessonRound: selectedLesson?.title || context.lessonRound,
    lessonDate: selectedLesson?.lessonDate || context.lessonDate,
    examName: selectedExam?.title || context.examName,
    examDate: selectedExam?.examDate || context.examDate,
    academyName: "ASC학원",
    academyPhone: "",
  };
  const preview = renderMessageTemplate(body, previewContext);

  useEffect(() => {
    if (!open) return;
    const editor = editorRef.current;
    if (!editor) return;
    if (document.activeElement === editor && lastRenderedBodyRef.current !== "") return;
    renderTokenEditor(editor, body);
    lastRenderedBodyRef.current = body;
  }, [body, open]);

  const insertVariable = (variable: string) => {
    const editor = editorRef.current;
    if (!editor) return setBody((current) => `${current}{{${variable}}}`);
    editor.focus();
    insertVariableToken(editor, variable);
    syncBodyFromEditor(editor);
  };
  const syncBodyFromEditor = (editor = editorRef.current) => {
    if (!editor) return;
    const nextBody = serializeTokenEditor(editor);
    lastRenderedBodyRef.current = nextBody;
    setBody(nextBody);
  };
  const handleEditorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    insertPlainTextIntoEditor("\n");
    syncBodyFromEditor();
  };
  const handleEditorPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    insertPlainTextIntoEditor(event.clipboardData.getData("text/plain"));
    syncBodyFromEditor();
  };
  const updateContext = (key: ContextKey, value: string) => {
    setContext((current) => ({ ...current, [key]: value }));
  };
  const selectClassGroup = (id: string) => {
    setClassGroupId(id);
    setLessonId("");
    setExamId("");
    setContext((current) => ({ ...current, className: "", lessonName: "", lessonRound: "", lessonDate: "", examName: "", examDate: "" }));
  };
  const selectLesson = (id: string) => {
    setLessonId(id);
    setContext((current) => ({ ...current, lessonRound: "", lessonDate: "" }));
  };
  const selectExam = (id: string) => {
    setExamId(id);
    const exam = exams.find((item) => item.id === id);
    if (exam?.classGroupId) {
      setClassGroupId(exam.classGroupId);
      setLessonId("");
    }
    setContext((current) => ({ ...current, examName: "", examDate: "" }));
  };

  return (
    <>
      <button type="button" style={primaryButton} onClick={() => setOpen(true)}>템플릿 생성</button>
      {open && (
        <div style={modalBackdrop} role="presentation">
          <form action={createMessageTemplateAction} style={modal} role="dialog" aria-modal="true" aria-label="템플릿 생성">
            <div style={modalHead}>
              <h3 style={modalTitle}>템플릿 생성</h3>
              <button type="button" style={ghostButton} onClick={() => setOpen(false)}>닫기</button>
            </div>
            <div style={formGrid}>
              <input name="name" placeholder="템플릿명" required style={input} />
              <input name="title" placeholder="발송 제목" style={input} />
              <select name="category" defaultValue="ATTENDANCE" style={input}>
                {messageCategories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
              </select>
              <select name="targetType" defaultValue="GUARDIAN" style={input}>
                {messageTargetTypes.map((targetType) => <option key={targetType.value} value={targetType.value}>{targetType.label}</option>)}
              </select>
              <label style={checkLabel}><input type="checkbox" name="isActive" defaultChecked /> 사용</label>
              <label style={checkLabel}><input type="checkbox" name="isMarketing" /> 광고</label>
            </div>
            <input type="hidden" name="body" value={body} />
            <div ref={editorRef} contentEditable suppressContentEditableWarning role="textbox" aria-label="템플릿 본문" style={tokenEditor} onInput={() => syncBodyFromEditor()} onKeyDown={handleEditorKeyDown} onPaste={handleEditorPaste} />
            <div style={variableBox}>{variableGroups.map(([group, items]) => <div key={group} style={chipLine}><b>{group}</b>{items.map((item) => <button key={item} type="button" style={chip} title={`{{${item}}}`} onClick={() => insertVariable(item)}>{variableLabels[item]}</button>)}</div>)}</div>
            <details style={contextPanel}>
              <summary style={contextSummary}>직접 입력 태그 값</summary>
              <div style={contextGrid}><label style={field}><span>시험 선택</span><select value={examId} onChange={(event) => selectExam(event.target.value)} style={input}><option value="">시험 선택 안 함</option>{exams.filter((exam) => !classGroupId || !exam.classGroupId || exam.classGroupId === classGroupId).map((exam) => <option key={exam.id} value={exam.id}>{exam.title}{exam.examDate ? ` · ${exam.examDate}` : ""}</option>)}</select></label><label style={field}><span>강의 선택</span><select value={classGroupId} onChange={(event) => selectClassGroup(event.target.value)} style={input}><option value="">선택 안 함</option>{classGroups.map((classGroup) => <option key={classGroup.id} value={classGroup.id}>{classGroup.name}</option>)}</select></label><label style={field}><span>차시 선택</span><select value={lessonId} onChange={(event) => selectLesson(event.target.value)} style={input} disabled={!selectedClassGroup}><option value="">차시 선택 안 함</option>{selectedClassGroup?.lessons?.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}{lesson.lessonDate ? ` · ${lesson.lessonDate}` : ""}</option>)}</select></label></div>
              <div style={contextGrid}>{contextFields.filter(([key]) => !["className", "lessonName", "lessonRound", "lessonDate", "examName", "examDate"].includes(key)).map(([key, label]) => <label key={key} style={field}><span>{label}</span><input value={context[key] ?? ""} onChange={(event) => updateContext(key, event.target.value)} placeholder={`${label} 미리보기 값`} style={input} /></label>)}</div>
            </details>
            <div style={previewBox}><b>미리보기</b><p>{preview.text || "본문을 입력하면 미리보기가 표시됩니다."}</p><small>{preview.length}자 / {preview.messageKind} 예상</small></div>
            <div style={modalActions}>
              <button type="button" style={ghostButton} onClick={() => setOpen(false)}>취소</button>
              <button style={primaryButton}>생성</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

const tokenPattern = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

function variableLabel(variable: string) {
  return variableLabels[variable] ?? variable;
}

function renderTokenEditor(editor: HTMLDivElement, value: string) {
  editor.replaceChildren();
  let cursor = 0;
  for (const match of value.matchAll(tokenPattern)) {
    appendTextNodes(editor, value.slice(cursor, match.index));
    editor.appendChild(createTokenElement(match[1] ?? ""));
    cursor = (match.index ?? 0) + match[0].length;
  }
  appendTextNodes(editor, value.slice(cursor));
}

function appendTextNodes(parent: Node, text: string) {
  const parts = text.split("\n");
  parts.forEach((part, index) => {
    if (index > 0) parent.appendChild(document.createElement("br"));
    if (part) parent.appendChild(document.createTextNode(part));
  });
}

function createTokenElement(variable: string) {
  const token = document.createElement("span");
  token.dataset.variable = variable;
  token.contentEditable = "false";
  token.textContent = variableLabel(variable);
  token.title = `{{${variable}}}`;
  token.style.display = "inline-flex";
  token.style.alignItems = "center";
  token.style.minHeight = "22px";
  token.style.margin = "0 2px";
  token.style.padding = "2px 7px";
  token.style.borderRadius = "var(--asc-radius-md)";
  token.style.background = "var(--asc-primary-soft)";
  token.style.color = "var(--asc-primary)";
  token.style.fontWeight = "900";
  token.style.verticalAlign = "baseline";
  return token;
}

function serializeTokenEditor(editor: HTMLDivElement) {
  return Array.from(editor.childNodes).map(serializeTokenNode).join("").replace(/\u00a0/g, " ");
}

function serializeTokenNode(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (!(node instanceof HTMLElement)) return "";
  const variable = node.dataset.variable;
  if (variable) return `{{${variable}}}`;
  if (node.tagName === "BR") return "\n";
  return Array.from(node.childNodes).map(serializeTokenNode).join("");
}

function insertVariableToken(editor: HTMLDivElement, variable: string) {
  const token = createTokenElement(variable);
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selectionInside(editor, selection)) {
    editor.appendChild(token);
    placeCaretAfter(token);
    return;
  }
  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(token);
  placeCaretAfter(token);
}

function insertPlainTextIntoEditor(text: string) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  const fragment = document.createDocumentFragment();
  appendTextNodes(fragment, text);
  const lastNode = fragment.lastChild;
  range.deleteContents();
  range.insertNode(fragment);
  if (lastNode) placeCaretAfter(lastNode);
}

function selectionInside(editor: HTMLDivElement, selection: Selection) {
  const node = selection.anchorNode;
  return Boolean(node && editor.contains(node));
}

function placeCaretAfter(node: Node) {
  const range = document.createRange();
  range.setStartAfter(node);
  range.collapse(true);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

const primaryButton: CSSProperties = { height: 36, border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-primary)", color: "#fff", padding: "0 12px", fontWeight: 950 };
const ghostButton: CSSProperties = { height: 34, border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-bg-subtle)", color: "var(--asc-text)", padding: "0 12px", fontWeight: 950 };
const modalBackdrop: CSSProperties = { position: "fixed", inset: 0, zIndex: 120, background: "rgba(15,23,42,.46)", display: "grid", placeItems: "center", padding: 18 };
const modal: CSSProperties = { width: "min(860px, calc(100vw - 36px))", maxHeight: "calc(100vh - 48px)", overflowY: "auto", border: "1px solid transparent", borderRadius: "var(--asc-radius-lg)", background: "var(--asc-surface)", boxShadow: "var(--asc-shadow-modal)", padding: 14, display: "grid", gap: 10 };
const modalHead: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 };
const modalTitle: CSSProperties = { margin: 0, fontSize: 18, fontWeight: 950 };
const formGrid: CSSProperties = { display: "grid", gridTemplateColumns: "1.2fr 1.2fr 150px 150px 80px 80px", gap: 8, alignItems: "start" };
const input: CSSProperties = { width: "100%", height: 36, border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-bg-subtle)", padding: "0 10px", color: "var(--asc-text)" };
const checkLabel: CSSProperties = { height: 36, display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 900 };
const tokenEditor: CSSProperties = { minHeight: 170, border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-bg-subtle)", color: "var(--asc-text)", padding: 10, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word", outline: "none" };
const variableBox: CSSProperties = { display: "grid", gap: 6 };
const chipLine: CSSProperties = { display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", fontSize: 12 };
const chip: CSSProperties = { border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-bg-subtle)", padding: "5px 8px", fontSize: 12, fontWeight: 900, color: "var(--asc-text-subtle)", cursor: "pointer", boxShadow: "inset 0 0 0 1px var(--asc-border-subtle)" };
const contextPanel: CSSProperties = { border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-bg-subtle)", padding: 8 };
const contextSummary: CSSProperties = { cursor: "pointer", fontWeight: 950 };
const contextGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 7, marginTop: 8 };
const field: CSSProperties = { display: "grid", gap: 5, color: "var(--asc-text-subtle)", fontSize: 12, fontWeight: 900 };
const previewBox: CSSProperties = { border: "1px solid transparent", borderRadius: "var(--asc-radius-lg)", background: "var(--asc-bg-subtle)", padding: 10, display: "grid", gap: 4 };
const modalActions: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: 8 };
