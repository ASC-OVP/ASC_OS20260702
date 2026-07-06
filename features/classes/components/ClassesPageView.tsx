import Link from "next/link";
import type { CSSProperties } from "react";
import { ButtonLink } from "@/components/ui";
import ClassCreateModal from "@/features/classes/components/ClassCreateModal";
import ClassOpenRow from "@/features/classes/components/ClassOpenRow";
import { buildClassStats, filterStudentActivityForClassSchedule } from "@/lib/classGroupStats";
import {
  canManageClassGroups,
  classGroupWhereForUser,
  classStatusLabel,
  classStatusTone,
  effectiveClassStatus,
  formatClassSchedule,
} from "@/lib/classGroups";
import { todayKoreaDate } from "@/lib/date";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { surfaceBorder } from "@/lib/styles";
import { ClassGroupStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ view?: string; create?: string; error?: string }>;
};

type StudentInClass = {
  id: string;
  name: string;
  scoreRecords: Array<{ date: string; title: string; score: number | null; maxScore: number | null; createdAt: Date }>;
  attendanceRecords: Array<{ date: string; status: string }>;
  assignmentRecords: Array<{ date: string; status: string }>;
};
type ClassLessonLite = { id: string; position: number; title: string; lessonDate: string | null; startTime: string | null; endTime: string | null };
type ClassGroupView = {
  id: string;
  name: string;
  teacherId: string | null;
  subject: string | null;
  grade: string | null;
  startDate: string | null;
  endDate: string | null;
  daysOfWeek: string | null;
  startTime: string | null;
  endTime: string | null;
  schedule: string | null;
  status: ClassGroupStatus;
  iconText: string | null;
  iconColor: string | null;
  teacher: { id: string; name: string } | null;
  assistant: { id: string; name: string } | null;
  classAssistants: Array<{ assistantId: string; assistant: { id: string; name: string } }>;
  studentClasses: Array<{ status: string; joinedAt: string | null; leftAt: string | null; student: StudentInClass }>;
  lessons: ClassLessonLite[];
};
type ClassRow = {
  classGroup: ClassGroupView;
  effectiveStatus: string;
  stats: ReturnType<typeof buildClassStats>;
  lessonSignal: { label: string; value: string };
};

export default async function ClassesPage({ searchParams }: Props) {
  const user = await requireUser();
  const sp = (await searchParams) ?? {};
  const canManage = canManageClassGroups(user.role);
  const since = daysAgo(120);
  const today = todayKoreaDate();
  const currentTime = koreaTimeString();

  const [staff, classGroups] = await Promise.all([
    prisma.user.findMany({
      where: { academyId: user.academyId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
    prisma.classGroup.findMany({
      where: classGroupWhereForUser(user),
      include: {
        teacher: { select: { id: true, name: true } },
        assistant: { select: { id: true, name: true } },
        classAssistants: {
          orderBy: { createdAt: "asc" },
          include: { assistant: { select: { id: true, name: true } } },
        },
        lessons: {
          orderBy: [{ position: "asc" }],
          select: { id: true, position: true, title: true, lessonDate: true, startTime: true, endTime: true },
        },
        studentClasses: {
          orderBy: { createdAt: "asc" },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                scoreRecords: {
                  where: { date: { gte: since } },
                  orderBy: [{ date: "desc" }, { createdAt: "desc" }],
                  take: 10,
                },
                attendanceRecords: {
                  where: { date: { gte: since } },
                  orderBy: { date: "desc" },
                },
                assignmentRecords: {
                  where: { date: { gte: since } },
                  orderBy: { date: "desc" },
                },
              },
            },
          },
        },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
  ]);

  const teachers = staff.filter((member) => member.role === "ADMIN" || member.role === "MANAGER" || member.role === "TEACHER");
  const assistants = staff.filter((member) => member.role === "ASSISTANT");
  const rows: ClassRow[] = classGroups
    .map((classGroup) => {
      const effectiveStatus = effectiveClassStatus(classGroup);
      const students = classGroup.studentClasses
        .filter((membership) => effectiveStatus === "ENDED" || membership.status === "ACTIVE")
        .map((membership) => filterStudentActivityForClassSchedule(membership.student, classGroup, membership));
      return {
        classGroup,
        effectiveStatus,
        stats: buildClassStats(students),
        lessonSignal: lessonSignal(classGroup, today, currentTime),
      };
    })
    .sort((a, b) => classStatusRank(a.effectiveStatus) - classStatusRank(b.effectiveStatus) || a.classGroup.name.localeCompare(b.classGroup.name, "ko"));

  const operatingRows = rows.filter((row) => row.effectiveStatus !== "ENDED");
  const endedRows = rows.filter((row) => row.effectiveStatus === "ENDED");
  const activeView = sp.view === "ended" ? "ended" : "operating";
  const createOpen = sp.create === "1";
  const baseListHref = activeView === "ended" ? "/classes?view=ended" : "/classes";
  const createHref = activeView === "ended" ? "/classes?view=ended&create=1" : "/classes?create=1";
  const visibleRows = activeView === "ended" ? endedRows : operatingRows;
  const totalStudents = rows.reduce((sum, row) => sum + row.stats.studentCount, 0);
  const activeCount = operatingRows.length;
  const averageScore = average(rows.map((row) => row.stats.averageScore).filter((score): score is number => score !== null));
  const averageAttendance = average(rows.map((row) => row.stats.attendanceRate).filter((rate): rate is number => rate !== null));

  return (
    <main style={page}>
      <section style={container}>
        <div style={header}>
          <div style={headerLayout}>
            <div style={headerText}>
              <h1 style={pageTitle}>반 관리</h1>
              <p style={pageDescription}>담당 강사, 일정, 학생 및 최근 운영 지표</p>
            </div>
            <dl style={compactStats} aria-label="반 운영 요약">
              <SmallStat label="전체" value={`${rows.length}개`} />
              <SmallStat label="운영중" value={`${activeCount}개`} />
              <SmallStat label="학생" value={`${totalStudents}명`} />
              <SmallStat label="평균" value={averageScore === null ? "-" : `${averageScore}점`} />
              <SmallStat label="출석률" value={averageAttendance === null ? "-" : `${averageAttendance}%`} />
            </dl>
            <div className="asc-action-group" style={headerActions}>
              <ButtonLink href="/students" variant="tertiary" size="sm">학생 현황</ButtonLink>
              {canManage && (
                <ClassCreateModal
                  teachers={teachers}
                  assistants={assistants}
                  currentUserId={user.id}
                  currentUserRole={user.role}
                  open={createOpen}
                  openHref={createHref}
                  closeHref={baseListHref}
                  error={sp.error}
                />
              )}
            </div>
          </div>
        </div>

        <ClassTableSection
          activeView={activeView}
          operatingCount={operatingRows.length}
          endedCount={endedRows.length}
          rows={visibleRows}
          canManage={canManage}
          emptyTitle={activeView === "ended" ? "끝난 강의가 없습니다" : "운영중인 강의가 없습니다"}
          emptyBody={activeView === "ended" ? "종료된 강의가 생기면 여기에 표시됩니다." : "반 추가 버튼으로 새 강의를 등록해 주세요."}
        />
      </section>
    </main>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={smallStat}>
      <dt style={smallStatLabel}>{label}</dt>
      <dd style={smallStatValue}>{value}</dd>
    </div>
  );
}

function ClassTableSection({
  activeView,
  operatingCount,
  endedCount,
  rows,
  canManage,
  emptyTitle,
  emptyBody,
}: {
  activeView: "operating" | "ended";
  operatingCount: number;
  endedCount: number;
  rows: ClassRow[];
  canManage: boolean;
  emptyTitle: string;
  emptyBody: string;
}) {
  return (
    <section style={listPanel}>
      <div style={panelHead}>
        <h2 style={panelTitle}>반 목록</h2>
        <nav style={courseTabs} aria-label="강의 상태 보기">
          <Link href="/classes" style={{ ...courseTab, ...(activeView === "operating" ? activeCourseTab : {}) }}>
            운영중인 강의 <span style={tabCount}>{operatingCount}개</span>
          </Link>
          <Link href="/classes?view=ended" style={{ ...courseTab, ...(activeView === "ended" ? activeCourseTab : {}) }}>
            끝난 강의 <span style={tabCount}>{endedCount}개</span>
          </Link>
        </nav>
      </div>
      {rows.length > 0 ? (
        <div style={tableWrap}>
          <table style={classTable}>
            <thead>
              <tr>
                <th style={th}>반</th>
                <th style={th}>상태</th>
                <th style={th}>담당 강사</th>
                <th style={th}>담당 조교</th>
                <th style={{ ...th, textAlign: "right" }}>학생</th>
                <th style={th}>요일/시간</th>
                <th style={th}>최근/다음 차시</th>
                <th style={{ ...th, textAlign: "right" }}>평균</th>
                <th style={{ ...th, textAlign: "right" }}>출석률</th>
                <th style={{ ...th, textAlign: "right" }}>과제율</th>
                <th style={{ ...th, textAlign: "center" }} aria-label="반 관리" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const { classGroup, stats, effectiveStatus, lessonSignal } = row;
                return (
                  <ClassOpenRow
                    key={classGroup.id}
                    href={`/classes/${classGroup.id}`}
                    classGroupId={classGroup.id}
                    name={classGroup.name}
                    meta={`${classGroup.subject || "과목 미정"} / ${classGroup.grade || "학년 미정"}`}
                    iconText={classGroup.iconText}
                    iconColor={classGroup.iconColor}
                    statusLabel={classStatusLabel(effectiveStatus)}
                    statusTone={classStatusTone(effectiveStatus)}
                    teacherName={classGroup.teacher?.name ?? "-"}
                    assistantName={assistantNames(classGroup)}
                    studentCount={stats.studentCount}
                    schedule={formatClassSchedule(classGroup)}
                    latestLabel={lessonSignal.label}
                    latestValue={lessonSignal.value}
                    averageScore={stats.averageScore === null ? "-" : `${stats.averageScore}점`}
                    attendanceRate={stats.attendanceRate === null ? "-" : `${stats.attendanceRate}%`}
                    assignmentRate={stats.assignmentCompletionRate === null ? "-" : `${stats.assignmentCompletionRate}%`}
                    canManage={canManage}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty title={emptyTitle} body={emptyBody} />
      )}
    </section>
  );
}

function Empty({ title, body }: { title: string; body?: string }) {
  return (
    <div style={empty}>
      <b>{title}</b>
      {body && <span>{body}</span>}
    </div>
  );
}

function assistantNames(classGroup: { assistant?: { name: string } | null; classAssistants?: Array<{ assistant: { name: string } }> }) {
  const names = classGroup.classAssistants?.map((link) => link.assistant.name).filter(Boolean) ?? [];
  return names.length > 0 ? names.join(", ") : classGroup.assistant?.name ?? "-";
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function classStatusRank(status: string) {
  if (status === "ACTIVE") return 0;
  if (status === "UPCOMING") return 1;
  if (status === "PAUSED") return 2;
  if (status === "ENDED") return 3;
  return 4;
}

function lessonSignal(classGroup: ClassGroupView, today: string, currentTime: string) {
  const lessons = classGroup.lessons;
  const dated = lessons.filter((lesson) => lesson.lessonDate).sort((a, b) => String(a.lessonDate).localeCompare(String(b.lessonDate)));
  const next = dated.find((lesson) => isFutureLesson(lesson, today, currentTime));
  if (next) return { label: "다음 수업", value: `${next.lessonDate} · ${next.title}` };
  const recent = [...dated].reverse()[0] ?? [...lessons].sort((a, b) => b.position - a.position)[0];
  if (recent) return { label: "최근 차시", value: `${recent.lessonDate ?? `${recent.position}차시`} · ${recent.title}` };
  const scheduled = scheduledLessonSignal(classGroup, today, currentTime);
  if (scheduled) return scheduled;
  return { label: "차시", value: "일정 정보 없음" };
}

function scheduledLessonSignal(classGroup: ClassGroupView, today: string, currentTime: string) {
  const start = parseYmd(classGroup.startDate);
  const end = parseYmd(classGroup.endDate);
  const current = parseYmd(today);
  const daysOfWeek = parseDaysOfWeek(classGroup.daysOfWeek);

  if (!current) return null;

  if (start && daysOfWeek.length === 0) {
    if (formatYmd(start) >= today) return { label: "다음 수업", value: `${formatYmd(start)} · 1차시 예정` };
    return { label: "차시", value: `${formatYmd(start)} 시작` };
  }

  if (!start || daysOfWeek.length === 0) return null;

  const searchStartBase = current.getTime() < start.getTime() ? start : current;
  const searchStart =
    formatYmd(searchStartBase) === today &&
    daysOfWeek.includes(searchStartBase.getDay()) &&
    hasClassFinishedForToday(classGroup.endTime, currentTime)
      ? addDays(searchStartBase, 1)
      : searchStartBase;
  const searchEnd = end ?? addDays(searchStart, 180);
  const nextDate = findNextScheduledDate(searchStart, searchEnd, daysOfWeek);
  if (!nextDate) return { label: "차시", value: "운영 기간 종료" };

  const position = countScheduledSessions(start, nextDate, daysOfWeek);
  return { label: "다음 수업", value: `${formatYmd(nextDate)} · ${position}차시 예정` };
}

function isFutureLesson(lesson: ClassLessonLite, today: string, currentTime: string) {
  if (!lesson.lessonDate) return false;
  if (lesson.lessonDate > today) return true;
  if (lesson.lessonDate < today) return false;
  return !hasClassFinishedForToday(lesson.endTime, currentTime);
}

function hasClassFinishedForToday(endTime: string | null | undefined, currentTime: string) {
  if (!endTime) return false;
  return normalizeTime(endTime) <= currentTime;
}

function normalizeTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!match) return value;
  const [, hour, minute] = match;
  return `${hour.padStart(2, "0")}:${minute}`;
}

function parseDaysOfWeek(value: string | null | undefined) {
  if (!value) return [];
  const normalized = value.toLowerCase();
  const days = new Set<number>();
  const tokens: Array<[RegExp, number]> = [
    [/(일|sun|sunday|\b0\b)/g, 0],
    [/(월|mon|monday|\b1\b)/g, 1],
    [/(화|tue|tuesday|\b2\b)/g, 2],
    [/(수|wed|wednesday|\b3\b)/g, 3],
    [/(목|thu|thursday|\b4\b)/g, 4],
    [/(금|fri|friday|\b5\b)/g, 5],
    [/(토|sat|saturday|\b6\b)/g, 6],
  ];

  for (const [pattern, day] of tokens) {
    if (pattern.test(normalized)) days.add(day);
  }

  return [...days].sort();
}

function findNextScheduledDate(start: Date, end: Date, daysOfWeek: number[]) {
  for (let cursor = stripTime(start); cursor.getTime() <= end.getTime(); cursor = addDays(cursor, 1)) {
    if (daysOfWeek.includes(cursor.getDay())) return cursor;
  }
  return null;
}

function countScheduledSessions(start: Date, end: Date, daysOfWeek: number[]) {
  let count = 0;
  for (let cursor = stripTime(start); cursor.getTime() <= end.getTime(); cursor = addDays(cursor, 1)) {
    if (daysOfWeek.includes(cursor.getDay())) count += 1;
  }
  return Math.max(1, count);
}

function parseYmd(value: string | null | undefined) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function formatYmd(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function stripTime(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function koreaTimeString() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

const page: CSSProperties = { padding: 12, color: "var(--asc-text)", background: "var(--asc-bg-subtle)", minHeight: "100vh" };
const container: CSSProperties = { display: "flex", flexDirection: "column", gap: 12 };
const header: CSSProperties = { minHeight: 72, padding: "14px 10px 10px", border: 0, borderRadius: 0, background: "transparent", boxShadow: "none" };
const headerLayout: CSSProperties = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" };
const headerText: CSSProperties = { minWidth: 180, flex: "0 0 auto" };
const pageTitle: CSSProperties = { margin: 0, color: "var(--asc-text)", fontSize: 20, lineHeight: 1.16, fontWeight: 950, letterSpacing: 0 };
const pageDescription: CSSProperties = { margin: "4px 0 0", color: "var(--asc-text-muted)", fontSize: 12, lineHeight: 1.35, fontWeight: 750 };
const compactStats: CSSProperties = { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0, margin: 0, padding: 0, minWidth: 0, flex: "1 1 520px" };
const headerActions: CSSProperties = { justifyContent: "flex-end", alignSelf: "flex-start", flex: "0 0 auto" };
const smallStat: CSSProperties = { display: "grid", gap: 1, padding: "0 12px", borderLeft: "1px solid var(--asc-border-subtle)", color: "var(--asc-text-muted)", fontSize: 11, fontWeight: 800, lineHeight: 1.1, whiteSpace: "nowrap" };
const smallStatLabel: CSSProperties = { margin: 0, color: "var(--asc-text-muted)", fontSize: 11, fontWeight: 800 };
const smallStatValue: CSSProperties = { margin: 0, color: "var(--asc-text)", fontSize: 13, fontWeight: 950 };
const listPanel: CSSProperties = { background: "var(--asc-surface)", border: surfaceBorder, borderRadius: "var(--asc-radius-lg)", padding: 10, boxShadow: "var(--asc-shadow-sm)" };
const panelHead: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10, flexWrap: "wrap" };
const panelTitle: CSSProperties = { margin: 0, color: "var(--asc-text)", fontSize: 15, fontWeight: 950 };
const courseTabs: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 14, borderBottom: "1px solid var(--asc-border-subtle)", minHeight: 34 };
const courseTab: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, minHeight: 34, borderBottomWidth: 2, borderBottomStyle: "solid", borderBottomColor: "transparent", color: "var(--asc-text-muted)", textDecoration: "none", fontSize: 13, fontWeight: 900 };
const activeCourseTab: CSSProperties = { color: "var(--asc-text)", borderBottomColor: "var(--asc-primary)" };
const tabCount: CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 30, height: 22, border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-bg-subtle)", color: "var(--asc-text)", padding: "0 7px", fontSize: 12, fontWeight: 950 };
const tableWrap: CSSProperties = { overflowX: "auto", border: surfaceBorder, borderRadius: "var(--asc-radius-md)", background: "var(--asc-surface)", boxShadow: "var(--asc-shadow-sm)" };
const classTable: CSSProperties = { width: "100%", minWidth: 1200, borderCollapse: "collapse", tableLayout: "auto" };
const th: CSSProperties = { background: "var(--asc-bg-subtle)", borderBottom: "1px solid var(--asc-row-divider)", padding: "9px 12px", color: "var(--asc-text-muted)", textAlign: "left", whiteSpace: "nowrap", fontSize: 12, fontWeight: 950 };
const empty: CSSProperties = { border: "1px dashed var(--asc-border)", borderRadius: "var(--asc-radius-lg)", padding: 18, display: "grid", gap: 4, textAlign: "center", color: "var(--asc-text-muted)", fontWeight: 800, background: "var(--asc-bg-subtle)" };
