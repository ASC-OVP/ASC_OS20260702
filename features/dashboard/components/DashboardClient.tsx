"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Badge, ButtonLink, EmptyState, Select } from "@/components/ui";
import { DASHBOARD_SEVERITY_ORDER, DASHBOARD_SIGNAL_LABELS } from "@/features/dashboard/constants";
import type {
  DashboardFilterState,
  DashboardSignalSeverity,
  DashboardSignalType,
  DashboardSummaryCard,
  DashboardViewData,
  ManagementStudentItem,
  OperationsInboxItem,
  TodayClassOperation,
} from "@/features/dashboard/types";
import { surfaceBorder } from "@/lib/styles";

const defaultFilters: DashboardFilterState = {
  query: "",
  dateScope: "today",
  classGroupId: "all",
  ownerId: "all",
  signalType: "all",
  severity: "all",
};

const inboxTabs: Array<{ value: "all" | "critical" | "warning" | "dueToday" | "mine"; label: string }> = [
  { value: "all", label: "전체" },
  { value: "critical", label: "긴급" },
  { value: "warning", label: "주의" },
  { value: "dueToday", label: "오늘 마감" },
  { value: "mine", label: "내 담당" },
];

export default function DashboardClient({ data }: { data: DashboardViewData }) {
  const [filters, setFilters] = useState<DashboardFilterState>(defaultFilters);
  const [tab, setTab] = useState<(typeof inboxTabs)[number]["value"]>("all");
  const [selectedId, setSelectedId] = useState<string | null>(data.inboxItems[0]?.id ?? null);

  const visibleInboxItems = useMemo(() => data.inboxItems.filter((item) => isTodayInboxItem(item, data.today)), [data.inboxItems, data.today]);
  const filteredItems = useMemo(() => filterInboxItems(visibleInboxItems, filters, tab, data.today), [data.today, filters, tab, visibleInboxItems]);
  const selectedItem = filteredItems.find((item) => item.id === selectedId) ?? filteredItems[0] ?? null;
  const activeFilterCount = countActiveFilters(filters);
  const criticalCount = visibleInboxItems.filter((item) => item.severity === "critical").length;
  const dueTodayCount = visibleInboxItems.length;
  const mineCount = visibleInboxItems.filter((item) => item.isMine).length;

  return (
    <section style={pageStack}>
      <DashboardScopeBar
        data={data}
        filteredCount={filteredItems.length}
        totalCount={visibleInboxItems.length}
        criticalCount={criticalCount}
        dueTodayCount={dueTodayCount}
        mineCount={mineCount}
      />

      <DashboardSummaryCards cards={data.summaryCards} />

      <section id="dashboard-inbox" style={mainGrid} aria-label="오늘의 운영 큐와 선택 항목 상세">
        <OperationsInboxPanel
          items={filteredItems}
          totalCount={visibleInboxItems.length}
          tab={tab}
          setTab={setTab}
          filters={filters}
          setFilters={setFilters}
          data={data}
          selectedId={selectedItem?.id ?? null}
          onSelect={setSelectedId}
          activeFilterCount={activeFilterCount}
        />
        <DashboardDetailPanel item={selectedItem} />
      </section>

      <section style={secondaryGrid} aria-label="보조 운영 위젯">
        <TodayClassesWidget classes={data.todayClasses} />
        <ManagementNeededStudentsPanel students={data.managementStudents} />
      </section>
    </section>
  );
}

function DashboardScopeBar({
  data,
  filteredCount,
  totalCount,
  criticalCount,
  dueTodayCount,
  mineCount,
}: {
  data: DashboardViewData;
  filteredCount: number;
  totalCount: number;
  criticalCount: number;
  dueTodayCount: number;
  mineCount: number;
}) {
  const scopeItems = [
    { label: "역할", value: data.userRoleLabel },
    { label: "범위", value: data.scopeLabel },
    { label: "긴급", value: `${criticalCount}건` },
    { label: "오늘", value: `${dueTodayCount}건` },
    { label: "내 담당", value: `${mineCount}건` },
    { label: "표시", value: `${filteredCount}/${totalCount}` },
  ];

  return (
    <section style={scopeBar} aria-label="대시보드 운영 범위">
      <div style={scopeGroup}>
        {scopeItems.map((item) => (
          <span key={item.label} style={scopeItem}>
            <span style={scopeLabel}>{item.label}</span>
            <strong style={scopeValue}>{item.value}</strong>
          </span>
        ))}
      </div>
      <span style={scopeUpdated}>업데이트 {data.generatedAtLabel}</span>
    </section>
  );
}

function DashboardSummaryCards({ cards }: { cards: DashboardSummaryCard[] }) {
  return (
    <section style={summaryGrid} aria-label="오늘 처리 현황">
      {cards.map((card) => {
        const content = (
          <>
            <span style={summaryCardTop}>
              <span style={summaryLabel}>{card.label}</span>
              <strong style={summaryValue}>{card.value}</strong>
            </span>
            <span style={summaryDetail}>{card.detail ?? card.note}</span>
            {card.metrics && (
              <span style={summaryMetricList}>
                {card.metrics.map((metric) => (
                  <span key={metric.label} style={summaryMetric}>
                    <span style={summaryMetricLabel}>{metric.label}</span>
                    <strong style={summaryMetricValue}>{metric.value}</strong>
                  </span>
                ))}
              </span>
            )}
            {card.progress && <SummaryProgress progress={card.progress} />}
          </>
        );
        return card.href ? (
          <Link key={card.id} href={card.href} style={summaryCard}>
            {content}
          </Link>
        ) : (
          <div key={card.id} style={summaryCard}>
            {content}
          </div>
        );
      })}
    </section>
  );
}

function SummaryProgress({ progress }: { progress: NonNullable<DashboardSummaryCard["progress"]> }) {
  const percent = boundedPercent(progress.value, progress.total);
  return (
    <span style={summaryProgressRow}>
      <span style={summaryProgressLabel}>{progress.label}</span>
      <span style={summaryTrack}>
        <span style={{ ...summaryFill, width: `${percent}%`, background: progressToneColor(progress.tone) }} />
      </span>
      <span style={summaryProgressValue}>
        {percent}% <span style={summaryProgressCount}>({progress.value}/{progress.total}명)</span>
      </span>
    </span>
  );
}

function boundedPercent(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function progressToneColor(tone: NonNullable<DashboardSummaryCard["progress"]>["tone"]) {
  if (tone === "green") return "var(--asc-success)";
  if (tone === "navy") return "var(--asc-accent)";
  if (tone === "purple") return "#7c3aed";
  return "var(--asc-info)";
}

function OperationsInboxPanel({
  items,
  totalCount,
  tab,
  setTab,
  filters,
  setFilters,
  data,
  selectedId,
  onSelect,
  activeFilterCount,
}: {
  items: OperationsInboxItem[];
  totalCount: number;
  tab: (typeof inboxTabs)[number]["value"];
  setTab: (tab: (typeof inboxTabs)[number]["value"]) => void;
  filters: DashboardFilterState;
  setFilters: (filters: DashboardFilterState) => void;
  data: DashboardViewData;
  selectedId: string | null;
  onSelect: (id: string) => void;
  activeFilterCount: number;
}) {
  return (
    <section style={panel} aria-label="운영 인박스">
      <PanelHeader
        title="오늘의 운영 큐"
        description={`${items.length}/${totalCount}개 표시 · 긴급도와 내 담당 항목을 우선 정렬합니다.`}
        action={<ButtonLink href="/tasks/new" variant="tertiary" size="sm">업무 생성</ButtonLink>}
      />
      <div style={queueToolbar}>
        <div style={tabList} role="tablist" aria-label="운영 큐 탭">
          {inboxTabs.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={tab === item.value}
              style={tab === item.value ? activeTabButton : tabButton}
              onClick={() => setTab(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div style={queueFilters}>
          <Select aria-label="담당자 필터" value={filters.ownerId} style={queueSelect} onChange={(event) => setFilters({ ...filters, ownerId: event.target.value })}>
            <option value="all">담당자 전체</option>
            {data.filterOptions.owners.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
          <Select aria-label="신호 유형 필터" value={filters.signalType} style={queueSelect} onChange={(event) => setFilters({ ...filters, signalType: event.target.value as DashboardSignalType | "all" })}>
            <option value="all">유형 전체</option>
            {data.filterOptions.signalTypes.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
          <Select aria-label="중요도 필터" value={filters.severity} style={queueSelect} onChange={(event) => setFilters({ ...filters, severity: event.target.value as DashboardSignalSeverity | "all" })}>
            <option value="all">심각도순</option>
            {data.filterOptions.severities.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </Select>
        </div>
      </div>
      <div style={inboxList}>
        <div style={queueHead} aria-hidden="true">
          <span>우선순위</span>
          <span>유형</span>
          <span>업무명</span>
          <span>정보</span>
          <span>담당자</span>
          <span>마감/기준</span>
          <span>상태</span>
        </div>
        {items.length === 0 ? (
          <div style={inboxEmpty}>
            <EmptyState
              title={activeFilterCount > 0 ? "조건에 맞는 운영 신호가 없습니다." : "오늘 급한 운영 신호가 없습니다."}
              description={activeFilterCount > 0 ? "필터를 초기화하거나 다른 기준으로 다시 확인하세요." : "오늘 수업과 최근 활동을 확인하거나 필요한 업무를 새로 만들 수 있습니다."}
              actions={<ButtonLink href="/students" variant="secondary" size="sm">학생 현황판</ButtonLink>}
            />
          </div>
        ) : (
          items.map((item) => (
            <InboxListRow key={item.id} item={item} active={item.id === selectedId} onSelect={onSelect} />
          ))
        )}
      </div>
    </section>
  );
}

function InboxListRow({
  item,
  active,
  onSelect,
}: {
  item: OperationsInboxItem;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  function openItem() {
    window.location.href = item.href;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      style={active ? activeQueueRow : queueRow}
      onClick={() => onSelect(item.id)}
      onDoubleClick={openItem}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onSelect(item.id);
      }}
      aria-pressed={active}
      aria-label={`${severityLabel(item.severity)} ${DASHBOARD_SIGNAL_LABELS[item.type]} 업무 선택: ${item.title}`}
      title="더블클릭해서 관련 화면으로 이동"
    >
      <span style={queuePriorityCell}>
        <SeverityBadge severity={item.severity} />
      </span>
      <span style={queueTypeCell}>{DASHBOARD_SIGNAL_LABELS[item.type]}</span>
      <span style={queueTitleCell}>{item.title}</span>
      <span style={queueMutedCell}>{item.targetLabel}</span>
      <span style={queueMutedCell}>{item.ownerLabel}</span>
      <span style={item.timeLabel.includes("마감") ? queueDueCell : queueMutedCell}>{item.timeLabel}</span>
      <span style={queueStatusCell}>{item.statusLabel}</span>
    </div>
  );
}

function DashboardDetailPanel({ item }: { item: OperationsInboxItem | null }) {
  const decision = item ? detailDecision(item) : null;
  const riskItems = item ? detailRiskItems(item) : [];

  return (
    <aside style={detailPanel} aria-label="선택 항목 상세">
      {!item ? (
        <EmptyState
          title="운영 신호를 선택하세요."
          description="선택한 항목의 우선순위, 판단 기준, 바로 실행할 액션을 정리해 보여줍니다."
        />
      ) : (
        <>
          <section style={detailHero}>
            <div style={detailHeroTop}>
              <span style={badgeGroup}>
                <SeverityBadge severity={item.severity} />
                <TypeBadge type={item.type} />
              </span>
              <span style={detailHeroMeta}>
                <span>담당 {item.ownerLabel}</span>
                <span>기준일 {item.timeLabel}</span>
              </span>
            </div>
            <h2 style={detailTitle}>{item.title}</h2>
            <p style={detailTarget}>{item.targetLabel}</p>
            {decision && (
              <p style={decisionCopy}>
                <strong>{decision.title}</strong>
                <span>{decision.description}</span>
              </p>
            )}
          </section>

          <div style={detailSection}>
            <ul style={riskList}>
              {riskItems.map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ul>
          </div>

          {item.recentRecords.length > 0 && (
            <div style={detailSection}>
              <div style={detailSectionHeader}>
                <strong style={detailSectionTitle}>연결 기록</strong>
              </div>
              <div style={detailRecordList}>
                {item.recentRecords.map((record) => {
                  const content = (
                    <>
                      <span style={detailRecordLabel}>{record.label}</span>
                      <strong style={detailRecordValue}>{record.value}</strong>
                    </>
                  );
                  return record.href ? (
                    <Link key={record.id} href={record.href} style={detailRecordItem}>
                      {content}
                    </Link>
                  ) : (
                    <div key={record.id} style={detailRecordItem}>
                      {content}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={detailSection}>
            <div style={detailSectionHeader}>
              <strong style={detailSectionTitle}>처리 액션</strong>
              <Link href={item.href} style={smallLink}>원본 보기</Link>
            </div>
            <RecommendedActions item={item} />
          </div>
        </>
      )}
    </aside>
  );
}

function RecommendedActions({ item }: { item: OperationsInboxItem }) {
  const primaryAction = item.actions.find((action) => action.tone === "primary") ?? item.actions[0];
  const secondaryActions = item.actions.filter((action) => action !== primaryAction).slice(0, 3);

  return (
    <div style={recommendedActionBox}>
      {primaryAction && (
        <Link href={primaryAction.href} style={recommendedPrimaryAction}>
          {primaryAction.label}
        </Link>
      )}
      <div style={recommendedSecondaryGrid}>
        {secondaryActions.map((action) => (
          <Link key={`${item.id}:detail:${action.label}`} href={action.href} style={recommendedSecondaryAction}>
            {action.label}
          </Link>
        ))}
        <Link href={item.href} style={recommendedResolveAction}>처리 화면</Link>
      </div>
    </div>
  );
}

function TodayClassesWidget({ classes }: { classes: TodayClassOperation[] }) {
  return (
    <Widget title="오늘 수업 운영" href="/classes">
      {classes.length === 0 ? (
        <CompactEmpty title="오늘 예정된 수업이 없습니다." desc="반 일정이 등록되면 출석/과제 체크 상태가 표시됩니다." />
      ) : (
        classes.map((classGroup) => (
          <div key={classGroup.id} style={compactItem}>
            <div style={compactMain}>
              <Link href={classGroup.href} style={itemTitleLink}>{classGroup.name}</Link>
              <span style={compactMeta}>{classGroup.scheduleLabel} · {classGroup.teacherLabel} · {classGroup.roomLabel}</span>
              <span style={compactMeta}>출석 {classGroup.attendanceChecked}/{classGroup.studentCount} · 과제 {classGroup.assignmentChecked}/{classGroup.studentCount}</span>
            </div>
            <SeverityBadge severity={classGroup.severity} label={classGroup.statusLabel} />
          </div>
        ))
      )}
    </Widget>
  );
}

function ManagementNeededStudentsPanel({ students }: { students: ManagementStudentItem[] }) {
  return (
    <Widget title="관리 필요 학생" href="/students?sort=name">
      {students.length === 0 ? (
        <CompactEmpty title="관리 필요 학생이 없습니다." desc="주의 상태, 중요 메모, 출결/과제 신호가 생기면 표시됩니다." />
      ) : (
        students.map((student) => (
          <div key={student.id} style={compactItem}>
            <div style={compactMain}>
              <Link href={student.href} style={itemTitleLink}>{student.name}</Link>
              <span style={compactMeta}>{student.className} · {student.contextLabel}</span>
              <span style={compactMeta}>{student.reason}</span>
            </div>
            <SeverityBadge severity={student.severity} label={student.statusLabel} />
          </div>
        ))
      )}
    </Widget>
  );
}

function Widget({ title, href, children }: { title: string; href: string; children: ReactNode }) {
  return (
    <section style={widgetPanel}>
      <div style={widgetHeader}>
        <h2 style={widgetTitle}>{title}</h2>
        <Link href={href} style={smallLink}>전체 보기</Link>
      </div>
      <div style={widgetBody}>{children}</div>
    </section>
  );
}

function CompactEmpty({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={compactEmpty}>
      <strong>{title}</strong>
      <span>{desc}</span>
    </div>
  );
}

function PanelHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div style={panelHeader}>
      <div>
        <h2 style={panelTitle}>{title}</h2>
        <p style={panelDescription}>{description}</p>
      </div>
      {action}
    </div>
  );
}

function SeverityBadge({ severity, label }: { severity: DashboardSignalSeverity; label?: string }) {
  const tone = severity === "critical" ? "red" : severity === "warning" ? "yellow" : severity === "success" ? "green" : severity === "info" ? "blue" : "gray";
  return <Badge tone={tone}>{label ?? severityLabel(severity)}</Badge>;
}

function TypeBadge({ type }: { type: DashboardSignalType }) {
  return <Badge tone="blue">{DASHBOARD_SIGNAL_LABELS[type]}</Badge>;
}

function filterInboxItems(items: OperationsInboxItem[], filters: DashboardFilterState, tab: string, today: string) {
  return items.filter((item) => {
    if (filters.dateScope === "today" && item.dateScope !== "today" && item.dueKey !== today && item.dateKey !== today) return false;
    if (filters.dateScope === "week" && item.dateScope !== "today" && item.dateScope !== "week" && item.dateScope !== "recent") return false;
    if (filters.classGroupId !== "all" && item.classGroupId !== filters.classGroupId) return false;
    if (filters.ownerId !== "all" && item.ownerId !== filters.ownerId) return false;
    if (filters.signalType !== "all" && item.type !== filters.signalType) return false;
    if (filters.severity !== "all" && item.severity !== filters.severity) return false;
    if (tab === "critical" && item.severity !== "critical") return false;
    if (tab === "warning" && item.severity !== "warning") return false;
    if (tab === "dueToday" && item.dueKey !== today && item.dateScope !== "today") return false;
    if (tab === "mine" && !item.isMine) return false;
    return true;
  }).sort((a, b) => DASHBOARD_SEVERITY_ORDER[a.severity] - DASHBOARD_SEVERITY_ORDER[b.severity] || Number(b.isMine) - Number(a.isMine));
}

function isTodayInboxItem(item: OperationsInboxItem, today: string) {
  return item.dateScope === "today" || item.dueKey === today || item.dateKey === today;
}

function countActiveFilters(filters: DashboardFilterState) {
  return Number(filters.dateScope !== "all") +
    Number(filters.classGroupId !== "all") +
    Number(filters.ownerId !== "all") +
    Number(filters.signalType !== "all") +
    Number(filters.severity !== "all");
}

function severityLabel(severity: DashboardSignalSeverity) {
  if (severity === "critical") return "긴급";
  if (severity === "warning") return "주의";
  if (severity === "info") return "확인";
  if (severity === "success") return "정상";
  return "일반";
}

function detailDecision(item: OperationsInboxItem) {
  const typeLabel = DASHBOARD_SIGNAL_LABELS[item.type];
  if (item.severity === "critical") {
    return {
      title: "즉시 처리 정보",
      description: `${typeLabel} 신호가 긴급 상태입니다. 담당자와 기준 시간을 먼저 확인하고 바로 액션으로 이동하세요.`,
    };
  }
  if (item.severity === "warning") {
    return {
      title: "오늘 확인 정보",
      description: `${typeLabel} 신호가 운영 흐름을 막을 수 있습니다. 맥락 확인 후 담당 액션을 실행하세요.`,
    };
  }
  if (item.severity === "success") {
    return {
      title: "정상 흐름",
      description: "오늘 기준으로 큰 이슈는 없습니다. 관련 기록만 빠르게 확인하면 됩니다.",
    };
  }
  return {
    title: "후속 확인",
    description: `${typeLabel} 관련 상태를 점검하고 필요하면 업무나 메모로 남기세요.`,
  };
}

function detailRiskItems(item: OperationsInboxItem) {
  const risks = [
    item.reason,
    `현재 상태: ${item.statusLabel}`,
    `담당: ${item.ownerLabel}`,
    item.contextLabel !== "-" ? `맥락: ${item.contextLabel}` : null,
  ];
  return risks.filter((risk): risk is string => Boolean(risk));
}

const pageStack: CSSProperties = { display: "grid", gap: 10, fontSize: 13 };
const scopeBar: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 10px", border: surfaceBorder, borderRadius: 8, background: "var(--asc-surface)", boxShadow: "var(--asc-shadow-sm)" };
const scopeGroup: CSSProperties = { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minWidth: 0 };
const scopeItem: CSSProperties = { minHeight: 26, display: "inline-flex", alignItems: "center", gap: 5, padding: "0 8px", border: "1px solid transparent", borderRadius: 6, background: "var(--asc-bg-subtle)" };
const scopeLabel: CSSProperties = { color: "var(--asc-text-muted)", fontSize: 11, fontWeight: 850 };
const scopeValue: CSSProperties = { color: "var(--asc-text)", fontSize: 12, fontWeight: 950 };
const scopeUpdated: CSSProperties = { color: "var(--asc-text-muted)", fontSize: 11, fontWeight: 850, whiteSpace: "nowrap" };
const summaryGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, minmax(190px, 1fr))", gap: 8 };
const summaryCard: CSSProperties = { border: surfaceBorder, borderRadius: 8, padding: "10px 11px", background: "var(--asc-surface)", display: "flex", flexDirection: "column", gap: 8, minHeight: 112, color: "var(--asc-text)", textDecoration: "none", boxShadow: "var(--asc-shadow-sm)" };
const summaryCardTop: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 };
const summaryLabel: CSSProperties = { color: "var(--asc-text-muted)", fontSize: 11, fontWeight: 950 };
const summaryValue: CSSProperties = { color: "var(--asc-text)", fontSize: 17, lineHeight: 1.05 };
const summaryDetail: CSSProperties = { color: "var(--asc-text-subtle)", fontSize: 12, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const summaryMetricList: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 };
const summaryMetric: CSSProperties = { display: "grid", gap: 2, minWidth: 0, padding: "6px 7px", borderRadius: 6, background: "var(--asc-bg-subtle)" };
const summaryMetricLabel: CSSProperties = { color: "var(--asc-text-muted)", fontSize: 10, fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const summaryMetricValue: CSSProperties = { color: "var(--asc-text)", fontSize: 13, fontWeight: 950, whiteSpace: "nowrap" };
const summaryProgressRow: CSSProperties = { display: "grid", gridTemplateColumns: "74px minmax(72px, 1fr) auto", gap: 8, alignItems: "center", marginTop: "auto" };
const summaryProgressLabel: CSSProperties = { color: "var(--asc-text)", fontSize: 11, fontWeight: 950, whiteSpace: "nowrap" };
const summaryTrack: CSSProperties = { height: 5, borderRadius: 999, background: "var(--asc-border-subtle)", overflow: "hidden" };
const summaryFill: CSSProperties = { display: "block", height: "100%", borderRadius: 999 };
const summaryProgressValue: CSSProperties = { color: "var(--asc-text)", fontSize: 12, fontWeight: 950, whiteSpace: "nowrap" };
const summaryProgressCount: CSSProperties = { color: "var(--asc-text-muted)", fontWeight: 850 };
const mainGrid: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(720px, 1fr) minmax(330px, 370px)", gap: 10, alignItems: "start" };
const panel: CSSProperties = { background: "var(--asc-surface)", border: surfaceBorder, borderRadius: 8, padding: 10, display: "grid", gap: 8, boxShadow: "var(--asc-shadow-sm)" };
const panelHeader: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" };
const panelTitle: CSSProperties = { margin: 0, fontSize: 16, fontWeight: 950 };
const panelDescription: CSSProperties = { margin: "3px 0 0", color: "var(--asc-text-muted)", fontSize: 12, fontWeight: 800 };
const queueToolbar: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", borderTop: "1px solid var(--asc-border-subtle)", paddingTop: 8 };
const tabList: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 5 };
const tabButton: CSSProperties = { border: "1px solid transparent", borderRadius: 6, background: "var(--asc-toggle-bg)", padding: "6px 9px", color: "var(--asc-text-subtle)", fontSize: 12, fontWeight: 900, cursor: "pointer" };
const activeTabButton: CSSProperties = { ...tabButton, background: "var(--asc-toggle-active-bg)", color: "var(--asc-toggle-active-text)" };
const queueFilters: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(96px, 1fr))", gap: 6, minWidth: 330 };
const queueSelect: CSSProperties = { minHeight: 30, padding: "5px 8px", fontSize: 12 };
const queueColumns = "86px 64px minmax(220px, 1.3fr) minmax(150px, .9fr) minmax(86px, .55fr) minmax(96px, .6fr) minmax(76px, .45fr)";
const inboxList: CSSProperties = { border: surfaceBorder, borderRadius: 8, overflow: "auto", maxHeight: 470, background: "var(--asc-surface)", boxShadow: "var(--asc-shadow-sm)" };
const queueHead: CSSProperties = { display: "grid", gridTemplateColumns: queueColumns, alignItems: "center", minWidth: 760, position: "sticky", top: 0, zIndex: 1, background: "var(--asc-bg-subtle)", borderBottom: "1px solid var(--asc-row-divider)", color: "var(--asc-text-muted)", fontSize: 11, fontWeight: 950, padding: "7px 10px" };
const queueRow: CSSProperties = { position: "relative", width: "100%", minWidth: 760, minHeight: 42, display: "grid", gridTemplateColumns: queueColumns, alignItems: "center", borderWidth: 0, borderBottomWidth: 1, borderBottomStyle: "solid", borderBottomColor: "var(--asc-row-divider)", background: "var(--asc-surface)", color: "var(--asc-text)", padding: "8px 10px", textAlign: "left", cursor: "pointer", font: "inherit" };
const activeQueueRow: CSSProperties = { ...queueRow, background: "var(--asc-accent-soft)", boxShadow: "inset 3px 0 0 var(--asc-accent)" };
const inboxEmpty: CSSProperties = { padding: 12 };
const queuePriorityCell: CSSProperties = { minWidth: 0, display: "flex", alignItems: "center" };
const queueTypeCell: CSSProperties = { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--asc-text-subtle)", fontSize: 12, fontWeight: 950 };
const queueTitleCell: CSSProperties = { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--asc-text)", fontSize: 13, fontWeight: 950 };
const queueMutedCell: CSSProperties = { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--asc-text-muted)", fontSize: 11.5, fontWeight: 800 };
const queueDueCell: CSSProperties = { ...queueMutedCell, color: "var(--asc-danger)" };
const queueStatusCell: CSSProperties = { ...queueMutedCell, color: "var(--asc-text)", fontWeight: 900 };
const badgeGroup: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" };
const detailPanel: CSSProperties = { background: "var(--asc-surface)", border: surfaceBorder, borderRadius: 8, padding: 10, position: "sticky", top: 10, display: "grid", gap: 8, alignContent: "start", boxShadow: "var(--asc-shadow-sm)" };
const detailHero: CSSProperties = { display: "grid", gap: 6, border: "1px solid transparent", borderRadius: 8, background: "var(--asc-bg-subtle)", padding: 9 };
const detailHeroTop: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 };
const detailHeroMeta: CSSProperties = { display: "grid", gap: 2, color: "var(--asc-text-muted)", fontSize: 11, fontWeight: 850, textAlign: "right", whiteSpace: "nowrap" };
const detailTitle: CSSProperties = { margin: 0, fontSize: 16, lineHeight: 1.25 };
const detailTarget: CSSProperties = { margin: 0, color: "var(--asc-text-subtle)", fontWeight: 900 };
const decisionCopy: CSSProperties = { margin: 0, display: "grid", gap: 2, color: "var(--asc-text-subtle)", lineHeight: 1.3 };
const detailSection: CSSProperties = { borderTop: "1px solid var(--asc-border-subtle)", paddingTop: 5, display: "grid", gap: 5 };
const detailSectionHeader: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 };
const detailSectionTitle: CSSProperties = { color: "var(--asc-text)", fontSize: 12, fontWeight: 950 };
const riskList: CSSProperties = { margin: 0, padding: "6px 9px 6px 22px", border: "1px solid transparent", borderRadius: 8, background: "var(--asc-danger-soft)", color: "var(--asc-danger)", display: "grid", gap: 3, lineHeight: 1.3, fontWeight: 800 };
const detailRecordList: CSSProperties = { display: "grid", gap: 5 };
const detailRecordItem: CSSProperties = { display: "grid", gap: 2, border: "1px solid transparent", borderRadius: 6, background: "var(--asc-bg-subtle)", padding: "7px 8px", color: "var(--asc-text)", textDecoration: "none" };
const detailRecordLabel: CSSProperties = { color: "var(--asc-text-muted)", fontSize: 11, fontWeight: 850 };
const detailRecordValue: CSSProperties = { color: "var(--asc-text)", fontSize: 12, lineHeight: 1.25 };
const recommendedActionBox: CSSProperties = { display: "grid", gap: 5 };
const recommendedPrimaryAction: CSSProperties = { border: "1px solid transparent", borderRadius: 8, background: "var(--asc-primary)", color: "#fff", minHeight: 31, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 10px", textDecoration: "none", fontSize: 12, fontWeight: 950 };
const recommendedSecondaryGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 };
const recommendedSecondaryAction: CSSProperties = { border: "1px solid transparent", borderRadius: 8, background: "var(--asc-bg-subtle)", color: "var(--asc-text)", minHeight: 28, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 8px", textDecoration: "none", fontSize: 11, fontWeight: 900, textAlign: "center" };
const recommendedResolveAction: CSSProperties = { ...recommendedSecondaryAction, color: "var(--asc-success)", background: "var(--asc-success-soft)" };
const secondaryGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 };
const widgetPanel: CSSProperties = { background: "var(--asc-surface)", border: surfaceBorder, borderRadius: 8, padding: 10, display: "grid", gap: 8, alignContent: "start", boxShadow: "var(--asc-shadow-sm)" };
const widgetHeader: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 7, alignItems: "center" };
const widgetTitle: CSSProperties = { margin: 0, fontSize: 14, fontWeight: 950 };
const smallLink: CSSProperties = { color: "var(--asc-primary)", textDecoration: "none", fontWeight: 900, whiteSpace: "nowrap", fontSize: 11 };
const widgetBody: CSSProperties = { display: "grid", gap: 7 };
const compactItem: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 7, border: "1px solid transparent", borderRadius: 8, padding: 8, color: "var(--asc-text)", textDecoration: "none", background: "var(--asc-bg-subtle)" };
const compactMain: CSSProperties = { minWidth: 0, display: "grid", gap: 4 };
const itemTitle: CSSProperties = { color: "var(--asc-text)" };
const itemTitleLink: CSSProperties = { ...itemTitle, textDecoration: "none" };
const compactMeta: CSSProperties = { color: "var(--asc-text-muted)", fontSize: 11, fontWeight: 800, lineHeight: 1.35 };
const compactEmpty: CSSProperties = { border: "1px dashed var(--asc-border)", borderRadius: 8, padding: 10, display: "grid", gap: 4, color: "var(--asc-text-muted)", background: "var(--asc-bg-subtle)" };
