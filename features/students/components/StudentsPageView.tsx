import type { CSSProperties } from "react";
import StudentClassGroupSelect from "@/features/students/components/StudentClassGroupSelect";
import StudentCreateModal from "@/features/students/components/StudentCreateModal";
import StudentExcelUploadModal from "@/features/students/components/StudentExcelUploadModal";
import StudentLessonSpreadsheet from "@/features/students/components/StudentLessonSpreadsheet";
import { loadStudentsPageData } from "@/features/students/lib/loadStudentsPageData";

type Props = {
  searchParams?: Promise<{
    date?: string;
    classGroupId?: string;
    testId?: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function StudentsPage({ searchParams }: Props) {
  const {
    canUploadStudents,
    classGroupOptions,
    customColumns,
    effectiveClassGroupId,
    rows,
    selectedTestExamId,
    testOptions,
    uploadStudents,
  } = await loadStudentsPageData(await searchParams);
  const selectedClassGroup = classGroupOptions.find((classGroup) => classGroup.id === effectiveClassGroupId);
  const scopeLabel = effectiveClassGroupId ? selectedClassGroup?.name ?? "선택 반" : "전체 학생";
  const headerStats = [
    { label: "범위", value: scopeLabel },
    { label: "학생", value: `${rows.length}명` },
    { label: "반 수", value: `${classGroupOptions.length}개` },
    { label: "시험 수", value: `${testOptions.length}개` },
  ];

  return (
    <main style={page}>
      <section style={container}>
        <header style={header}>
          <div style={headerMain}>
            <div style={headerText}>
              <h1 style={title}>학생현황판</h1>
              <p style={desc}>반별 학생 정보, 출결, 과제, 테스트 기록</p>
            </div>
            <HeaderStats items={headerStats} />
          </div>
          <div style={headerActions} role="group" aria-label="학생현황판 작업">
            <label style={classSelectGroup}>
              <span style={actionLabel}>반</span>
              <StudentClassGroupSelect selectedId={effectiveClassGroupId} classGroups={classGroupOptions} />
            </label>
            {canUploadStudents && (
              <StudentExcelUploadModal
                classGroups={classGroupOptions}
                existingStudents={uploadStudents}
                defaultClassGroupId={effectiveClassGroupId}
              />
            )}
            <StudentCreateModal classGroups={classGroupOptions} defaultClassGroupId={effectiveClassGroupId} />
          </div>
        </header>

        <StudentLessonSpreadsheet
          rows={rows}
          customColumns={customColumns}
          selectedClassGroupId={effectiveClassGroupId}
          classGroups={classGroupOptions}
          classTests={testOptions}
          selectedTestExamId={selectedTestExamId}
        />
      </section>
    </main>
  );
}

function HeaderStats({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <dl style={headerStatsStyle} aria-label="학생 현황 요약">
      {items.map((item) => (
        <div key={item.label} style={headerStat}>
          <dt style={headerStatLabel}>{item.label}</dt>
          <dd style={headerStatValue}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const page: CSSProperties = { height: "100vh", minHeight: 0, overflow: "hidden", background: "var(--asc-bg-subtle)", color: "var(--asc-text)" };
const container: CSSProperties = {
  width: "100%",
  height: "100%",
  maxWidth: "none",
  margin: 0,
  padding: 8,
  display: "grid",
  gridTemplateRows: "auto minmax(0, 1fr)",
  gap: 8,
  minHeight: 0,
};
const header: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  minHeight: 48,
  padding: "0 2px 2px",
  border: 0,
  borderRadius: 0,
  background: "transparent",
  boxShadow: "none",
};
const headerMain: CSSProperties = { minWidth: 0, display: "flex", alignItems: "center", gap: 14, flex: "1 1 560px", flexWrap: "wrap" };
const headerText: CSSProperties = { minWidth: 190, display: "grid", gap: 2 };
const title: CSSProperties = { margin: 0, fontSize: 18, fontWeight: 950, lineHeight: 1.18, letterSpacing: 0 };
const desc: CSSProperties = { margin: 0, color: "var(--asc-text-muted)", fontSize: 12, fontWeight: 750 };
const headerStatsStyle: CSSProperties = { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0, margin: 0, padding: 0, minWidth: 0 };
const headerStat: CSSProperties = { display: "grid", gap: 1, padding: "0 12px", borderLeft: "1px solid var(--asc-border-subtle)", lineHeight: 1.1 };
const headerStatLabel: CSSProperties = { margin: 0, color: "var(--asc-text-muted)", fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" };
const headerStatValue: CSSProperties = { margin: 0, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", color: "var(--asc-text)", fontSize: 13, fontWeight: 950, whiteSpace: "nowrap" };
const headerActions: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
  justifyContent: "flex-end",
};
const classSelectGroup: CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 };
const actionLabel: CSSProperties = { color: "var(--asc-text-muted)", fontSize: 12, fontWeight: 850, whiteSpace: "nowrap" };
