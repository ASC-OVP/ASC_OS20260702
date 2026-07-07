"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type CSSProperties, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { sendMessageJobAction } from "@/features/messages/actions/messageActions";
import MessagePreviewList from "@/features/messages/components/MessagePreviewList";
import { buildMessageRecipients, type MessageStudent } from "@/lib/sms/recipients";
import { messageByteLength, validateTemplateVariables } from "@/lib/sms/renderTemplate";
import { messageCategories, messageTargetTypes, type MessageTargetType, type SmsProviderStatus, type TemplateContext } from "@/lib/sms/types";

export type MessageClassLessonOption = { id: string; position: number; title: string; lessonDate: string | null; startTime: string | null; endTime: string | null };
export type MessageClassGroupOption = { id: string; name: string; lessons?: MessageClassLessonOption[] };
export type MessageStudentOption = { id: string; name: string; phone: string; parentPhone: string; schoolName: string; grade: string; currentLevel: string; classGroupIds: string[]; classGroupNames: string[] };
export type MessageTemplateOption = { id: string; name: string; category: string; targetType: string; title?: string | null; body: string; isMarketing?: boolean; isActive: boolean };
export type MessageExamOption = { id: string; title: string; examDate: string; subject: string; classGroupId: string | null; totalScore: number | null; results: Array<{ studentId: string; totalScore: number; maxScore: number; correctCount: number; wrongCount: number; blankCount: number; reviewNeededCount: number }> };

type Props = { academyName: string; classGroups: MessageClassGroupOption[]; students: MessageStudentOption[]; exams: MessageExamOption[]; templates: MessageTemplateOption[]; settings: SmsProviderStatus; canCompose: boolean; canSendActual: boolean };

const fallbackBody = `[ASC학원]\n안녕하세요, {{parentName}}.\n{{studentName}} 학생의 {{className}} 운영 안내드립니다.`;
const examVariableNames = new Set(["score", "maxScore", "averageScore", "rank", "correctCount", "wrongCount", "blankCount", "weakType", "wrongQuestions", "remedialReason"]);
const quickFilters = [
  ["ALL", "전체 학생"], ["GUARDIAN_PHONE", "학부모 수신 가능"], ["STUDENT_PHONE", "학생 수신 가능"], ["NO_SCORE", "미응시/점수 없음"], ["BELOW_AVERAGE", "평균 이하"], ["UNDER_60", "60점 미만"], ["UNDER_70", "70점 미만"], ["REMEDIAL", "보강 필요"], ["REVIEW_NEEDED", "검수 필요"], ["MANY_WRONG", "오답 많은 학생"],
] as const;
const variableGroups = [
  ["이름", ["studentName", "parentName", "parentNameSubject", "parentNameTopic", "className"]],
  ["수업", ["lessonName", "lessonRound", "attendanceStatus", "assignmentName"]],
  ["시험", ["examName", "examDate", "score", "maxScore", "averageScore", "rank", "correctCount", "wrongCount", "blankCount", "weakType", "wrongQuestions", "remedialReason", "reportLink"]],
] as const;
const manualContextFields = [
  ["className", "반명", "선택한 반명 사용"],
  ["lessonName", "강의명", "선택한 반명 사용"],
  ["lessonRound", "차시명", "예: 3차시"],
  ["lessonDate", "수업일", "예: 2026-07-06"],
  ["attendanceStatus", "출결 상태", "예: 출석"],
  ["assignmentName", "과제명", "예: 3단원 오답 정리"],
  ["examName", "시험명", "선택한 시험명 사용"],
  ["examDate", "시험일", "선택한 시험일 사용"],
  ["score", "점수", "예: 87"],
  ["maxScore", "만점", "예: 100"],
  ["averageScore", "평균", "예: 76.5"],
  ["rank", "석차", "예: 4"],
  ["correctCount", "정답 수", "예: 18"],
  ["wrongCount", "오답 수", "예: 2"],
  ["blankCount", "미응답 수", "예: 0"],
  ["highestScore", "최고점", "예: 98"],
  ["weakType", "취약 유형", "예: 함수"],
  ["wrongQuestions", "오답 문항", "예: 3, 7, 12"],
  ["remedialReason", "보강 사유", "예: 오답률 40% 이상"],
  ["feedback", "피드백", "예: 오답 복습이 필요합니다."],
  ["reportName", "리포트명", "예: 7월 학습 리포트"],
  ["reportLink", "리포트 링크", "https://"],
] as const;
type ManualContextKey = (typeof manualContextFields)[number][0];
const variableLabels: Record<string, string> = {
  academyName: "학원명",
  studentName: "학생명",
  parentName: "학부모명",
  parentNameSubject: "학부모 호칭",
  parentNameTopic: "학부모 관계",
  className: "반명",
  today: "오늘 날짜",
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
  level: "레벨",
  correctCount: "정답 수",
  wrongCount: "오답 수",
  blankCount: "미응답 수",
  highestScore: "최고점",
  feedback: "피드백",
  weakType: "취약 유형",
  wrongQuestions: "오답 문항",
  remedialReason: "보강 사유",
  reportName: "리포트명",
  reportLink: "리포트 링크",
  academyPhone: "학원 연락처",
};

export default function MessageComposer({ academyName, classGroups, students, exams, templates, settings, canCompose, canSendActual }: Props) {
  const firstTemplate = templates.find((template) => template.isActive) ?? templates[0] ?? null;
  const [classGroupId, setClassGroupId] = useState("all");
  const [lessonId, setLessonId] = useState("");
  const [examId, setExamId] = useState("");
  const [quickFilter, setQuickFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [previewRecipientId, setPreviewRecipientId] = useState("");
  const [templateId, setTemplateId] = useState(firstTemplate?.id ?? "");
  const [targetType, setTargetType] = useState<MessageTargetType>((firstTemplate?.targetType as MessageTargetType) || "GUARDIAN");
  const [title, setTitle] = useState(firstTemplate?.title || firstTemplate?.name || "운영 알림 문자");
  const [body, setBody] = useState(firstTemplate?.body ?? fallbackBody);
  const [isMarketing, setIsMarketing] = useState(Boolean(firstTemplate?.isMarketing ?? settings.isMarketingDefault));
  const [manualContext, setManualContext] = useState<Record<ManualContextKey, string>>({} as Record<ManualContextKey, string>);
  const [sendMode, setSendMode] = useState<"dry-run" | "actual">("dry-run");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const lastRenderedBodyRef = useRef("");

  const selectedClassGroup = classGroups.find((classGroup) => classGroup.id === classGroupId) ?? null;
  const selectedLesson = selectedClassGroup?.lessons?.find((lesson) => lesson.id === lessonId) ?? null;
  const selectedExam = exams.find((exam) => exam.id === examId) ?? null;
  const effectiveClassName = manualContext.className?.trim() || selectedClassGroup?.name || "";
  const effectiveLessonName = manualContext.lessonName?.trim() || selectedClassGroup?.name || "";
  const effectiveLessonRound = manualContext.lessonRound?.trim() || selectedLesson?.title || "";
  const effectiveLessonDate = manualContext.lessonDate?.trim() || selectedLesson?.lessonDate || "";
  const effectiveExamName = selectedExam?.title || manualContext.examName?.trim() || "";
  const effectiveExamDate = selectedExam?.examDate || manualContext.examDate?.trim() || "";
  const examMap = buildExamMap(selectedExam);
  const variableCheck = validateTemplateVariables(body);
  const requiresExam = variableCheck.variables.some((name) => examVariableNames.has(name));

  const filteredStudents = students.filter((student) => {
    const result = examMap.byStudent.get(student.id);
    const searchable = `${student.name} ${student.phone} ${student.parentPhone} ${student.schoolName} ${student.grade} ${student.classGroupNames.join(" ")}`.toLowerCase();
    if (classGroupId !== "all" && !student.classGroupIds.includes(classGroupId)) return false;
    if (search.trim() && !searchable.includes(search.trim().toLowerCase())) return false;
    if (quickFilter === "GUARDIAN_PHONE") return Boolean(student.parentPhone);
    if (quickFilter === "STUDENT_PHONE") return Boolean(student.phone);
    if (quickFilter === "NO_SCORE") return Boolean(selectedExam) && !result;
    if (quickFilter === "BELOW_AVERAGE") return Boolean(result && examMap.average !== null && result.totalScore < examMap.average);
    if (quickFilter === "UNDER_60") return Boolean(result && result.totalScore < 60);
    if (quickFilter === "UNDER_70") return Boolean(result && result.totalScore < 70);
    if (quickFilter === "REVIEW_NEEDED") return Boolean(result && result.reviewNeededCount > 0);
    if (quickFilter === "MANY_WRONG") return Boolean(result && result.wrongCount + result.blankCount >= 5);
    if (quickFilter === "REMEDIAL") return remedialReasons(result, examMap.average).length > 0;
    return true;
  });

  const selected = new Set(selectedStudentIds);
  const selectedStudents = students.filter((student) => selected.has(student.id));

  const previewStudents: MessageStudent[] = selectedStudents.map((student) => ({
    id: student.id,
    name: student.name,
    phone: student.phone,
    parentPhone: student.parentPhone,
    className: effectiveClassName || student.classGroupNames.join(", "),
    schoolName: student.schoolName,
    grade: student.grade,
    templateData: examTemplateData(selectedExam, examMap.byStudent.get(student.id), examMap.average, examMap.rankByStudent.get(student.id), student),
  }));

  const context: TemplateContext = { ...manualContext, className: effectiveClassName, lessonName: effectiveLessonName, lessonRound: effectiveLessonRound, lessonDate: effectiveLessonDate, examName: effectiveExamName, examDate: effectiveExamDate, academyName };
  const preview = buildMessageRecipients({ students: previewStudents, targetType, body, context, isMarketing, subject: title, unsubPhone: settings.unsubPhone });
  const previewRecipient = preview.recipients.find((recipient) => recipient.localId === previewRecipientId) ?? preview.recipients[0] ?? null;
  const canRequestActual = canSendActual && settings.canSendActual && !settings.dryRun && preview.unknownVariables.length === 0 && preview.missingVariables.length === 0;
  const allFilteredSelected = filteredStudents.length > 0 && filteredStudents.every((student) => selectedStudentIds.includes(student.id));
  const filledManualCount = manualContextFields.filter(([key]) => Boolean(contextValue(key, manualContext, selectedClassGroup, selectedLesson, selectedExam))).length;

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (document.activeElement === editor && lastRenderedBodyRef.current !== "") return;
    renderTokenEditor(editor, body);
    lastRenderedBodyRef.current = body;
  }, [body]);

  const selectTemplate = (id: string) => {
    setTemplateId(id);
    const template = templates.find((item) => item.id === id);
    if (!template) return;
    setTitle(template.title || template.name);
    setTargetType((template.targetType as MessageTargetType) || "GUARDIAN");
    setPreviewRecipientId("");
    setBody(template.body);
    setIsMarketing(Boolean(template.isMarketing));
  };
  const updateManualContext = (key: ManualContextKey, value: string) => {
    setManualContext((current) => ({ ...current, [key]: value }));
  };
  const selectContextClass = (id: string) => {
    setClassGroupId(id);
    setLessonId("");
    setExamId("");
    setManualContext((current) => ({ ...current, className: "", lessonName: "", lessonRound: "", lessonDate: "", examName: "", examDate: "" }));
  };
  const selectContextLesson = (id: string) => {
    setLessonId(id);
    setManualContext((current) => ({ ...current, lessonRound: "", lessonDate: "" }));
  };
  const selectContextExam = (id: string) => {
    setExamId(id);
    const exam = exams.find((item) => item.id === id);
    if (!exam) {
      setManualContext((current) => ({ ...current, examName: "", examDate: "" }));
      return;
    }
    if (exam.classGroupId) {
      setClassGroupId(exam.classGroupId);
      setLessonId("");
    }
    setManualContext((current) => ({ ...current, examName: "", examDate: "" }));
  };
  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((current) => current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId]);
    setPreviewRecipientId((current) => current.startsWith(`${studentId}:`) ? "" : current);
  };
  const addFilteredStudents = (nextTargetType?: MessageTargetType) => {
    const filteredIds = filteredStudents.map((student) => student.id);
    flushSync(() => {
      if (nextTargetType) setTargetType(nextTargetType);
      setSelectedStudentIds((current) => Array.from(new Set([...current, ...filteredIds])));
      setPreviewRecipientId("");
    });
  };
  const toggleFilteredStudents = () => {
    const filteredIds = filteredStudents.map((student) => student.id);
    const filteredIdSet = new Set(filteredIds);
    setSelectedStudentIds((current) => allFilteredSelected ? current.filter((id) => !filteredIdSet.has(id)) : Array.from(new Set([...current, ...filteredIds])));
    setPreviewRecipientId((current) => filteredIds.some((studentId) => current.startsWith(`${studentId}:`)) ? "" : current);
  };
  const insertVariable = (variable: string) => {
    const editor = editorRef.current;
    if (!editor) return setBody((current) => `${current}{{${variable}}}`);
    editor.focus();
    insertVariableToken(editor, variable);
    const nextBody = serializeTokenEditor(editor);
    lastRenderedBodyRef.current = nextBody;
    setBody(nextBody);
  };
  const updateBodyFromEditor = () => {
    const editor = editorRef.current;
    if (!editor) return;
    const nextBody = serializeTokenEditor(editor);
    lastRenderedBodyRef.current = nextBody;
    setBody(nextBody);
  };
  const handleEditorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    insertPlainTextIntoEditor("\n");
    updateBodyFromEditor();
  };
  const handleEditorPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    insertPlainTextIntoEditor(event.clipboardData.getData("text/plain"));
    updateBodyFromEditor();
  };
  const openConfirm = (mode: "dry-run" | "actual") => { setSendMode(mode); setConfirmOpen(true); };

  if (!canCompose) return <section style={panel}><h2 style={panelTitle}>문자 작성</h2><div style={notice}>현재 계정은 문자 작성 권한이 없습니다.</div></section>;

  return (
    <section style={panel}>
      <div style={panelHead}>
        <div><h2 style={panelTitle}>문자 작성</h2><p style={desc}>입력 → 검증 → 확인 → 실행 흐름으로 문자 발송을 준비합니다.</p></div>
        <span style={settings.canSendActual && !settings.dryRun ? okBadge : infoBadge}>{settings.canSendActual && !settings.dryRun ? "실제 발송 가능" : settings.dryRun ? "테스트 모드" : "설정 확인 필요"}</span>
      </div>
      {!settings.canSendActual && <div style={notice}><b>쏘다 API 연결 확인이 필요합니다.</b><span>{settings.reason ?? "문자 발송 설정에서 API Key, Token Key, 발신번호를 확인해주세요."}</span><a href="/messages?tab=settings" style={link}>문자 발송 설정으로 이동</a></div>}

      <form ref={formRef} action={sendMessageJobAction} style={layout}>
        <input type="hidden" name="studentIds" value={JSON.stringify(selectedStudentIds)} />
        <input type="hidden" name="sendMode" value={sendMode} />
        <input type="hidden" name="className" value={effectiveClassName} />
        <input type="hidden" name="examId" value={examId} />
        {manualContextFields.filter(([key]) => key !== "className").map(([key]) => <input key={key} type="hidden" name={key} value={contextValue(key, manualContext, selectedClassGroup, selectedLesson, selectedExam)} />)}
        <input type="hidden" name="isMarketing" value={isMarketing ? "true" : "false"} />
        <input type="hidden" name="unsubPhone" value={settings.unsubPhone ?? ""} />

        <section style={card} aria-label="대상자별 미리보기">
          <div style={sectionHead}><h3 style={sectionTitle}>미리보기</h3><span style={mutedBadge}>{previewRecipient?.messageKind ?? "SMS"}</span></div>
          <div style={phoneBox}>
            <div style={mutedText}>{previewRecipient ? `${previewRecipient.receiverName} · ${previewRecipient.phone}` : "대상자를 선택하세요"}</div>
            <div style={bubble}>{previewRecipient?.messageText || "선택한 대상자의 실제 치환 문구가 표시됩니다."}</div>
            <div style={mutedRight}>{previewRecipient ? `${previewRecipient.byteLength ?? 0} byte · ${previewRecipient.messageKind}` : `${messageByteLength(body)} byte`}</div>
          </div>
          {isMarketing && <div style={warn}>광고 문자는 수신동의 대상만 포함되며 무료 수신거부 번호가 필요합니다.</div>}
          {requiresExam && !selectedExam && <div style={warn}>시험 결과 태그는 시험 선택 또는 직접 입력 태그 값이 필요합니다.</div>}
          {preview.unknownVariables.length > 0 && <div style={warn}>허용되지 않은 변수: {preview.unknownVariables.map((item) => `{{${item}}}`).join(", ")}</div>}
          {preview.missingVariables.length > 0 && <div style={warn}>{preview.missingVariables.length}명에게 값이 없는 변수가 있습니다.</div>}
          <MessagePreviewList preview={preview} onSelectRecipient={setPreviewRecipientId} selectedRecipientId={previewRecipient?.localId} />
        </section>

        <section style={card} aria-label="문자 작성">
          <div style={sectionHead}><h3 style={sectionTitle}>작성</h3><span style={mutedBadge}>{body.length}자 · {messageByteLength(body)} byte</span></div>
          <div style={twoCols}>
            <label style={field}><span>템플릿</span><select name="templateId" value={templateId} onChange={(event) => selectTemplate(event.target.value)} style={input}><option value="">직접 작성</option>{templates.filter((template) => template.isActive).map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
            <label style={field}><span>제목</span><input name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={40} style={input} /></label>
          </div>
          <div style={pillRow}>{messageTargetTypes.map((target) => <label key={target.value} style={{ ...pill, ...(targetType === target.value ? activePill : {}) }}><input type="radio" name="targetType" value={target.value} checked={targetType === target.value} onChange={() => { setTargetType(target.value); setPreviewRecipientId(""); }} />{target.label}</label>)}</div>
          <label style={checkLine}><input type="checkbox" checked={isMarketing} onChange={(event) => setIsMarketing(event.target.checked)} /> 광고 문자로 발송</label>
          <input type="hidden" name="body" value={body} />
          <div ref={editorRef} contentEditable suppressContentEditableWarning role="textbox" aria-label="문자 본문" style={tokenEditor} onInput={updateBodyFromEditor} onKeyDown={handleEditorKeyDown} onPaste={handleEditorPaste} />
          <div style={variableBox}>{variableGroups.map(([group, items]) => <div key={group} style={chipLine}><b>{group}</b>{items.map((item) => <button key={item} type="button" style={chip} title={`{{${item}}}`} aria-label={`${variableLabels[item]} 태그 삽입`} onClick={() => insertVariable(item)}>{variableLabels[item]}</button>)}</div>)}</div>
          <div style={contextBar}><button type="button" style={smallButton} onClick={() => setContextOpen(true)}>직접 입력 태그 값</button><span style={smallText}>{filledManualCount}개 값 준비됨</span></div>
          <div style={actions}><button type="button" style={secondaryButton} disabled={preview.recipients.length === 0} onClick={() => openConfirm("dry-run")}>테스트 실행</button><button type="button" style={primaryButton} disabled={preview.recipients.length === 0 || !canRequestActual} onClick={() => openConfirm("actual")}>{preview.recipients.length}명에게 문자 발송</button>{!canRequestActual && <span style={smallText}>설정, 변수, 누락 데이터를 확인해주세요.</span>}</div>
        </section>

        <section style={card} aria-label="발송 대상 선택">
          <div style={sectionHead}><h3 style={sectionTitle}>대상 선택</h3><button type="button" style={smallButton} onClick={toggleFilteredStudents}>{allFilteredSelected ? "필터 결과 해제" : "필터 결과 선택"}</button></div>
          <label style={field}><span>반 선택</span><select value={classGroupId} onChange={(event) => selectContextClass(event.target.value)} style={input}><option value="all">전체 반</option>{classGroups.map((classGroup) => <option key={classGroup.id} value={classGroup.id}>{classGroup.name}</option>)}</select></label>
          <label style={field}><span>학생 검색</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="이름, 전화번호, 반" style={input} /></label>
          <div style={pillRow}>{quickFilters.map(([value, label]) => <button key={value} type="button" style={{ ...filterButton, ...(quickFilter === value ? activeFilter : {}) }} onClick={() => setQuickFilter(value)}>{label}</button>)}</div>
          <div style={bulkRow}><button type="button" style={smallButton} onClick={() => addFilteredStudents("GUARDIAN")}>{filteredStudents.length}명 학부모 선택</button><button type="button" style={smallButton} onClick={() => addFilteredStudents("STUDENT")}>{filteredStudents.length}명 학생 선택</button><button type="button" style={smallButton} onClick={() => addFilteredStudents("BOTH")}>{filteredStudents.length}명 학생+학부모</button></div>
          <div style={studentList}>{filteredStudents.slice(0, 260).map((student) => {
            const selected = selectedStudentIds.includes(student.id);
            const result = examMap.byStudent.get(student.id);
            const reasons = remedialReasons(result, examMap.average);
            return <label key={student.id} style={{ ...studentRow, ...(selected ? selectedRow : {}) }}><input type="checkbox" checked={selected} onChange={() => toggleStudent(student.id)} /><span style={studentMain}><b>{student.name}</b><small>{[student.schoolName, student.grade, student.classGroupNames.join(", ")].filter(Boolean).join(" · ") || "정보 없음"}</small></span><span style={scoreText}>{selectedExam ? result ? `${result.totalScore}/${result.maxScore || selectedExam.totalScore || 100}점` : "미응시" : "시험 미선택"}</span><span style={badgeWrap}>{result && examMap.average !== null && result.totalScore < examMap.average && <BadgeText>평균 이하</BadgeText>}{reasons.length > 0 && <BadgeText tone="warn">보강 필요</BadgeText>}{result?.reviewNeededCount ? <BadgeText tone="danger">검수 필요</BadgeText> : null}{!student.parentPhone && <BadgeText tone="muted">학부모 번호 없음</BadgeText>}</span></label>;
          })}{filteredStudents.length === 0 && <div style={emptyBox}>조건에 맞는 학생이 없습니다.</div>}</div>
        </section>
      </form>

      {contextOpen && <div style={modalBackdrop} role="presentation"><div style={modal} role="dialog" aria-modal="true" aria-label="직접 입력 태그 값"><div style={sectionHead}><h3 style={modalTitle}>직접 입력 태그 값</h3><button type="button" style={ghostButton} onClick={() => setContextOpen(false)}>닫기</button></div><div style={contextGrid}><label style={field}><span>시험 선택</span><select value={examId} onChange={(event) => selectContextExam(event.target.value)} style={input}><option value="">시험 선택 안 함</option>{exams.filter((exam) => classGroupId === "all" || !exam.classGroupId || exam.classGroupId === classGroupId).map((exam) => <option key={exam.id} value={exam.id}>{exam.title}{exam.examDate ? ` · ${exam.examDate}` : ""}</option>)}</select></label><label style={field}><span>강의 선택</span><select value={classGroupId} onChange={(event) => selectContextClass(event.target.value)} style={input}><option value="all">선택 안 함</option>{classGroups.map((classGroup) => <option key={classGroup.id} value={classGroup.id}>{classGroup.name}</option>)}</select></label><label style={field}><span>차시 선택</span><select value={lessonId} onChange={(event) => selectContextLesson(event.target.value)} style={input} disabled={!selectedClassGroup}><option value="">차시 선택 안 함</option>{selectedClassGroup?.lessons?.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}{lesson.lessonDate ? ` · ${lesson.lessonDate}` : ""}</option>)}</select></label></div><div style={contextGrid}>{manualContextFields.filter(([key]) => !["className", "lessonName", "lessonRound", "lessonDate", "examName", "examDate"].includes(key)).map(([key, label, placeholder]) => <label key={key} style={field}><span>{label}</span><input value={manualContext[key] ?? ""} onChange={(event) => updateManualContext(key, event.target.value)} placeholder={placeholder} style={input} /></label>)}</div><div style={modalActions}><button type="button" style={ghostButton} onClick={() => { setLessonId(""); setExamId(""); setManualContext({} as Record<ManualContextKey, string>); }}>비우기</button><button type="button" style={primaryButton} onClick={() => setContextOpen(false)}>적용</button></div></div></div>}
      {confirmOpen && <div style={modalBackdrop} role="presentation"><div style={modal} role="dialog" aria-modal="true" aria-label="문자 발송 확인"><h3 style={modalTitle}>{sendMode === "actual" ? "최종 발송 확인" : "테스트 실행 확인"}</h3><div style={modalStats}><Summary label="발송 대상" value={`${preview.recipients.length}명`} /><Summary label="학생" value={`${preview.recipients.filter((recipient) => recipient.recipientType === "STUDENT").length}명`} /><Summary label="학부모" value={`${preview.recipients.filter((recipient) => recipient.recipientType === "GUARDIAN").length}명`} /><Summary label="제외" value={`${preview.skipped.length}건`} /><Summary label="유형" value={preview.maxByteLength > 80 ? "LMS 포함" : "SMS"} /><Summary label="광고" value={isMarketing ? "예" : "아니오"} /></div><p style={modalCopy}>{sendMode === "actual" ? `${preview.recipients.length}명에게 문자를 발송합니다. 이 작업은 되돌릴 수 없습니다.` : "테스트 실행은 실제 발송 없이 로그와 검증 흐름을 확인합니다."}</p>{preview.missingVariables.length > 0 && <p style={modalWarn}>값이 없는 변수가 있어 실제 발송은 차단됩니다.</p>}<div style={modalPreview}>{previewRecipient?.messageText ?? body}</div><div style={modalActions}><button type="button" style={ghostButton} onClick={() => setConfirmOpen(false)}>닫기</button><button type="button" style={sendMode === "actual" ? primaryButton : secondaryButton} onClick={() => { setConfirmOpen(false); window.setTimeout(() => formRef.current?.requestSubmit(), 0); }}>{sendMode === "actual" ? `${preview.recipients.length}명에게 문자 발송` : "테스트 실행"}</button></div></div></div>}
    </section>
  );
}

function buildExamMap(exam: MessageExamOption | null) {
  const byStudent = new Map<string, MessageExamOption["results"][number]>();
  const rankByStudent = new Map<string, number>();
  if (!exam) return { byStudent, average: null as number | null, rankByStudent };
  for (const result of exam.results) byStudent.set(result.studentId, result);
  const average = exam.results.length ? exam.results.reduce((sum, result) => sum + result.totalScore, 0) / exam.results.length : null;
  exam.results.slice().sort((a, b) => b.totalScore - a.totalScore).forEach((result, index) => rankByStudent.set(result.studentId, index + 1));
  return { byStudent, average, rankByStudent };
}

function examTemplateData(exam: MessageExamOption | null, result: MessageExamOption["results"][number] | undefined, average: number | null, rank: number | undefined, student: MessageStudentOption): TemplateContext {
  if (!exam) return { level: student.currentLevel || student.grade };
  if (!result) return { examName: exam.title, examDate: exam.examDate, remedialReason: "미응시", level: student.currentLevel || student.grade };
  const total = result.correctCount + result.wrongCount + result.blankCount;
  const wrongRate = total > 0 ? ((result.wrongCount + result.blankCount) / total) * 100 : 0;
  return { examName: exam.title, examDate: exam.examDate, score: result.totalScore, maxScore: result.maxScore || exam.totalScore || 100, averageScore: average === null ? "" : average.toFixed(1), rank: rank ?? "", correctCount: result.correctCount, wrongCount: result.wrongCount, blankCount: result.blankCount, weakType: "", wrongQuestions: "", remedialReason: remedialReasons(result, average).join(", "), feedback: wrongRate >= 40 ? "오답 복습이 필요합니다." : "", level: student.currentLevel || student.grade };
}

function remedialReasons(result: MessageExamOption["results"][number] | undefined, average: number | null) {
  if (!result) return [];
  const total = result.correctCount + result.wrongCount + result.blankCount;
  const wrongRate = total > 0 ? ((result.wrongCount + result.blankCount) / total) * 100 : 0;
  const reasons: string[] = [];
  if (result.totalScore < 60) reasons.push("60점 미만");
  if (average !== null && result.totalScore <= average - 15) reasons.push("평균보다 15점 이상 낮음");
  if (wrongRate >= 40) reasons.push("오답률 40% 이상");
  if (result.reviewNeededCount > 0) reasons.push("검수 필요");
  return reasons;
}

function BadgeText({ children, tone = "info" }: { children: string; tone?: "info" | "warn" | "danger" | "muted" }) { return <span style={{ ...badge, ...(tone === "warn" ? badgeWarn : tone === "danger" ? badgeDanger : tone === "muted" ? badgeMuted : {}) }}>{children}</span>; }
function Summary({ label, value }: { label: string; value: string }) { return <div style={stat}><span>{label}</span><b>{value}</b></div>; }
export function categoryLabel(value: string) { return messageCategories.find((category) => category.value === value)?.label ?? value; }

function contextValue(key: ManualContextKey, manualContext: Record<ManualContextKey, string>, selectedClassGroup: MessageClassGroupOption | null, selectedLesson: MessageClassLessonOption | null, selectedExam: MessageExamOption | null) {
  if (key === "className") return manualContext.className?.trim() || selectedClassGroup?.name || "";
  if (key === "lessonName") return manualContext.lessonName?.trim() || selectedClassGroup?.name || "";
  if (key === "lessonRound") return manualContext.lessonRound?.trim() || selectedLesson?.title || "";
  if (key === "lessonDate") return manualContext.lessonDate?.trim() || selectedLesson?.lessonDate || "";
  if (key === "examName") return selectedExam?.title || manualContext.examName?.trim() || "";
  if (key === "examDate") return selectedExam?.examDate || manualContext.examDate?.trim() || "";
  return manualContext[key]?.trim() || "";
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

const panel: CSSProperties = { display: "grid", gap: 10 };
const panelHead: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 };
const panelTitle: CSSProperties = { margin: 0, fontSize: 18, fontWeight: 950 };
const desc: CSSProperties = { margin: "4px 0 0", color: "var(--asc-text-muted)", fontSize: 13 };
const layout: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(280px, .78fr) minmax(380px, 1fr) minmax(420px, 1.12fr)", gap: 10, alignItems: "start" };
const card: CSSProperties = { minWidth: 0, border: "1px solid transparent", borderRadius: "var(--asc-radius-lg)", background: "var(--asc-surface)", padding: 10, display: "grid", gap: 9, boxShadow: "var(--asc-shadow-sm)" };
const sectionHead: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 };
const sectionTitle: CSSProperties = { margin: 0, fontSize: 16, fontWeight: 950 };
const infoBadge: CSSProperties = { border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-info-soft)", color: "var(--asc-info)", padding: "7px 10px", fontWeight: 950, whiteSpace: "nowrap" };
const okBadge: CSSProperties = { ...infoBadge, background: "var(--asc-success-soft)", color: "var(--asc-success)" };
const mutedBadge: CSSProperties = { border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", padding: "4px 8px", background: "var(--asc-bg-subtle)", color: "var(--asc-text-muted)", fontSize: 12, fontWeight: 900 };
const notice: CSSProperties = { border: "1px solid transparent", borderRadius: "var(--asc-radius-lg)", background: "var(--asc-warning-soft)", color: "var(--asc-warning-text)", padding: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", fontWeight: 900 };
const link: CSSProperties = { marginLeft: "auto", color: "var(--asc-primary)", fontWeight: 950 };
const twoCols: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 };
const field: CSSProperties = { display: "grid", gap: 5, color: "var(--asc-text-subtle)", fontSize: 12, fontWeight: 900 };
const input: CSSProperties = { width: "100%", height: 36, border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", padding: "0 10px", color: "var(--asc-text)", background: "var(--asc-bg-subtle)" };
const textarea: CSSProperties = { ...input, height: "auto", minHeight: 190, resize: "vertical", padding: 10, lineHeight: 1.5 };
const tokenEditor: CSSProperties = { ...textarea, overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", outline: "none" };
const pillRow: CSSProperties = { display: "flex", gap: 6, flexWrap: "wrap" };
const pill: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, borderWidth: 1, borderStyle: "solid", borderColor: "transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-bg-subtle)", padding: "7px 10px", fontWeight: 900, cursor: "pointer" };
const activePill: CSSProperties = { borderColor: "var(--asc-primary)", background: "var(--asc-primary-soft)", color: "var(--asc-primary)" };
const checkLine: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 900, color: "var(--asc-text-subtle)" };
const variableBox: CSSProperties = { display: "grid", gap: 6 };
const chipLine: CSSProperties = { display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", fontSize: 12 };
const chip: CSSProperties = { border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-bg-subtle)", padding: "5px 8px", fontSize: 12, fontWeight: 900, color: "var(--asc-text-subtle)", cursor: "pointer", boxShadow: "inset 0 0 0 1px var(--asc-border-subtle)" };
const contextBar: CSSProperties = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" };
const contextGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 };
const actions: CSSProperties = { display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" };
const secondaryButton: CSSProperties = { height: 38, border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-primary-soft)", color: "var(--asc-primary)", padding: "0 14px", fontWeight: 950 };
const primaryButton: CSSProperties = { ...secondaryButton, background: "var(--asc-primary)", color: "#fff" };
const ghostButton: CSSProperties = { ...secondaryButton, background: "var(--asc-bg-subtle)", color: "var(--asc-text)" };
const smallText: CSSProperties = { color: "var(--asc-text-muted)", fontSize: 12, fontWeight: 800 };
const phoneBox: CSSProperties = { border: "1px solid transparent", borderRadius: "var(--asc-radius-lg)", background: "var(--asc-bg-subtle)", padding: 10, display: "grid", gap: 8 };
const bubble: CSSProperties = { border: "1px solid transparent", borderRadius: "var(--asc-radius-lg)", background: "var(--asc-surface)", padding: 10, minHeight: 150, whiteSpace: "pre-wrap", lineHeight: 1.5, boxShadow: "var(--asc-shadow-sm)" };
const mutedText: CSSProperties = { color: "var(--asc-text-muted)", fontSize: 12, fontWeight: 900 };
const mutedRight: CSSProperties = { ...mutedText, textAlign: "right" };
const warn: CSSProperties = { border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-warning-soft)", color: "var(--asc-warning-text)", padding: 8, fontWeight: 900, fontSize: 12 };
const filterButton: CSSProperties = { borderWidth: 1, borderStyle: "solid", borderColor: "transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-bg-subtle)", padding: "6px 9px", fontSize: 12, fontWeight: 900 };
const activeFilter: CSSProperties = { borderColor: "var(--asc-primary)", background: "var(--asc-primary-soft)", color: "var(--asc-primary)" };
const bulkRow: CSSProperties = { display: "flex", gap: 6, flexWrap: "wrap" };
const smallButton: CSSProperties = { height: 30, border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-bg-subtle)", color: "var(--asc-text)", padding: "0 10px", fontWeight: 900 };
const studentList: CSSProperties = { display: "grid", gap: 5, maxHeight: 520, overflowY: "auto", paddingRight: 2 };
const studentRow: CSSProperties = { display: "grid", gridTemplateColumns: "22px minmax(120px, 1fr) minmax(90px, .5fr) minmax(130px, .8fr)", alignItems: "center", gap: 7, borderWidth: 1, borderStyle: "solid", borderColor: "transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-bg-subtle)", padding: "7px 8px", cursor: "pointer" };
const selectedRow: CSSProperties = { borderColor: "var(--asc-primary)", background: "var(--asc-primary-soft)" };
const studentMain: CSSProperties = { display: "grid", minWidth: 0 };
const scoreText: CSSProperties = { color: "var(--asc-text-muted)", fontSize: 12, fontWeight: 900 };
const badgeWrap: CSSProperties = { display: "flex", gap: 4, flexWrap: "wrap" };
const badge: CSSProperties = { border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", padding: "3px 6px", background: "var(--asc-info-soft)", color: "var(--asc-info)", fontSize: 11, fontWeight: 900, whiteSpace: "nowrap" };
const badgeWarn: CSSProperties = { background: "var(--asc-warning-soft)", color: "var(--asc-warning-text)" };
const badgeDanger: CSSProperties = { background: "var(--asc-danger-soft)", color: "var(--asc-danger)" };
const badgeMuted: CSSProperties = { background: "var(--asc-bg-subtle)", color: "var(--asc-text-muted)" };
const emptyBox: CSSProperties = { border: "1px dashed var(--asc-border-subtle)", borderRadius: "var(--asc-radius-lg)", padding: 12, color: "var(--asc-text-muted)", background: "var(--asc-bg-subtle)", textAlign: "center", fontWeight: 900 };
const modalBackdrop: CSSProperties = { position: "fixed", inset: 0, zIndex: 120, background: "rgba(15,23,42,.46)", display: "grid", placeItems: "center", padding: 18 };
const modal: CSSProperties = { width: "min(620px, calc(100vw - 36px))", border: "1px solid transparent", borderRadius: "var(--asc-radius-lg)", background: "var(--asc-surface)", boxShadow: "var(--asc-shadow-modal)", padding: 14, display: "grid", gap: 9 };
const modalTitle: CSSProperties = { margin: 0, fontSize: 18, fontWeight: 950 };
const modalStats: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 };
const stat: CSSProperties = { border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-bg-subtle)", padding: 9, display: "grid", gap: 3, fontSize: 12, color: "var(--asc-text-muted)", fontWeight: 850 };
const modalCopy: CSSProperties = { margin: 0, color: "var(--asc-text)", fontWeight: 900 };
const modalWarn: CSSProperties = { margin: 0, ...warn };
const modalPreview: CSSProperties = { maxHeight: 140, overflowY: "auto", border: "1px solid transparent", borderRadius: "var(--asc-radius-lg)", background: "var(--asc-bg-subtle)", padding: 10, whiteSpace: "pre-wrap", color: "var(--asc-text-subtle)" };
const modalActions: CSSProperties = { display: "flex", justifyContent: "flex-end", gap: 8 };
