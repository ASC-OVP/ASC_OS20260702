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
  period?: string;
  dateFrom?: string;
  dateTo?: string;
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
  period: "today" | "all";
  dateFrom: string;
  dateTo: string;
};

type TaskPreviewItem = {
  id: string;
  title: string;
  done: boolean;
  taskId: string;
};

type AssigneeRow = {
  assigneeId: string;
  name: string;
  roleLabel: string;
  classTags: string[];
  previewItems: TaskPreviewItem[];
  taskIds: string[];
  totalCount: number;
  doneCount: number;
  openCount: number;
  overdueCount: number;
  todayDueCount: number;
  hasRecurring: boolean;
  progress: number;
  relevanceScore: number;
  tasks: AssigneeTaskModalRow["tasks"];
};

type SummaryTone = "blue" | "purple" | "green" | "orange" | "slate";

type SummaryItem = {
  label: string;
  value: string;
  helper: string;
  tone: SummaryTone;
  icon: "clipboard" | "users" | "check" | "clock" | "progress";
  isWarning?: boolean;
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
  const controls = controlsFromParams(params, todayKey);

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

  const listTasks = tasks.filter((task) => shouldShowTaskInWorkList(task, controls.dateTo));
  const filteredTasks = filterTasks(listTasks, controls);
  const assistantStaff = staff.filter((member) => member.role === "ASSISTANT");
  const baseControls = defaultControls(todayKey);
  const rows = sortRows(buildAssigneeRows(filteredTasks, user.id, isAssistant, controls), controls.sort);
  const allRows = ensureAssistantRows(buildAssigneeRows(listTasks, user.id, isAssistant, baseControls), assistantStaff, isAssistant ? user.id : undefined);
  const todayTasks = listTasks.filter((task) => isTodayWorkTask(task, todayKey));
  const todayRows = ensureAssistantRows(buildAssigneeRows(todayTasks, user.id, isAssistant, baseControls), assistantStaff, isAssistant ? user.id : undefined);
  const completedTodayTasks = todayTasks.filter(isTaskCompleteForBoard);
  const remainingTodayTasks = todayTasks.filter((task) => !isTaskCompleteForBoard(task));
  const todayAssigneeCount = countAssignees(todayTasks, isAssistant ? user.id : undefined);
  const todayChecklist = todayRows.reduce((sum, row) => sum + row.totalCount, 0);
  const todayDoneChecklist = todayRows.reduce((sum, row) => sum + row.doneCount, 0);
  const averageProgress = todayChecklist ? Math.round((todayDoneChecklist / todayChecklist) * 100) : 0;
  const actionAssignees = staff.filter((member) => ["ASSISTANT", "TEACHER", "MANAGER"].includes(member.role));
  const defaultSelectedAssigneeIds = actionAssignees.slice(0, 3).map((member) => member.id);
  const topCompletedRows = [...allRows].filter((row) => row.doneCount > 0).sort((a, b) => b.doneCount - a.doneCount || b.progress - a.progress).slice(0, 3);
  const summaryItems: SummaryItem[] = [
    { label: "오늘 총 업무", value: `${todayTasks.length}건`, helper: "오늘 마감/배정", tone: "blue", icon: "clipboard" },
    { label: "오늘 완료된 업무", value: `${completedTodayTasks.length}건`, helper: "완료 처리", tone: "green", icon: "check" },
    { label: "남은 업무", value: `${remainingTodayTasks.length}건`, helper: "오늘 남은 업무", tone: "orange", icon: "clock", isWarning: remainingTodayTasks.length > 0 },
    { label: "오늘 담당자 수", value: `${todayAssigneeCount}명`, helper: "오늘 업무 담당", tone: "purple", icon: "users" },
    { label: "평균 진행률", value: `${averageProgress}%`, helper: "오늘 체크 기준", tone: "slate", icon: "progress" },
  ];

  return (
    <main style={page}>
      <section style={container}>
        <PageHeader
          eyebrow="운영 관리 / 업무"
          title={isAssistant ? "내 업무 체크리스트" : "업무 관리"}
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

        <section style={workspaceGrid}>
          <div style={boardColumn}>
            <SummaryStats items={summaryItems} />

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
            <Panel title="완료 많은 담당자" right={<Link href="/tasks?status=done" style={smallLink}>더보기</Link>}>
              <RankedAssigneeList rows={topCompletedRows} />
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

function controlsFromParams(params: TaskSearchParams, todayKey: string): Controls {
  return {
    status: params.status === "open" || params.status === "done" ? params.status : "all",
    scope: params.scope === "recurring" || params.scope === "general" ? params.scope : "all",
    sort: params.sort === "open" || params.sort === "due" || params.sort === "name" || params.sort === "recent" ? params.sort : "progress",
    assigneeIds: [],
    classGroupId: params.classGroup ?? "",
    q: params.q?.trim() ?? "",
    period: params.period === "all" ? "all" : "today",
    dateFrom: todayKey,
    dateTo: todayKey,
  };
}

function shouldShowTaskInWorkList(task: TaskRow, cutoffKey: string) {
  if (!task.recurringTaskId || !task.scheduledDate) return true;
  return task.scheduledDate <= cutoffKey;
}

function defaultControls(todayKey = toYmd(new Date())): Controls {
  return {
    status: "all",
    scope: "all",
    sort: "progress",
    assigneeIds: [],
    classGroupId: "",
    q: "",
    period: "today",
    dateFrom: todayKey,
    dateTo: todayKey,
  };
}

function taskInPeriod(task: TaskRow, controls: Controls) {
  if (controls.period === "all") return true;
  const key = task.scheduledDate ?? (task.dueDate ? toYmd(task.dueDate) : toYmd(task.createdAt));
  return key >= controls.dateFrom && key <= controls.dateTo;
}

function filterTasks(tasks: TaskRow[], controls: Controls) {
  return tasks.filter((task) => {
    if (!taskInPeriod(task, controls)) return false;
    if (controls.assigneeIds.length > 0 && !controls.assigneeIds.some((assigneeId) => isTaskAssignedTo(task, assigneeId))) return false;
    if (controls.classGroupId && task.classGroupId !== controls.classGroupId) return false;
    if (controls.status === "open" && !hasOpenChecklistOrTask(task)) return false;
    if (controls.status === "done" && !hasDoneChecklistOrTask(task)) return false;
    if (controls.scope === "recurring" && !task.recurringTaskId) return false;
    if (controls.scope === "general" && task.recurringTaskId) return false;
    if (controls.q && !taskSearchText(task).includes(normalizedQuery(controls.q))) return false;
    return true;
  });
}

function hasOpenChecklistOrTask(task: TaskRow) {
  if (task.checklistItems.length > 0) return task.checklistItems.some((item) => !item.isDone);
  return task.status !== "DONE";
}

function hasDoneChecklistOrTask(task: TaskRow) {
  if (task.checklistItems.length > 0) return task.checklistItems.some((item) => item.isDone);
  return task.status === "DONE";
}

function isTaskAssignedTo(task: TaskRow, userId: string) {
  return task.assigneeId === userId || task.assignees.some((assignment) => assignment.assigneeId === userId);
}

function taskAssigneeIds(task: TaskRow) {
  const ids = task.assignees.length ? task.assignees.map((assignment) => assignment.assigneeId) : [task.assigneeId];
  return Array.from(new Set(ids));
}

function countAssignees(tasks: TaskRow[], onlyUserId?: string) {
  const ids = new Set<string>();
  for (const task of tasks) {
    for (const assigneeId of taskAssigneeIds(task)) {
      if (!onlyUserId || assigneeId === onlyUserId) ids.add(assigneeId);
    }
  }
  return ids.size;
}

function isTodayWorkTask(task: TaskRow, todayKey: string) {
  return task.scheduledDate === todayKey || isToday(task.dueDate);
}

function isTaskCompleteForBoard(task: TaskRow) {
  if (task.checklistItems.length > 0) return task.checklistItems.every((item) => item.isDone);
  return task.status === "DONE";
}

function buildAssigneeRows(tasks: TaskRow[], currentUserId: string, isAssistant: boolean, controls: Controls): AssigneeRow[] {
  const rows = new Map<string, AssigneeRow>();

  for (const task of tasks) {
    const assignees = task.assignees.length ? task.assignees.map((item) => item.assignee) : [task.assignee];
    for (const assignee of assignees) {
      if (isAssistant && assignee.id !== currentUserId) continue;

      const previewItems = visibleChecklistItemsForTask(task, assignee.name, controls);
      const includeTaskWithoutChecklist = task.checklistItems.length === 0 && taskPassesTaskStatus(task, controls);
      if (previewItems.length === 0 && !includeTaskWithoutChecklist) continue;

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
        relevanceScore: 0,
        tasks: [],
      };
      rows.set(assignee.id, row);

      row.taskIds.push(task.id);
      row.tasks.push(taskSummary(task, controls, assignee.name));
      const context = task.classGroup?.name ?? task.student?.name;
      if (context && !row.classTags.includes(context)) row.classTags.push(context);
      if (task.recurringTaskId) row.hasRecurring = true;
      if (effectiveStatus(task) === "OVERDUE") row.overdueCount += 1;
      if (isToday(task.dueDate) && task.status !== "DONE") row.todayDueCount += 1;

      if (task.checklistItems.length > 0) {
        for (const item of previewItems) {
          row.totalCount += 1;
          if (item.done) row.doneCount += 1;
          row.relevanceScore += itemRelevanceScore(task, item, assignee.name, controls);
          row.previewItems.push(item);
        }
      } else {
        row.totalCount += 1;
        if (task.status === "DONE") row.doneCount += 1;
        row.relevanceScore += taskRelevanceScore(task, assignee.name, controls);
      }
    }
  }

  return [...rows.values()].map((row) => ({
    ...row,
    classTags: row.classTags.slice(0, 3),
    previewItems: row.previewItems.sort((a, b) => Number(a.done) - Number(b.done) || a.title.localeCompare(b.title, "ko-KR")),
    openCount: Math.max(row.totalCount - row.doneCount, 0),
    progress: row.totalCount ? Math.round((row.doneCount / row.totalCount) * 100) : 0,
  }));
}

function visibleChecklistItemsForTask(task: TaskRow, assigneeName: string, controls: Controls): TaskPreviewItem[] {
  const query = normalizedQuery(controls.q);
  const taskContextMatches = Boolean(query) && taskContextSearchText(task, assigneeName).includes(query);

  return task.checklistItems
    .filter((item) => itemPassesStatus(item, controls))
    .filter((item) => !query || taskContextMatches || item.title.toLocaleLowerCase("ko-KR").includes(query))
    .map((item) => ({
      id: item.id,
      title: item.title,
      done: item.isDone,
      taskId: task.id,
    }));
}

function itemPassesStatus(item: Pick<TaskChecklistItem, "isDone">, controls: Controls) {
  if (controls.status === "open") return !item.isDone;
  if (controls.status === "done") return item.isDone;
  return true;
}

function taskPassesTaskStatus(task: TaskRow, controls: Controls) {
  if (controls.status === "open") return task.status !== "DONE";
  if (controls.status === "done") return task.status === "DONE";
  return true;
}

function itemRelevanceScore(task: TaskRow, item: TaskPreviewItem, assigneeName: string, controls: Controls) {
  let score = 0;
  const query = normalizedQuery(controls.q);
  if (query) {
    if (item.title.toLocaleLowerCase("ko-KR").includes(query)) score += 4;
    if (taskContextSearchText(task, assigneeName).includes(query)) score += 3;
  }
  if (controls.status === "open" && !item.done) score += 3;
  if (controls.status === "done" && item.done) score += 3;
  if (controls.scope !== "all") score += 1;
  if (controls.classGroupId) score += 1;
  if (controls.sort === "open" && !item.done) score += 2;
  if (controls.sort === "due" && (effectiveStatus(task) === "OVERDUE" || (isToday(task.dueDate) && task.status !== "DONE"))) score += 2;
  return score;
}

function taskRelevanceScore(task: TaskRow, assigneeName: string, controls: Controls) {
  let score = 0;
  const query = normalizedQuery(controls.q);
  if (query && taskContextSearchText(task, assigneeName).includes(query)) score += 4;
  if (controls.status === "open" && task.status !== "DONE") score += 3;
  if (controls.status === "done" && task.status === "DONE") score += 3;
  if (controls.scope !== "all") score += 1;
  if (controls.classGroupId) score += 1;
  if (controls.sort === "open" && task.status !== "DONE") score += 2;
  if (controls.sort === "due" && (effectiveStatus(task) === "OVERDUE" || (isToday(task.dueDate) && task.status !== "DONE"))) score += 2;
  return score;
}

function taskSearchText(task: TaskRow) {
  return [
    taskContextSearchText(task, task.assignee.name),
    ...task.assignees.map((assignment) => assignment.assignee.name),
    ...task.checklistItems.map((item) => item.title),
  ].filter(Boolean).join(" ").toLocaleLowerCase("ko-KR");
}

function taskContextSearchText(task: TaskRow, assigneeName: string) {
  return [
    task.title,
    task.description,
    assigneeName,
    task.classGroup?.name,
    task.student?.name,
    task.recurringTask?.title,
  ].filter(Boolean).join(" ").toLocaleLowerCase("ko-KR");
}

function normalizedQuery(value: string) {
  return value.trim().toLocaleLowerCase("ko-KR");
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
      relevanceScore: 0,
      tasks: [],
    });
  }
  return [...existing.values()];
}

function taskSummary(task: TaskRow, controls: Controls = defaultControls(), assigneeName = task.assignee.name): AssigneeTaskModalRow["tasks"][number] {
  return {
    id: task.id,
    title: task.title,
    status: statusLabel(task.status),
    type: taskTypeLabel(task.type),
    dueLabel: task.dueDate ? `마감 ${formatShortDate(task.dueDate)}` : "마감 없음",
    contextLabel: task.classGroup?.name ?? task.student?.name ?? "",
    checklistItems: visibleChecklistItemsForTask(task, assigneeName, controls).map((item) => ({
      id: item.id,
      title: item.title,
      done: item.done,
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
  return rows.filter((row) => isRowRelevantForSort(row, sort)).sort((a, b) => {
    const relevanceRank = b.relevanceScore - a.relevanceScore;
    if (relevanceRank !== 0) return relevanceRank;
    if (sort === "open") return b.openCount - a.openCount || a.progress - b.progress;
    if (sort === "due") return b.todayDueCount - a.todayDueCount || b.overdueCount - a.overdueCount;
    if (sort === "name") return a.name.localeCompare(b.name, "ko-KR");
    if (sort === "recent") return b.taskIds.length - a.taskIds.length;
    return a.progress - b.progress || b.overdueCount - a.overdueCount || a.name.localeCompare(b.name, "ko-KR");
  });
}

function isRowRelevantForSort(row: AssigneeRow, sort: Controls["sort"]) {
  if (sort === "open") return row.openCount > 0;
  if (sort === "due") return row.todayDueCount > 0 || row.overdueCount > 0;
  return row.totalCount > 0;
}

function TaskBoardControls({
  controls,
  classGroups,
}: {
  controls: Controls;
  classGroups: Array<Pick<ClassGroup, "id" | "name">>;
}) {
  const allPeriodHref = controlsHref(controls, { period: "all" });
  const todayPeriodHref = controlsHref(controls, { period: "today" });

  return (
    <div style={boardControls}>
      <div style={periodControls}>
        <Link href={allPeriodHref} style={controls.period === "all" ? periodToggleActive : periodToggleLink}>전체</Link>
        <Link href={todayPeriodHref} style={controls.period === "today" ? periodToggleActive : periodToggleLink}>오늘</Link>
        <Link href="/tasks" style={smallGhostLink}>전체 초기화</Link>
      </div>
      <form action="/tasks" style={boardSearchRow}>
        {controls.status !== "all" && <input type="hidden" name="status" value={controls.status} />}
        {controls.scope !== "all" && <input type="hidden" name="scope" value={controls.scope} />}
        {controls.sort !== "progress" && <input type="hidden" name="sort" value={controls.sort} />}
        {controls.classGroupId && <input type="hidden" name="classGroup" value={controls.classGroupId} />}
        {controls.period === "all" && <input type="hidden" name="period" value="all" />}
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
                done={item.done}
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
  if (rows.length === 0) return <Empty>완료한 업무가 없습니다.</Empty>;
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
          <b style={doneCountStyle}>{row.doneCount}건</b>
        </div>
      ))}
    </div>
  );
}

function SummaryStats({ items }: { items: SummaryItem[] }) {
  return (
    <section style={summaryStats} aria-label="업무 요약 통계">
      {items.map((item) => (
        <article key={item.label} style={summaryStatCard}>
          <span style={{ ...summaryIcon, ...summaryIconTone[item.tone] }} aria-hidden="true">
            <SummaryIcon icon={item.icon} />
          </span>
          <span style={summaryText}>
            <span style={summaryLabel}>{item.label}</span>
            <b style={{ ...summaryValue, color: item.isWarning ? "var(--asc-warning-text)" : "var(--asc-text)" }}>{item.value}</b>
            <span style={summaryHelper}>{item.helper}</span>
          </span>
        </article>
      ))}
    </section>
  );
}

function SummaryIcon({ icon }: { icon: SummaryItem["icon"] }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (icon === "users") {
    return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
  }
  if (icon === "check") {
    return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="m8.5 12.5 2.3 2.3 4.7-5.1" /></svg>;
  }
  if (icon === "clock") {
    return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
  }
  if (icon === "progress") {
    return <svg {...common}><path d="M21 12a9 9 0 1 1-9-9" /><path d="M12 3v9h9" /></svg>;
  }
  return <svg {...common}><path d="M9 5h6" /><path d="M9 3h6v4H9z" /><path d="M5 5h14v16H5z" /><path d="m9 13 2 2 4-5" /></svg>;
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
  if (next.period === "all") query.set("period", "all");
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

const page: CSSProperties = { padding: "14px 12px 16px", color: "var(--asc-text)", background: "var(--asc-bg-subtle)", minHeight: "100vh" };
const container: CSSProperties = { width: "100%", display: "grid", gap: 10 };
const workspaceGrid: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(300px, 340px)", gap: 10, alignItems: "start" };
const summaryStats: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10, minWidth: 0, alignItems: "start" };
const summaryStatCard: CSSProperties = { display: "grid", gridTemplateColumns: "44px minmax(0, 1fr)", gap: 10, alignItems: "center", height: 92, background: "var(--asc-surface)", border: "1px solid transparent", borderRadius: 8, padding: "13px 14px", boxShadow: "var(--asc-shadow-sm)", overflow: "hidden" };
const summaryIcon: CSSProperties = { display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: "50%" };
const summaryIconTone: Record<SummaryTone, CSSProperties> = {
  blue: { background: "var(--asc-primary-soft)", color: "var(--asc-primary)" },
  purple: { background: "rgba(124, 58, 237, 0.12)", color: "#7c3aed" },
  green: { background: "var(--asc-success-soft)", color: "var(--asc-success)" },
  orange: { background: "var(--asc-warning-soft)", color: "var(--asc-warning-text)" },
  slate: { background: "var(--asc-info-soft)", color: "var(--asc-info)" },
};
const summaryText: CSSProperties = { display: "grid", gap: 3, minWidth: 0 };
const summaryLabel: CSSProperties = { color: "var(--asc-text-subtle)", fontSize: 12, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const summaryValue: CSSProperties = { fontSize: 23, fontWeight: 950, lineHeight: 1.05, letterSpacing: 0, fontVariantNumeric: "tabular-nums" };
const summaryHelper: CSSProperties = { color: "var(--asc-text-muted)", fontSize: 11, fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const boardColumn: CSSProperties = { display: "grid", gap: 10, minWidth: 0 };
const rightPanel: CSSProperties = { display: "grid", gap: 10, position: "sticky", top: 12 };
const panel: CSSProperties = { background: "var(--asc-surface)", border: "1px solid transparent", borderRadius: 8, padding: 12, boxShadow: "var(--asc-shadow-sm)" };
const panelHead: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 };
const panelTitle: CSSProperties = { margin: 0, fontSize: 16, fontWeight: 950 };
const softText: CSSProperties = { color: "var(--asc-text-muted)", fontSize: 12, fontWeight: 850 };
const boardControls: CSSProperties = { display: "grid", gap: 11, marginBottom: 14 };
const periodControls: CSSProperties = { display: "inline-grid", gridTemplateColumns: "auto auto auto", gap: 6, alignItems: "center", justifyContent: "start" };
const boardSearchRow: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(240px, 1fr) auto", gap: 8 };
const boardSearchInput: CSSProperties = { height: 38, border: "1px solid transparent", borderRadius: 6, background: "var(--asc-bg-subtle)", color: "var(--asc-text)", padding: "0 12px", fontWeight: 850 };
const assigneeBoardList: CSSProperties = { display: "grid", gap: 8 };
const assigneeRow: CSSProperties = { display: "grid", gridTemplateColumns: "220px minmax(320px, 1fr) 180px 110px", gap: 12, alignItems: "center", minHeight: 88, borderRadius: 8, background: "var(--asc-bg-subtle)", padding: "12px 12px" };
const assigneePerson: CSSProperties = { display: "grid", gridTemplateColumns: "40px 1fr", gap: 10, alignItems: "center", minWidth: 0 };
const avatar: CSSProperties = { display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: "50%", background: "var(--asc-primary-soft)", color: "var(--asc-primary)", fontWeight: 950 };
const assigneeName: CSSProperties = { display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14 };
const muted: CSSProperties = { color: "var(--asc-text-muted)", fontSize: 12, fontWeight: 850 };
const checklistPreview: CSSProperties = { display: "grid", gap: 7, minWidth: 0, minHeight: 80, maxHeight: 140, overflowY: "auto", alignContent: "start", borderRadius: 8, background: "var(--asc-surface)", padding: 9, boxShadow: "inset 0 0 0 1px var(--asc-border-subtle)" };
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
const smallGhostLink: CSSProperties = { ...smallGhost, display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", whiteSpace: "nowrap" };
const periodToggleLink: CSSProperties = { ...smallGhostLink, minWidth: 58, background: "var(--asc-bg-subtle)" };
const periodToggleActive: CSSProperties = { ...periodToggleLink, background: "var(--asc-primary)", color: "#fff" };
const quickPanelBody: CSSProperties = { display: "grid", gap: 6 };
const panelDesc: CSSProperties = { margin: 0, color: "var(--asc-text-muted)", fontSize: 12, lineHeight: 1.35, fontWeight: 850 };
const sideList: CSSProperties = { display: "grid", gap: 8 };
const rankRow: CSSProperties = { display: "grid", gridTemplateColumns: "26px minmax(0, 1fr) auto", gap: 8, alignItems: "center" };
const rankNumber: CSSProperties = { display: "grid", placeItems: "center", width: 24, height: 24, borderRadius: "50%", background: "var(--asc-primary)", color: "#fff", fontSize: 12, fontWeight: 950 };
const rankBody: CSSProperties = { display: "grid", gap: 4, minWidth: 0, fontSize: 12 };
const doneCountStyle: CSSProperties = { color: "var(--asc-success)", fontSize: 13 };
const empty: CSSProperties = { border: "1px dashed var(--asc-border-subtle)", borderRadius: 8, padding: 14, background: "var(--asc-bg-subtle)", textAlign: "center", color: "var(--asc-text-muted)", fontWeight: 900 };
