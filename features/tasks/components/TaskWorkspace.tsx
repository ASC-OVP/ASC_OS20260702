import { canCreateTask, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ClassGroup, RecurringTask, Student, Task, TaskChecklistItem, TaskComment, TaskSubmission, User } from "@prisma/client";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Badge, ButtonLink, PageHeader } from "@/components/ui";
import { generateDueRecurringTasks } from "@/lib/recurringTasks";
import TaskBatchModal from "./TaskBatchModal";
import TaskBoardDropdownFilters from "./TaskBoardDropdownFilters";
import ChecklistAutoSubmit from "./ChecklistAutoSubmit";
import AssigneeTaskModal, { type AssigneeTaskModalRow } from "./AssigneeTaskModal";
import QuickTaskInput from "./QuickTaskInput";
import LegacyTaskList from "./TaskList";

type TaskSearchParams = {
  status?: string;
  scope?: string;
  sort?: string;
  assignee?: string;
  classGroup?: string;
  q?: string;
  manage?: string;
  newRecurring?: string;
  tab?: string;
};

type Props = {
  searchParams?: Promise<TaskSearchParams>;
};

type TaskRow = Task & {
  assignee: Pick<User, "id" | "name" | "role">;
  creator: Pick<User, "id" | "name" | "role">;
  student: Pick<Student, "id" | "name"> | null;
  classGroup: Pick<ClassGroup, "id" | "name" | "teacherId"> | null;
  recurringTask: Pick<RecurringTask, "id" | "title"> | null;
  assignees: Array<{
    assigneeId: string;
    color: string | null;
    assignee: Pick<User, "id" | "name" | "role">;
  }>;
  checklistItems: TaskChecklistItem[];
  comments: Array<TaskComment & { writer: Pick<User, "name"> }>;
  submissions: Array<TaskSubmission & { submittedBy: Pick<User, "name"> }>;
};

type Controls = {
  status: "all" | "open" | "done";
  scope: "all" | "recurring" | "general";
  sort: "progress" | "open" | "due" | "name" | "recent";
  assigneeIds: string[];
  classGroupId: string;
  q: string;
};

type AssigneeRow = {
  assigneeId: string;
  name: string;
  roleLabel: string;
  classTags: string[];
  previewItems: Array<{ id: string; title: string; done: boolean; taskId: string }>;
  taskIds: string[];
  totalCount: number;
  doneCount: number;
  openCount: number;
  overdueCount: number;
  todayDueCount: number;
  hasRecurring: boolean;
  progress: number;
  tasks: AssigneeTaskModalRow["tasks"];
};

export default async function TaskWorkspace({ searchParams }: Props = {}) {
  const params = (await searchParams) ?? {};
  if (params.manage === "recurring" || params.newRecurring === "1" || params.tab === "recurring") {
    return <LegacyTaskList searchParams={Promise.resolve(params)} />;
  }

  const user = await requireUser();
  const canCreate = canCreateTask(user.role);
  const isAssistant = user.role === "ASSISTANT";
  const todayKey = toYmd(new Date());
  const controls = controlsFromParams(params);

  await generateDueRecurringTasks(user, addDays(new Date(), 45));

  const [tasks, staff, classGroups] = await Promise.all([
    prisma.task.findMany({
      where: taskWhereForRole(user),
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      include: {
        assignee: { select: { id: true, name: true, role: true } },
        creator: { select: { id: true, name: true, role: true } },
        student: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true, teacherId: true } },
        recurringTask: { select: { id: true, title: true } },
        assignees: {
          orderBy: { createdAt: "asc" },
          include: { assignee: { select: { id: true, name: true, role: true } } },
        },
        checklistItems: { orderBy: { order: "asc" } },
        comments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { writer: { select: { name: true } } },
        },
        submissions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { submittedBy: { select: { name: true } } },
        },
      },
    }),
    prisma.user.findMany({ where: { academyId: user.academyId, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, role: true } }),
    prisma.classGroup.findMany({
      where: {
        academyId: user.academyId,
        ...(user.role === "TEACHER" ? { teacherId: user.id } : {}),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, teacherId: true },
    }),
  ]);

  const listTasks = tasks.filter((task) => shouldShowTaskInWorkList(task, todayKey));
  const filteredTasks = filterTasks(listTasks, controls);
  const assistantStaff = staff.filter((member) => member.role === "ASSISTANT");
  const rows = sortRows(ensureAssistantRows(buildAssigneeRows(filteredTasks, user.id, isAssistant), assistantStaff, isAssistant ? user.id : undefined), controls.sort);
  const allRows = ensureAssistantRows(buildAssigneeRows(listTasks, user.id, isAssistant), assistantStaff, isAssistant ? user.id : undefined);
  const doneTasks = listTasks.filter((task) => task.status === "DONE");
  const incompleteTasks = listTasks.filter((task) => task.status !== "DONE");
  const completedToday = doneTasks.filter((task) => isToday(task.completedAt));
  const totalChecklist = allRows.reduce((sum, row) => sum + row.totalCount, 0);
  const doneChecklist = allRows.reduce((sum, row) => sum + row.doneCount, 0);
  const averageProgress = totalChecklist ? Math.round((doneChecklist / totalChecklist) * 100) : 0;
  const actionAssignees = staff.filter((member) => ["ASSISTANT", "TEACHER", "MANAGER"].includes(member.role));
  const defaultSelectedAssigneeIds = actionAssignees.slice(0, 3).map((member) => member.id);
  const topIncompleteRows = [...allRows].sort((a, b) => b.openCount - a.openCount || a.progress - b.progress).slice(0, 3);
  return (
    <main style={page}>
      <section style={container}>
        <PageHeader
          eyebrow="운영 관리 / 업무"
          title={
            <span style={titleWithStats}>
              <span>{isAssistant ? "내 업무 체크리스트" : "업무 관리"}</span>
              <HeaderStats
                items={[
                  { label: "전체 배정", value: `${totalChecklist || listTasks.length}건` },
                  { label: "담당자", value: `${allRows.length}명` },
                  { label: "오늘 완료", value: `${completedToday.length}건` },
                  { label: "미완료", value: `${incompleteTasks.length}건`, tone: incompleteTasks.length ? "warn" : "default" },
                  { label: "평균 진행률", value: `${averageProgress}%` },
                ]}
              />
            </span>
          }
          description={isAssistant ? "배정된 업무를 상세 진입 없이 체크하고 진행 상황을 남깁니다." : "관리자가 입력한 업무를 담당자별 체크리스트로 배정하고 진행률을 확인합니다."}
          actions={
            <div className="asc-action-group">
              <Badge tone="navy">{roleLabel(user.role)}</Badge>
              {canCreate && (
                <TaskBatchModal staff={actionAssignees} classGroups={classGroups} defaultSelectedAssigneeIds={defaultSelectedAssigneeIds} />
              )}
              {canCreate && <ButtonLink href="/tasks?manage=recurring" variant="tertiary" size="sm">정기 업무 추가</ButtonLink>}
            </div>
          }
        />

        <section style={workSplit}>
          <div style={boardColumn}>
            <Panel title="담당자별 업무 보드" right={<span style={softText}>업무 상세 진입 없이 체크리스트 진행률을 바로 확인합니다.</span>}>
              <TaskBoardControls controls={controls} classGroups={classGroups} />
              <div style={assigneeBoardList}>
                {rows.map((row) => (
                  <AssigneeBoardRow key={row.assigneeId} row={row} isAssistant={isAssistant} currentUserId={user.id} />
                ))}
                {rows.length === 0 && <Empty>조건에 맞는 업무가 없습니다.</Empty>}
              </div>
            </Panel>
          </div>

          <aside style={rightPanel}>
            <Panel title="빠른 업무 입력">
              <QuickTaskPanel canCreate={canCreate} staff={actionAssignees} />
            </Panel>
            <Panel title="미완료 많은 담당자" right={<Link href="/tasks?status=open" style={smallLink}>더보기</Link>}>
              <RankedAssigneeList rows={topIncompleteRows} />
            </Panel>
          </aside>
        </section>
      </section>
    </main>
  );
}

function taskWhereForRole(user: { id: string; academyId: string; role: string }) {
  if (user.role === "ASSISTANT") {
    return {
      academyId: user.academyId,
      OR: [
        { assigneeId: user.id },
        { assignees: { some: { assigneeId: user.id } } },
      ],
    };
  }

  if (user.role === "TEACHER") {
    return {
      academyId: user.academyId,
      OR: [
        { creatorId: user.id },
        { assigneeId: user.id },
        { assignees: { some: { assigneeId: user.id } } },
        { classGroup: { teacherId: user.id } },
        { student: { teacherId: user.id } },
      ],
    };
  }

  return { academyId: user.academyId };
}

function controlsFromParams(params: TaskSearchParams): Controls {
  return {
    status: params.status === "open" || params.status === "done" ? params.status : "all",
    scope: params.scope === "recurring" || params.scope === "general" ? params.scope : "all",
    sort: params.sort === "open" || params.sort === "due" || params.sort === "name" || params.sort === "recent" ? params.sort : "progress",
    assigneeIds: [],
    classGroupId: params.classGroup ?? "",
    q: params.q?.trim() ?? "",
  };
}

function shouldShowTaskInWorkList(task: TaskRow, todayKey: string) {
  if (!task.recurringTaskId || !task.scheduledDate) return true;
  return task.scheduledDate <= todayKey;
}

function filterTasks(tasks: TaskRow[], controls: Controls) {
  return tasks.filter((task) => {
    if (controls.assigneeIds.length > 0 && !controls.assigneeIds.some((assigneeId) => isTaskAssignedTo(task, assigneeId))) return false;
    if (controls.classGroupId && task.classGroupId !== controls.classGroupId) return false;
    if (controls.status === "open" && task.status === "DONE") return false;
    if (controls.status === "done" && task.status !== "DONE") return false;
    if (controls.scope === "recurring" && !task.recurringTaskId) return false;
    if (controls.scope === "general" && task.recurringTaskId) return false;
    if (controls.q) {
      const q = controls.q.toLocaleLowerCase("ko-KR");
      const text = [
        task.title,
        task.description,
        task.assignee.name,
        ...task.assignees.map((assignment) => assignment.assignee.name),
        task.classGroup?.name,
        task.student?.name,
        ...task.checklistItems.map((item) => item.title),
      ].filter(Boolean).join(" ").toLocaleLowerCase("ko-KR");
      if (!text.includes(q)) return false;
    }
    return true;
  });
}

function isTaskAssignedTo(task: TaskRow, userId: string) {
  return task.assigneeId === userId || task.assignees.some((assignment) => assignment.assigneeId === userId);
}

function buildAssigneeRows(tasks: TaskRow[], currentUserId: string, isAssistant: boolean): AssigneeRow[] {
  const rows = new Map<string, AssigneeRow>();

  for (const task of tasks) {
    const assignees = task.assignees.length ? task.assignees.map((item) => item.assignee) : [task.assignee];
    for (const assignee of assignees) {
      if (isAssistant && assignee.id !== currentUserId) continue;
      const row = rows.get(assignee.id) ?? {
        assigneeId: assignee.id,
        name: assignee.name,
        roleLabel: roleLabel(assignee.role),
        classTags: [],
        previewItems: [],
        taskIds: [],
        totalCount: 0,
        doneCount: 0,
        openCount: 0,
        overdueCount: 0,
        todayDueCount: 0,
        hasRecurring: false,
        progress: 0,
        tasks: [],
      };
      rows.set(assignee.id, row);

      row.taskIds.push(task.id);
      row.tasks.push(taskSummary(task));
      const context = task.classGroup?.name ?? task.student?.name;
      if (context && !row.classTags.includes(context)) row.classTags.push(context);
      if (task.recurringTaskId) row.hasRecurring = true;
      if (effectiveStatus(task) === "OVERDUE") row.overdueCount += 1;
      if (isToday(task.dueDate) && task.status !== "DONE") row.todayDueCount += 1;

      if (task.checklistItems.length > 0) {
        for (const item of task.checklistItems) {
          row.totalCount += 1;
          if (item.isDone) row.doneCount += 1;
          if (!item.isDone && row.previewItems.length < 3) {
            row.previewItems.push({ id: item.id, title: item.title, done: item.isDone, taskId: task.id });
          }
        }
      } else {
        row.totalCount += 1;
        if (task.status === "DONE") row.doneCount += 1;
      }
    }
  }

  return [...rows.values()].map((row) => ({
    ...row,
    classTags: row.classTags.slice(0, 3),
    openCount: Math.max(row.totalCount - row.doneCount, 0),
    progress: row.totalCount ? Math.round((row.doneCount / row.totalCount) * 100) : 0,
  }));
}

function ensureAssistantRows(rows: AssigneeRow[], assistants: Array<Pick<User, "id" | "name" | "role">>, onlyUserId?: string) {
  const existing = new Map(rows.map((row) => [row.assigneeId, row]));
  for (const assistant of assistants) {
    if (onlyUserId && assistant.id !== onlyUserId) continue;
    if (existing.has(assistant.id)) continue;
    existing.set(assistant.id, {
      assigneeId: assistant.id,
      name: assistant.name,
      roleLabel: roleLabel(assistant.role),
      classTags: [],
      previewItems: [],
      taskIds: [],
      totalCount: 0,
      doneCount: 0,
      openCount: 0,
      overdueCount: 0,
      todayDueCount: 0,
      hasRecurring: false,
      progress: 0,
      tasks: [],
    });
  }
  return [...existing.values()];
}

function taskSummary(task: TaskRow): AssigneeTaskModalRow["tasks"][number] {
  return {
    id: task.id,
    title: task.title,
    status: statusLabel(task.status),
    type: taskTypeLabel(task.type),
    dueLabel: task.dueDate ? `마감 ${formatShortDate(task.dueDate)}` : "마감 없음",
    contextLabel: task.classGroup?.name ?? task.student?.name ?? "",
    checklistItems: task.checklistItems.map((item) => ({
      id: item.id,
      title: item.title,
      done: item.isDone,
    })),
  };
}

function statusLabel(status: string) {
  if (status === "DONE") return "완료";
  if (status === "IN_PROGRESS") return "진행 중";
  if (status === "HOLD") return "보류";
  if (status === "OVERDUE") return "지연";
  if (status === "SUBMITTED" || status === "REVIEW") return "검토";
  if (status === "REJECTED") return "재처리";
  return "대기";
}

function taskTypeLabel(type: string) {
  const labels: Record<string, string> = {
    STUDENT_CARE: "학생 관리",
    ATTENDANCE_CHECK: "출결",
    ASSIGNMENT_CHECK: "과제",
    SCORE_INPUT: "성적",
    WRONG_ANSWER: "오답",
    COUNSELING_PREP: "상담",
    PARENT_CONTACT: "보호자 연락",
    MATERIAL_UPLOAD: "자료",
    CLINIC_ASSIGN: "클리닉",
    OMR_GRADING: "테스트",
    OTHER: "일반 업무",
  };
  return labels[type] ?? type;
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit" }).format(date);
}

function sortRows(rows: AssigneeRow[], sort: Controls["sort"]) {
  return [...rows].sort((a, b) => {
    if (sort === "open") return b.openCount - a.openCount || a.progress - b.progress;
    if (sort === "due") return b.todayDueCount - a.todayDueCount || b.overdueCount - a.overdueCount;
    if (sort === "name") return a.name.localeCompare(b.name, "ko-KR");
    if (sort === "recent") return b.taskIds.length - a.taskIds.length;
    return a.progress - b.progress || b.overdueCount - a.overdueCount || a.name.localeCompare(b.name, "ko-KR");
  });
}

function TaskBoardControls({
  controls,
  classGroups,
}: {
  controls: Controls;
  classGroups: Array<Pick<ClassGroup, "id" | "name">>;
}) {
  const tabs = [
    { key: "all", label: "전체", href: controlsHref(controls, { status: "all", scope: "all" }) },
    { key: "today", label: "오늘", href: controlsHref(controls, { sort: "due", status: "open" }) },
    { key: "open", label: "미완료", href: controlsHref(controls, { status: "open" }) },
    { key: "recurring", label: "정기", href: controlsHref(controls, { scope: "recurring" }) },
    { key: "done", label: "완료", href: controlsHref(controls, { status: "done" }) },
  ];
  const activeTab = controls.scope === "recurring" ? "recurring" : controls.status === "done" ? "done" : controls.status === "open" ? "open" : "all";

  return (
    <div style={boardControls}>
      <div style={boardTabs}>
        {tabs.map((tab) => (
          <Link key={tab.key} href={tab.href} style={tab.key === activeTab ? boardTabActive : boardTab}>{tab.label}</Link>
        ))}
      </div>
      <form action="/tasks" style={boardSearchRow}>
        {controls.status !== "all" && <input type="hidden" name="status" value={controls.status} />}
        {controls.scope !== "all" && <input type="hidden" name="scope" value={controls.scope} />}
        {controls.sort !== "progress" && <input type="hidden" name="sort" value={controls.sort} />}
        {controls.classGroupId && <input type="hidden" name="classGroup" value={controls.classGroupId} />}
        <input name="q" defaultValue={controls.q} placeholder="담당자명, 반, 업무 내용 검색" style={boardSearchInput} />
        <button style={smallGhost}>검색</button>
      </form>
      <TaskBoardDropdownFilters controls={controls} classGroups={classGroups} />
    </div>
  );
}

function AssigneeBoardRow({ row, isAssistant, currentUserId }: { row: AssigneeRow; isAssistant: boolean; currentUserId: string }) {
  const status = row.overdueCount > 0 ? `지연 ${row.overdueCount}건` : row.todayDueCount > 0 ? "오늘 마감" : row.hasRecurring ? "정기 포함" : row.openCount === 0 ? "완료" : "진행 중";

  return (
    <article style={assigneeRow}>
      <div style={assigneePerson}>
        <span style={avatar}>{row.name.slice(0, 1)}</span>
        <div>
          <b style={assigneeName}>{row.name} {row.roleLabel}</b>
          <div style={muted}>{row.roleLabel}</div>
        </div>
      </div>
      <div style={checklistPreview}>
        {row.previewItems.length > 0
          ? row.previewItems.map((item) => (
              <ChecklistAutoSubmit
                key={item.id}
                itemId={item.id}
                taskId={item.taskId}
                title={item.title}
                disabled={isAssistant && row.assigneeId !== currentUserId}
              />
            ))
          : <span style={emptyInline}>배정된 체크리스트가 없습니다.</span>}
      </div>
      <div style={progressCell}>
        <span style={status === "완료" ? successBadge : row.overdueCount ? dangerBadge : row.todayDueCount ? warnBadge : infoBadge}>{status}</span>
        <b>{row.doneCount} / {row.totalCount} 완료</b>
        <ProgressBar value={row.progress} />
      </div>
      <div style={rowActions}>
        <AssigneeTaskModal row={row} />
        <span style={moreButton}>⋮</span>
      </div>
    </article>
  );
}

function QuickTaskPanel({
  canCreate,
  staff,
}: {
  canCreate: boolean;
  staff: Array<Pick<User, "id" | "name" | "role">>;
}) {
  if (!canCreate) return <p style={panelDesc}>업무 생성 권한이 있는 계정에서 빠른 입력을 사용할 수 있습니다.</p>;
  return (
    <div style={quickPanelBody}>
      <p style={panelDesc}>담당자 이름과 업무를 `이름 - 업무내용` 형식으로 입력하면 바로 해당 담당자에게 추가됩니다.</p>
      <QuickTaskInput staff={staff} />
    </div>
  );
}

function RankedAssigneeList({ rows }: { rows: AssigneeRow[] }) {
  if (rows.length === 0) return <Empty>미완료 업무가 없습니다.</Empty>;
  return (
    <div style={sideList}>
      {rows.map((row, index) => (
        <div key={row.assigneeId} style={rankRow}>
          <span style={rankNumber}>{index + 1}</span>
          <div style={rankBody}>
            <b>{row.name} {row.roleLabel}</b>
            <span>{row.doneCount} / {row.totalCount}</span>
            <ProgressBar value={row.progress} />
          </div>
          <b style={dangerCount}>{row.openCount}건</b>
        </div>
      ))}
    </div>
  );
}

function HeaderStats({ items }: { items: Array<{ label: string; value: string; tone?: "default" | "warn" }> }) {
  return (
    <span style={headerStats}>
      {items.map((item) => (
        <span key={item.label} style={headerStat}>
          <span style={headerStatLabel}>{item.label}</span>
          <b style={{ ...headerStatValue, color: item.tone === "warn" ? "var(--asc-warning-text)" : "var(--asc-text)" }}>{item.value}</b>
        </span>
      ))}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <span style={progressTrack}>
      <span style={{ ...progressFill, width: `${Math.max(0, Math.min(value, 100))}%` }} />
    </span>
  );
}

function Panel({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section style={panel}>
      <div style={panelHead}>
        <h2 style={panelTitle}>{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div style={empty}>{children}</div>;
}

function controlsHref(controls: Controls, patch: Partial<Controls>) {
  const next = { ...controls, ...patch };
  const query = new URLSearchParams();
  if (next.status !== "all") query.set("status", next.status);
  if (next.scope !== "all") query.set("scope", next.scope);
  if (next.sort !== "progress") query.set("sort", next.sort);
  if (next.assigneeIds.length > 0) query.set("assignee", next.assigneeIds.join(","));
  if (next.classGroupId) query.set("classGroup", next.classGroupId);
  if (next.q) query.set("q", next.q);
  const suffix = query.toString();
  return suffix ? `/tasks?${suffix}` : "/tasks";
}

function effectiveStatus(task: Pick<Task, "status" | "dueDate">) {
  if (task.status !== "DONE" && task.dueDate && task.dueDate.getTime() < Date.now()) return "OVERDUE";
  return task.status;
}

function roleLabel(role: string) {
  if (role === "ADMIN") return "관리자";
  if (role === "MANAGER") return "실장";
  if (role === "TEACHER") return "강사";
  if (role === "ASSISTANT") return "조교";
  return role;
}

function isToday(date: Date | null) {
  if (!date) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toYmd(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const page: CSSProperties = { padding: 12, color: "var(--asc-text)", background: "var(--asc-bg-subtle)", minHeight: "100vh" };
const container: CSSProperties = { width: "100%", display: "grid", gap: 12 };
const titleWithStats: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 14, flexWrap: "wrap", minWidth: 0 };
const headerStats: CSSProperties = { display: "inline-flex", alignItems: "center", flexWrap: "wrap", gap: 4, paddingLeft: 12, borderLeft: "1px solid var(--asc-border-subtle)" };
const headerStat: CSSProperties = { display: "inline-flex", alignItems: "baseline", gap: 4, padding: "4px 8px", borderRadius: 6, background: "var(--asc-bg-subtle)", lineHeight: 1.1 };
const headerStatLabel: CSSProperties = { color: "var(--asc-text-muted)", fontSize: 12, fontWeight: 850, whiteSpace: "nowrap" };
const headerStatValue: CSSProperties = { fontSize: 14, fontWeight: 950, whiteSpace: "nowrap" };
const workSplit: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(310px, 360px)", gap: 12, alignItems: "start" };
const boardColumn: CSSProperties = { display: "grid", gap: 10, minWidth: 0 };
const rightPanel: CSSProperties = { display: "grid", gap: 10, position: "sticky", top: 12 };
const panel: CSSProperties = { background: "var(--asc-surface)", border: "1px solid transparent", borderRadius: 8, padding: 12, boxShadow: "var(--asc-shadow-sm)" };
const panelHead: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 };
const panelTitle: CSSProperties = { margin: 0, fontSize: 16, fontWeight: 950 };
const softText: CSSProperties = { color: "var(--asc-text-muted)", fontSize: 12, fontWeight: 850 };
const boardControls: CSSProperties = { display: "grid", gap: 10, marginBottom: 12 };
const boardTabs: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 4 };
const boardTab: CSSProperties = { display: "inline-flex", alignItems: "center", height: 32, borderRadius: 6, padding: "0 13px", background: "var(--asc-bg-subtle)", color: "var(--asc-text-subtle)", textDecoration: "none", fontSize: 13, fontWeight: 950 };
const boardTabActive: CSSProperties = { ...boardTab, background: "var(--asc-primary)", color: "#fff" };
const boardSearchRow: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(240px, 1fr) auto", gap: 8 };
const boardSearchInput: CSSProperties = { height: 38, border: "1px solid transparent", borderRadius: 6, background: "var(--asc-bg-subtle)", color: "var(--asc-text)", padding: "0 12px", fontWeight: 850 };
const assigneeBoardList: CSSProperties = { display: "grid", gap: 6 };
const assigneeRow: CSSProperties = { display: "grid", gridTemplateColumns: "220px minmax(320px, 1fr) 180px 110px", gap: 12, alignItems: "center", minHeight: 82, borderRadius: 8, background: "var(--asc-bg-subtle)", padding: "10px 12px" };
const assigneePerson: CSSProperties = { display: "grid", gridTemplateColumns: "40px 1fr", gap: 10, alignItems: "center", minWidth: 0 };
const avatar: CSSProperties = { display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: "50%", background: "var(--asc-primary-soft)", color: "var(--asc-primary)", fontWeight: 950 };
const assigneeName: CSSProperties = { display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14 };
const muted: CSSProperties = { color: "var(--asc-text-muted)", fontSize: 12, fontWeight: 850 };
const checklistPreview: CSSProperties = { display: "grid", gap: 5, minWidth: 0 };
const emptyInline: CSSProperties = { color: "var(--asc-text-muted)", fontSize: 12, fontWeight: 850 };
const progressCell: CSSProperties = { display: "grid", gap: 5, fontSize: 12 };
const rowActions: CSSProperties = { display: "inline-flex", justifyContent: "flex-end", alignItems: "center", gap: 6 };
const moreButton: CSSProperties = { color: "var(--asc-text-muted)", fontSize: 20, fontWeight: 900 };
const progressTrack: CSSProperties = { display: "block", height: 6, borderRadius: 99, background: "var(--asc-row-divider)", overflow: "hidden" };
const progressFill: CSSProperties = { display: "block", height: "100%", borderRadius: 99, background: "var(--asc-primary)" };
const badge: CSSProperties = { display: "inline-flex", alignItems: "center", height: 22, borderRadius: 6, background: "var(--asc-surface)", color: "var(--asc-text-subtle)", padding: "0 7px", fontSize: 11, fontWeight: 950, whiteSpace: "nowrap" };
const infoBadge: CSSProperties = { ...badge, background: "var(--asc-info-soft)", color: "var(--asc-info)" };
const warnBadge: CSSProperties = { ...badge, background: "var(--asc-warning-soft)", color: "var(--asc-warning-text)" };
const dangerBadge: CSSProperties = { ...badge, background: "var(--asc-danger-soft)", color: "var(--asc-danger)" };
const successBadge: CSSProperties = { ...badge, background: "var(--asc-success-soft)", color: "var(--asc-success)" };
const smallLink: CSSProperties = { color: "var(--asc-primary-hover)", textDecoration: "none", fontWeight: 950, fontSize: 12 };
const smallGhost: CSSProperties = { height: 38, border: "1px solid transparent", borderRadius: 6, background: "var(--asc-surface)", color: "var(--asc-text)", padding: "0 12px", fontWeight: 900 };
const quickPanelBody: CSSProperties = { display: "grid", gap: 8 };
const panelDesc: CSSProperties = { margin: 0, color: "var(--asc-text-muted)", fontSize: 12, lineHeight: 1.5, fontWeight: 850 };
const sideList: CSSProperties = { display: "grid", gap: 8 };
const rankRow: CSSProperties = { display: "grid", gridTemplateColumns: "26px minmax(0, 1fr) auto", gap: 8, alignItems: "center" };
const rankNumber: CSSProperties = { display: "grid", placeItems: "center", width: 24, height: 24, borderRadius: "50%", background: "var(--asc-primary)", color: "#fff", fontSize: 12, fontWeight: 950 };
const rankBody: CSSProperties = { display: "grid", gap: 4, minWidth: 0, fontSize: 12 };
const dangerCount: CSSProperties = { color: "var(--asc-danger)", fontSize: 13 };
const empty: CSSProperties = { border: "1px dashed var(--asc-border-subtle)", borderRadius: 8, padding: 14, background: "var(--asc-bg-subtle)", textAlign: "center", color: "var(--asc-text-muted)", fontWeight: 900 };
