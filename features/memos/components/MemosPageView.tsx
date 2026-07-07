import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { PageHeader, Tabs } from "@/components/ui";
import { bulkStudentMemoAction } from "@/features/memos/actions/memoActions";
import AnnouncementMemoList, { type AnnouncementMemoView } from "@/features/memos/components/AnnouncementMemoList";
import PersonalStickyBoard, { type StickyMemoView } from "@/features/memos/components/PersonalStickyBoard";
import { canManageAnnouncements, requireUser } from "@/lib/auth";
import { getAssistantWorkNotes } from "@/lib/assistantWorkNotes";
import { MemoType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { surfaceBorder } from "@/lib/styles";

type Props = {
  searchParams?: Promise<{
    q?: string;
    source?: string;
    type?: string;
    important?: string;
    writerId?: string;
    from?: string;
    to?: string;
    sort?: string;
    error?: string;
    tab?: string;
  }>;
};

type MemoTab = "overview" | "records";

type MemoSource =
  | "announcement"
  | "student"
  | "student-base"
  | "class"
  | "lesson"
  | "assistant"
  | "work-shift"
  | "task"
  | "attendance"
  | "assignment"
  | "score"
  | "omr"
  | "calendar-event";

type MemoRow = {
  key: string;
  source: MemoSource;
  sourceLabel: string;
  targetLabel: string;
  targetHref: string;
  content: string;
  typeLabel: string;
  typeValue: string | null;
  isImportant: boolean;
  writerId: string | null;
  writerName: string;
  createdAt: Date;
  selectableStudentMemoId: string | null;
};

const sourceOptions = [
  ["all", "전체"],
  ["announcement", "공지"],
  ["student", "학생"],
  ["student-base", "학생 기본"],
  ["class", "반"],
  ["lesson", "수업"],
  ["assistant", "조교"],
  ["work-shift", "근무"],
  ["task", "업무"],
  ["attendance", "출결"],
  ["assignment", "과제"],
  ["score", "성적"],
  ["omr", "OMR"],
  ["calendar-event", "일정"],
] as const;

const memoTypes = Object.values(MemoType);

export const dynamic = "force-dynamic";

export default async function MemosPage({ searchParams }: Props) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const filters = normalizeFilters(params);
  const activeTab = normalizeTab(params.tab);
  const returnTo = buildReturnTo(filters, "records");
  const canManage = canManageAnnouncements(user.role);

  const [
    announcements,
    stickyMemos,
    studentMemos,
    studentBaseMemos,
    classMemos,
    classLessonMemos,
    assistantWorkNotes,
    assistantWorkShiftMemos,
    taskComments,
    attendanceMemos,
    assignmentMemos,
    scoreMemos,
    schoolScoreMemos,
    studentTestScoreMemos,
    omrUploadMemos,
    eventMemos,
    writers,
  ] = await Promise.all([
    prisma.announcementMemo.findMany({
      where: { academyId: user.academyId },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: 80,
      include: {
        author: { select: { id: true, name: true } },
        reads: { where: { userId: user.id }, select: { readAt: true } },
        _count: { select: { reads: true } },
      },
    }),
    prisma.personalStickyMemo.findMany({
      where: { academyId: user.academyId, userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 80,
      select: { id: true, content: true, color: true, createdAt: true, updatedAt: true },
    }),
    prisma.studentMemo.findMany({
      where: { student: { academyId: user.academyId } },
      orderBy: { createdAt: "desc" },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            schoolName: true,
            studentClasses: {
              where: { status: "ACTIVE" },
              take: 1,
              include: { classGroup: { select: { name: true } } },
            },
          },
        },
        writer: { select: { id: true, name: true } },
      },
    }),
    prisma.student.findMany({
      where: { academyId: user.academyId, memo: { not: null } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, schoolName: true, memo: true, updatedAt: true },
    }),
    prisma.classMemo.findMany({
      where: { academyId: user.academyId },
      orderBy: { createdAt: "desc" },
      include: {
        classGroup: { select: { id: true, name: true } },
        writer: { select: { id: true, name: true } },
      },
    }),
    prisma.classLesson.findMany({
      where: { academyId: user.academyId, memo: { not: null } },
      orderBy: { updatedAt: "desc" },
      include: { classGroup: { select: { id: true, name: true } } },
    }),
    getAssistantWorkNotes(user.academyId),
    prisma.assistantWorkShift.findMany({
      where: { academyId: user.academyId, memo: { not: null } },
      orderBy: { updatedAt: "desc" },
      include: {
        assistant: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.taskComment.findMany({
      where: { task: { academyId: user.academyId } },
      orderBy: { createdAt: "desc" },
      include: {
        writer: { select: { id: true, name: true } },
        task: {
          select: {
            id: true,
            title: true,
            student: { select: { name: true } },
            classGroup: { select: { name: true } },
          },
        },
      },
    }),
    prisma.attendanceRecord.findMany({
      where: { academyId: user.academyId, memo: { not: null } },
      orderBy: { updatedAt: "desc" },
      include: { student: { select: { id: true, name: true, schoolName: true } } },
    }),
    prisma.assignmentRecord.findMany({
      where: { academyId: user.academyId, memo: { not: null } },
      orderBy: { updatedAt: "desc" },
      include: { student: { select: { id: true, name: true, schoolName: true } } },
    }),
    prisma.scoreRecord.findMany({
      where: { academyId: user.academyId, memo: { not: null } },
      orderBy: { updatedAt: "desc" },
      include: { student: { select: { id: true, name: true, schoolName: true } } },
    }),
    prisma.schoolScoreRecord.findMany({
      where: { academyId: user.academyId, memo: { not: null } },
      orderBy: { updatedAt: "desc" },
      include: { student: { select: { id: true, name: true, schoolName: true } } },
    }),
    prisma.studentTestScore.findMany({
      where: { academyId: user.academyId, memo: { not: null } },
      orderBy: { updatedAt: "desc" },
      include: {
        student: { select: { id: true, name: true, schoolName: true } },
        classGroup: { select: { id: true, name: true } },
        exam: { select: { title: true } },
      },
    }),
    prisma.omrUpload.findMany({
      where: { academyId: user.academyId, memo: { not: null } },
      orderBy: { updatedAt: "desc" },
      include: {
        student: { select: { id: true, name: true, schoolName: true } },
        exam: { select: { title: true } },
      },
    }),
    prisma.calendarEventMemo.findMany({
      where: { academyId: user.academyId },
      orderBy: { eventDate: "desc" },
      include: { writer: { select: { id: true, name: true } } },
    }),
    prisma.user.findMany({
      where: { academyId: user.academyId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const announcementViews: AnnouncementMemoView[] = announcements
    .map((memo) => ({
      id: memo.id,
      title: memo.title,
      content: memo.content,
      priority: memo.priority,
      isPinned: memo.isPinned,
      createdAt: memo.createdAt,
      updatedAt: memo.updatedAt,
      authorId: memo.author.id,
      authorName: memo.author.name,
      readAt: memo.reads[0]?.readAt ?? null,
      readCount: memo._count.reads,
    }))
    .sort(sortAnnouncements);

  const stickyViews: StickyMemoView[] = stickyMemos.map((memo) => ({
    id: memo.id,
    content: memo.content,
    color: memo.color,
    updatedAt: memo.updatedAt,
  }));

  const userNameById = new Map(writers.map((writer) => [writer.id, writer.name]));

  const rows: MemoRow[] = [
    ...announcementViews.map((memo): MemoRow => ({
      key: `announcement:${memo.id}`,
      source: "announcement",
      sourceLabel: "공지",
      targetLabel: memo.title,
      targetHref: "/memos",
      content: memo.content,
      typeLabel: priorityText(memo.priority),
      typeValue: null,
      isImportant: memo.priority === "IMPORTANT" || memo.priority === "URGENT" || memo.isPinned,
      writerId: memo.authorId,
      writerName: memo.authorName,
      createdAt: memo.createdAt,
      selectableStudentMemoId: null,
    })),
    ...studentBaseMemos
      .filter((memo) => memo.memo?.trim())
      .map((memo): MemoRow => ({
        key: `student-base:${memo.id}`,
        source: "student-base",
        sourceLabel: "학생 기본",
        targetLabel: [memo.name, memo.schoolName].filter(Boolean).join(" / "),
        targetHref: `/students/${memo.id}`,
        content: memo.memo ?? "",
        typeLabel: "기본 메모",
        typeValue: null,
        isImportant: false,
        writerId: null,
        writerName: "-",
        createdAt: memo.updatedAt,
        selectableStudentMemoId: null,
      })),
    ...studentMemos.map((memo): MemoRow => ({
      key: `student:${memo.id}`,
      source: "student",
      sourceLabel: "학생",
      targetLabel: [memo.student.name, memo.student.studentClasses[0]?.classGroup.name, memo.student.schoolName].filter(Boolean).join(" / "),
      targetHref: `/students/${memo.studentId}?tab=memos`,
      content: memo.content,
      typeLabel: memoTypeText(memo.type),
      typeValue: memo.type,
      isImportant: memo.isImportant,
      writerId: memo.writerId,
      writerName: memo.writer.name,
      createdAt: memo.createdAt,
      selectableStudentMemoId: memo.id,
    })),
    ...classMemos.map((memo): MemoRow => ({
      key: `class:${memo.id}`,
      source: "class",
      sourceLabel: "반",
      targetLabel: memo.classGroup.name,
      targetHref: `/classes/${memo.classGroupId}`,
      content: memo.content,
      typeLabel: "반 메모",
      typeValue: null,
      isImportant: false,
      writerId: memo.writerId,
      writerName: memo.writer.name,
      createdAt: memo.createdAt,
      selectableStudentMemoId: null,
    })),
    ...classLessonMemos
      .filter((memo) => memo.memo?.trim())
      .map((memo): MemoRow => ({
        key: `lesson:${memo.id}`,
        source: "lesson",
        sourceLabel: "수업",
        targetLabel: [memo.classGroup.name, memo.title || `${memo.position}회차`, memo.lessonDate].filter(Boolean).join(" / "),
        targetHref: `/classes/${memo.classGroupId}`,
        content: memo.memo ?? "",
        typeLabel: "수업 메모",
        typeValue: null,
        isImportant: false,
        writerId: null,
        writerName: "-",
        createdAt: memo.updatedAt,
        selectableStudentMemoId: null,
      })),
    ...Object.entries(assistantWorkNotes).map(([assistantId, note]): MemoRow => ({
      key: `assistant-note:${assistantId}`,
      source: "assistant",
      sourceLabel: "조교",
      targetLabel: userNameById.get(assistantId) ?? "조교",
      targetHref: `/work?assistantId=${assistantId}`,
      content: note.content,
      typeLabel: "조교 운영 메모",
      typeValue: null,
      isImportant: false,
      writerId: note.updatedById || null,
      writerName: note.updatedByName || userNameById.get(note.updatedById) || "-",
      createdAt: safeDate(note.updatedAt),
      selectableStudentMemoId: null,
    })),
    ...assistantWorkShiftMemos
      .filter((memo) => memo.memo?.trim())
      .map((memo): MemoRow => ({
        key: `work-shift:${memo.id}`,
        source: "work-shift",
        sourceLabel: "근무",
        targetLabel: [memo.assistant.name, memo.workDate, `${memo.startTime}-${memo.endTime}`].filter(Boolean).join(" / "),
        targetHref: `/work?assistantId=${memo.assistantId}`,
        content: memo.memo ?? "",
        typeLabel: "근무 메모",
        typeValue: null,
        isImportant: false,
        writerId: memo.createdById,
        writerName: memo.createdBy?.name ?? "-",
        createdAt: memo.updatedAt,
        selectableStudentMemoId: null,
      })),
    ...taskComments.map((comment): MemoRow => ({
      key: `task:${comment.id}`,
      source: "task",
      sourceLabel: "업무",
      targetLabel: [comment.task.title, comment.task.student?.name, comment.task.classGroup?.name].filter(Boolean).join(" / "),
      targetHref: `/tasks/${comment.taskId}`,
      content: comment.content,
      typeLabel: "업무 메모",
      typeValue: null,
      isImportant: false,
      writerId: comment.writerId,
      writerName: comment.writer.name,
      createdAt: comment.createdAt,
      selectableStudentMemoId: null,
    })),
    ...attendanceMemos
      .filter((memo) => memo.memo?.trim())
      .map((memo): MemoRow => ({
        key: `attendance:${memo.id}`,
        source: "attendance",
        sourceLabel: "출결",
        targetLabel: [memo.student.name, memo.date, memo.status].filter(Boolean).join(" / "),
        targetHref: `/students/${memo.studentId}`,
        content: memo.memo ?? "",
        typeLabel: "출결 메모",
        typeValue: null,
        isImportant: false,
        writerId: null,
        writerName: "-",
        createdAt: memo.updatedAt,
        selectableStudentMemoId: null,
      })),
    ...assignmentMemos
      .filter((memo) => memo.memo?.trim())
      .map((memo): MemoRow => ({
        key: `assignment:${memo.id}`,
        source: "assignment",
        sourceLabel: "과제",
        targetLabel: [memo.student.name, memo.date, memo.title].filter(Boolean).join(" / "),
        targetHref: `/students/${memo.studentId}`,
        content: memo.memo ?? "",
        typeLabel: "과제 메모",
        typeValue: null,
        isImportant: false,
        writerId: null,
        writerName: "-",
        createdAt: memo.updatedAt,
        selectableStudentMemoId: null,
      })),
    ...scoreMemos
      .filter((memo) => memo.memo?.trim())
      .map((memo): MemoRow => ({
        key: `score:${memo.id}`,
        source: "score",
        sourceLabel: "성적",
        targetLabel: [memo.student.name, memo.date, memo.title].filter(Boolean).join(" / "),
        targetHref: `/students/${memo.studentId}`,
        content: memo.memo ?? "",
        typeLabel: "성적 메모",
        typeValue: null,
        isImportant: false,
        writerId: null,
        writerName: "-",
        createdAt: memo.updatedAt,
        selectableStudentMemoId: null,
      })),
    ...schoolScoreMemos
      .filter((memo) => memo.memo?.trim())
      .map((memo): MemoRow => ({
        key: `school-score:${memo.id}`,
        source: "score",
        sourceLabel: "성적",
        targetLabel: [memo.student.name, memo.term, memo.examType, memo.subject].filter(Boolean).join(" / "),
        targetHref: `/students/${memo.studentId}`,
        content: memo.memo ?? "",
        typeLabel: "학교 성적 메모",
        typeValue: null,
        isImportant: false,
        writerId: null,
        writerName: "-",
        createdAt: memo.updatedAt,
        selectableStudentMemoId: null,
      })),
    ...studentTestScoreMemos
      .filter((memo) => memo.memo?.trim())
      .map((memo): MemoRow => ({
        key: `test-score:${memo.id}`,
        source: "score",
        sourceLabel: "성적",
        targetLabel: [memo.student.name, memo.classGroup.name, memo.exam.title].filter(Boolean).join(" / "),
        targetHref: `/students/${memo.studentId}`,
        content: memo.memo ?? "",
        typeLabel: "시험 성적 메모",
        typeValue: null,
        isImportant: false,
        writerId: null,
        writerName: "-",
        createdAt: memo.updatedAt,
        selectableStudentMemoId: null,
      })),
    ...omrUploadMemos
      .filter((memo) => memo.memo?.trim())
      .map((memo): MemoRow => ({
        key: `omr:${memo.id}`,
        source: "omr",
        sourceLabel: "OMR",
        targetLabel: [memo.student?.name, memo.exam?.title, memo.fileName].filter(Boolean).join(" / "),
        targetHref: `/omr/uploads/${memo.id}`,
        content: memo.memo ?? "",
        typeLabel: "OMR 메모",
        typeValue: null,
        isImportant: false,
        writerId: null,
        writerName: "-",
        createdAt: memo.updatedAt,
        selectableStudentMemoId: null,
      })),
    ...eventMemos.map((memo): MemoRow => ({
      key: `calendar-event:${memo.id}`,
      source: "calendar-event",
      sourceLabel: "일정",
      targetLabel: [memo.title, memo.eventDate].filter(Boolean).join(" / "),
      targetHref: "/calendar",
      content: memo.content,
      typeLabel: memo.eventType === "task" ? "업무 일정" : "수업 일정",
      typeValue: null,
      isImportant: false,
      writerId: memo.writerId,
      writerName: memo.writer?.name ?? "-",
      createdAt: memo.createdAt,
      selectableStudentMemoId: null,
    })),
  ];

  const filteredRows = sortRows(filterRows(rows, filters), filters.sort);
  const visibleRows = filteredRows.slice(0, 500);
  const studentMemoCount = rows.filter((row) => row.source === "student").length;
  const classMemoCount = rows.filter((row) => row.source === "class").length;
  const importantCount = rows.filter((row) => row.isImportant).length;
  const otherMemoCount = rows.length - studentMemoCount - classMemoCount;
  const tabItems = [
    { label: "공지·메모", href: memoTabHref("overview"), active: activeTab === "overview", count: announcementViews.length + stickyViews.length },
    { label: "기록", href: memoTabHref("records"), active: activeTab === "records", count: rows.length },
  ];

  return (
    <main style={page}>
      <style>{memoPageCss}</style>
      <section style={container}>
        <div style={header}>
          <PageHeader
            eyebrow="메모"
            title="메모 관리"
            description="운영 공지, 개인 메모, 학생·반·업무 기록 메모를 빠르게 확인합니다."
          />
        </div>

        <div style={tabsWrap}>
          <Tabs items={tabItems} label="메모 관리 분류" />
        </div>

        {activeTab === "overview" && (
          <section className="memo-overview-grid" style={overviewGrid}>
            <AnnouncementMemoList announcements={announcementViews} canManage={canManage} error={params.error} />
            <PersonalStickyBoard memos={stickyViews} />
          </section>
        )}

        {activeTab === "records" && (
          <section style={legacyPanel}>
            <div style={legacyHead}>
              <div>
                <h2 style={legacyTitle}>기존 기록 메모</h2>
                <p style={legacyDesc}>학생·반·업무·캘린더에 연결된 메모는 보존하고, 필요할 때 검색해서 확인합니다.</p>
              </div>
              <div style={legacySummary}>
                <span style={legacyPill}>전체 {rows.length}개</span>
                <span style={legacyPill}>학생 {studentMemoCount}개</span>
                <span style={legacyPill}>기타 {classMemoCount + otherMemoCount}개</span>
                {importantCount > 0 && <span style={legacyWarnPill}>중요 {importantCount}개</span>}
              </div>
            </div>

            <form className="memo-filter-grid asc-filter-bar" style={filterBar}>
              <input type="hidden" name="tab" value="records" />
              <input className="memo-search-field" name="q" defaultValue={filters.q} placeholder="내용, 학생명, 반, 작성자 검색" style={searchInput} />
              <select name="source" defaultValue={filters.source} style={selectInput}>
                {sourceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <select name="type" defaultValue={filters.type} style={selectInput}>
                <option value="all">유형 전체</option>
                {memoTypes.map((type) => <option key={type} value={type}>{memoTypeText(type)}</option>)}
              </select>
              <select name="important" defaultValue={filters.important} style={selectInput}>
                <option value="all">중요 전체</option>
                <option value="important">중요만</option>
                <option value="normal">일반만</option>
              </select>
              <select name="writerId" defaultValue={filters.writerId} style={selectInput}>
                <option value="all">작성자 전체</option>
                {writers.map((writer) => <option key={writer.id} value={writer.id}>{writer.name}</option>)}
              </select>
              <input name="from" type="date" defaultValue={filters.from} style={dateInput} />
              <input name="to" type="date" defaultValue={filters.to} style={dateInput} />
              <select name="sort" defaultValue={filters.sort} style={selectInput}>
                <option value="newest">최신순</option>
                <option value="oldest">오래된순</option>
                <option value="important">중요 우선</option>
              </select>
              <button style={secondaryButton}>적용</button>
              <Link href="/memos?tab=records" style={ghostButton}>초기화</Link>
            </form>

            <form action={bulkStudentMemoAction} style={tablePanel}>
              <input type="hidden" name="returnTo" value={returnTo} />
              <div style={bulkBar}>
                <div style={bulkLeft}>
                  <b>{filteredRows.length}개</b>
                  <span>필터 결과</span>
                  <span style={muted}>일괄 변경은 학생 메모에만 적용됩니다.</span>
                  {filteredRows.length > visibleRows.length && <span style={muted}>최대 500개 표시 중</span>}
                </div>
                <div style={bulkActions}>
                  <button name="bulkAction" value="pin" style={smallButton}>중요 표시</button>
                  <button name="bulkAction" value="unpin" style={smallButton}>중요 해제</button>
                  <select name="memoType" defaultValue="GENERAL" style={compactSelect}>
                    {memoTypes.map((type) => <option key={type} value={type}>{memoTypeText(type)}</option>)}
                  </select>
                  <button name="bulkAction" value="type" style={smallButton}>유형 변경</button>
                </div>
              </div>

              <div style={tableWrap}>
                <table style={table}>
                  <thead>
                    <tr>
                      <Th>선택</Th>
                      <Th>구분</Th>
                      <Th>대상</Th>
                      <Th>내용</Th>
                      <Th>유형</Th>
                      <Th>작성자</Th>
                      <Th>작성일</Th>
                      <Th>이동</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => (
                      <tr key={row.key}>
                        <Td>
                          {row.selectableStudentMemoId ? (
                            <input type="checkbox" name="studentMemoIds" value={row.selectableStudentMemoId} aria-label={`${row.targetLabel} 선택`} />
                          ) : (
                            <span style={muted}>-</span>
                          )}
                        </Td>
                        <Td>
                          <span style={sourceBadge(row.source)}>{row.sourceLabel}</span>
                          {row.isImportant && <span style={importantBadge}>중요</span>}
                        </Td>
                        <Td><b>{row.targetLabel || "-"}</b></Td>
                        <Td><p className="memo-clamp" style={memoText}>{row.content}</p></Td>
                        <Td>{row.typeLabel}</Td>
                        <Td>{row.writerName}</Td>
                        <Td>{formatDateTime(row.createdAt)}</Td>
                        <Td><Link href={row.targetHref} style={linkButton}>열기</Link></Td>
                      </tr>
                    ))}
                    {visibleRows.length === 0 && (
                      <tr>
                        <td colSpan={8} style={emptyCell}>조건에 맞는 메모가 없습니다.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </form>
          </section>
        )}
      </section>
    </main>
  );
}

function normalizeTab(tab?: string): MemoTab {
  if (tab === "records") return "records";
  return "overview";
}

function memoTabHref(tab: MemoTab) {
  return tab === "overview" ? "/memos" : `/memos?tab=${tab}`;
}

function normalizeFilters(params: Awaited<NonNullable<Props["searchParams"]>>) {
  return {
    q: (params.q ?? "").trim(),
    source: sourceOptions.some(([value]) => value === params.source) ? params.source ?? "all" : "all",
    type: memoTypes.includes(params.type as MemoType) ? params.type ?? "all" : "all",
    important: ["important", "normal"].includes(params.important ?? "") ? params.important ?? "all" : "all",
    writerId: params.writerId || "all",
    from: /^\d{4}-\d{2}-\d{2}$/.test(params.from ?? "") ? params.from ?? "" : "",
    to: /^\d{4}-\d{2}-\d{2}$/.test(params.to ?? "") ? params.to ?? "" : "",
    sort: ["newest", "oldest", "important"].includes(params.sort ?? "") ? params.sort ?? "newest" : "newest",
  };
}

function filterRows(rows: MemoRow[], filters: ReturnType<typeof normalizeFilters>) {
  const query = filters.q.toLocaleLowerCase("ko-KR");
  return rows.filter((row) => {
    if (filters.source !== "all" && row.source !== filters.source) return false;
    if (filters.type !== "all" && row.typeValue !== filters.type) return false;
    if (filters.important === "important" && !row.isImportant) return false;
    if (filters.important === "normal" && row.isImportant) return false;
    if (filters.writerId !== "all" && row.writerId !== filters.writerId) return false;
    if (filters.from && dateKey(row.createdAt) < filters.from) return false;
    if (filters.to && dateKey(row.createdAt) > filters.to) return false;
    if (!query) return true;
    return [row.sourceLabel, row.targetLabel, row.content, row.typeLabel, row.writerName]
      .join(" ")
      .toLocaleLowerCase("ko-KR")
      .includes(query);
  });
}

function sortRows(rows: MemoRow[], sort: string) {
  return [...rows].sort((a, b) => {
    if (sort === "oldest") return a.createdAt.getTime() - b.createdAt.getTime();
    if (sort === "important" && a.isImportant !== b.isImportant) return a.isImportant ? -1 : 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

function sortAnnouncements(a: AnnouncementMemoView, b: AnnouncementMemoView) {
  if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
  const priorityRank: Record<string, number> = { URGENT: 0, IMPORTANT: 1, NORMAL: 2 };
  const rankDiff = (priorityRank[a.priority] ?? 3) - (priorityRank[b.priority] ?? 3);
  if (rankDiff !== 0) return rankDiff;
  return b.createdAt.getTime() - a.createdAt.getTime();
}

function priorityText(priority: string) {
  if (priority === "URGENT") return "긴급 공지";
  if (priority === "IMPORTANT") return "중요 공지";
  return "일반 공지";
}

function buildReturnTo(filters: ReturnType<typeof normalizeFilters>, tab: MemoTab) {
  const params = new URLSearchParams();
  if (tab !== "overview") params.set("tab", tab);
  for (const [key, value] of Object.entries(filters)) {
    if (!value || value === "all" || (key === "sort" && value === "newest")) continue;
    params.set(key, value);
  }
  const query = params.toString();
  return query ? `/memos?${query}` : "/memos";
}

function memoTypeText(type: string) {
  const labels: Record<string, string> = {
    GENERAL: "일반",
    STUDY: "학습",
    ATTENDANCE: "출결",
    ATTITUDE: "태도",
    COUNSELING: "상담",
    HOMEWORK: "과제",
    CLINIC: "클리닉",
    ETC: "기타",
  };
  return labels[type] ?? type;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function safeDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date(0) : date;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function Th({ children }: { children: ReactNode }) {
  return <th style={th}>{children}</th>;
}

function Td({ children }: { children: ReactNode }) {
  return <td style={td}>{children}</td>;
}

function sourceBadge(source: MemoSource): CSSProperties {
  const colors: Record<MemoSource, { bg: string; fg: string }> = {
    announcement: { bg: "var(--asc-accent-soft)", fg: "var(--asc-accent)" },
    student: { bg: "var(--asc-primary-soft)", fg: "var(--asc-primary)" },
    "student-base": { bg: "var(--asc-primary-softer)", fg: "var(--asc-primary-deep)" },
    class: { bg: "var(--asc-success-soft)", fg: "var(--asc-success)" },
    lesson: { bg: "var(--asc-success-soft)", fg: "var(--asc-success)" },
    assistant: { bg: "var(--asc-warning-soft)", fg: "var(--asc-warning-text)" },
    "work-shift": { bg: "var(--asc-warning-soft)", fg: "var(--asc-warning-text)" },
    task: { bg: "var(--asc-warning-soft)", fg: "var(--asc-warning-text)" },
    attendance: { bg: "var(--asc-info-soft)", fg: "var(--asc-info)" },
    assignment: { bg: "var(--asc-info-soft)", fg: "var(--asc-info)" },
    score: { bg: "var(--asc-danger-soft)", fg: "var(--asc-danger)" },
    omr: { bg: "var(--asc-bg-subtle)", fg: "var(--asc-text-subtle)" },
    "calendar-event": { bg: "var(--asc-danger-soft)", fg: "var(--asc-danger)" },
  };
  const color = colors[source];
  return { ...badge, background: color.bg, color: color.fg };
}

const memoPageCss = `
  .memo-overview-grid {
    grid-template-columns: minmax(0, 3fr) minmax(280px, 1fr);
  }
  .memo-filter-grid {
    grid-template-columns: minmax(260px, 2fr) repeat(4, minmax(112px, .8fr)) repeat(2, 128px) minmax(104px, .7fr) auto auto;
  }
  .memo-clamp {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }
  @media (max-width: 1120px) {
    .memo-overview-grid {
      grid-template-columns: 1fr;
    }
    .memo-filter-grid {
      grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
    }
    .memo-search-field {
      grid-column: 1 / -1;
    }
  }
`;

const page: CSSProperties = { padding: 10, color: "var(--asc-text)", background: "var(--asc-bg-subtle)", minHeight: "100vh" };
const container: CSSProperties = { width: "100%", maxWidth: "none", margin: 0, display: "grid", gap: 10 };
const header: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "transparent", border: 0, borderRadius: 0, padding: "0 2px 2px", boxShadow: "none" };
const tabsWrap: CSSProperties = { minWidth: 0 };
const overviewGrid: CSSProperties = { display: "grid", gap: 10, alignItems: "start" };
const legacyPanel: CSSProperties = { display: "grid", gap: 8, background: "var(--asc-surface)", border: surfaceBorder, borderRadius: "var(--asc-radius-lg)", padding: 10, boxShadow: "var(--asc-shadow-sm)" };
const legacyHead: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" };
const legacyTitle: CSSProperties = { margin: 0, fontSize: 18, fontWeight: 950 };
const legacyDesc: CSSProperties = { margin: "5px 0 0", color: "var(--asc-text-muted)", fontSize: 13 };
const legacySummary: CSSProperties = { display: "flex", gap: 6, flexWrap: "wrap", color: "var(--asc-text-subtle)", fontSize: 12, fontWeight: 900 };
const legacyPill: CSSProperties = { border: "1px solid transparent", background: "var(--asc-bg-subtle)", borderRadius: "var(--asc-radius-md)", padding: "5px 8px" };
const legacyWarnPill: CSSProperties = { ...legacyPill, background: "var(--asc-warning-soft)", color: "var(--asc-warning-text)" };
const filterBar: CSSProperties = { display: "grid", gap: 7, background: "var(--asc-bg-subtle)", border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", padding: 8, alignItems: "center" };
const searchInput: CSSProperties = { height: 34, border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", padding: "0 10px", minWidth: 0, color: "var(--asc-text)", background: "var(--asc-surface)" };
const selectInput: CSSProperties = { ...searchInput };
const dateInput: CSSProperties = { ...searchInput };
const secondaryButton: CSSProperties = { height: 34, border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-primary)", color: "#fff", padding: "0 12px", fontWeight: 950, cursor: "pointer" };
const ghostButton: CSSProperties = { height: 34, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-surface)", color: "var(--asc-text)", padding: "0 12px", fontWeight: 950, textDecoration: "none" };
const tablePanel: CSSProperties = { background: "var(--asc-surface)", border: "1px solid var(--asc-border-subtle)", borderRadius: "var(--asc-radius-md)", overflow: "hidden" };
const bulkBar: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 10px", borderBottom: "1px solid var(--asc-border-subtle)", flexWrap: "wrap" };
const bulkLeft: CSSProperties = { display: "flex", alignItems: "center", gap: 8, color: "var(--asc-text-subtle)", fontSize: 13, flexWrap: "wrap" };
const bulkActions: CSSProperties = { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" };
const smallButton: CSSProperties = { height: 30, border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-bg-subtle)", color: "var(--asc-text)", padding: "0 9px", fontSize: 12, fontWeight: 950, cursor: "pointer" };
const compactSelect: CSSProperties = { height: 30, border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-bg-subtle)", color: "var(--asc-text)", padding: "0 8px", fontSize: 12, fontWeight: 850 };
const tableWrap: CSSProperties = { overflow: "auto" };
const table: CSSProperties = { width: "100%", minWidth: 940, borderCollapse: "collapse", fontSize: 12 };
const th: CSSProperties = { textAlign: "left", padding: "8px 9px", background: "var(--asc-bg-subtle)", borderBottom: "1px solid var(--asc-border-subtle)", color: "var(--asc-text-subtle)", whiteSpace: "nowrap", fontWeight: 950 };
const td: CSSProperties = { padding: "7px 9px", borderBottom: "1px solid var(--asc-border-subtle)", verticalAlign: "top" };
const memoText: CSSProperties = { margin: 0, maxWidth: 560, whiteSpace: "normal", lineHeight: 1.35, color: "var(--asc-text-subtle)", overflow: "hidden" };
const badge: CSSProperties = { display: "inline-flex", alignItems: "center", borderRadius: "var(--asc-radius-md)", padding: "3px 7px", fontSize: 11, fontWeight: 950, whiteSpace: "nowrap", marginRight: 4 };
const importantBadge: CSSProperties = { ...badge, background: "var(--asc-warning-soft)", color: "var(--asc-warning-text)" };
const linkButton: CSSProperties = { display: "inline-flex", alignItems: "center", height: 26, border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-bg-subtle)", color: "var(--asc-text)", textDecoration: "none", padding: "0 8px", fontSize: 12, fontWeight: 950, whiteSpace: "nowrap" };
const muted: CSSProperties = { color: "var(--asc-text-muted)" };
const emptyCell: CSSProperties = { padding: 18, textAlign: "center", color: "var(--asc-text-muted)", fontWeight: 900 };
