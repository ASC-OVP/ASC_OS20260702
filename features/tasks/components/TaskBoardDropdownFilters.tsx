"use client";

import type { ClassGroup } from "@prisma/client";
import type { CSSProperties } from "react";

type Controls = {
  status: "all" | "open" | "done";
  scope: "all" | "recurring" | "general";
  sort: "progress" | "open" | "due" | "name" | "recent";
  classGroupId: string;
  q: string;
};

export default function TaskBoardDropdownFilters({
  controls,
  classGroups,
}: {
  controls: Controls;
  classGroups: Array<Pick<ClassGroup, "id" | "name">>;
}) {
  function go(patch: Partial<Controls>) {
    const next = { ...controls, ...patch };
    const query = new URLSearchParams();
    if (next.status !== "all") query.set("status", next.status);
    if (next.scope !== "all") query.set("scope", next.scope);
    if (next.sort !== "progress") query.set("sort", next.sort);
    if (next.classGroupId) query.set("classGroup", next.classGroupId);
    if (next.q) query.set("q", next.q);
    const suffix = query.toString();
    window.location.href = suffix ? `/tasks?${suffix}` : "/tasks";
  }

  return (
    <div style={grid}>
      <label style={field}>
        <span>반/수업</span>
        <select style={select} value={controls.classGroupId} onChange={(event) => go({ classGroupId: event.target.value })}>
          <option value="">전체</option>
          {classGroups.map((group) => (
            <option key={group.id} value={group.id}>{group.name}</option>
          ))}
        </select>
      </label>
      <label style={field}>
        <span>업무 유형</span>
        <select style={select} value={controls.scope} onChange={(event) => go({ scope: event.target.value as Controls["scope"] })}>
          <option value="all">전체</option>
          <option value="general">일반 업무</option>
          <option value="recurring">정기 업무</option>
        </select>
      </label>
      <label style={field}>
        <span>진행 상태</span>
        <select style={select} value={controls.status} onChange={(event) => go({ status: event.target.value as Controls["status"] })}>
          <option value="all">전체</option>
          <option value="open">미완료</option>
          <option value="done">완료</option>
        </select>
      </label>
      <label style={field}>
        <span>정렬</span>
        <select style={select} value={controls.sort} onChange={(event) => go({ sort: event.target.value as Controls["sort"] })}>
          <option value="progress">진행률 낮은순</option>
          <option value="open">미완료 많은순</option>
          <option value="due">오늘 마감 우선</option>
          <option value="name">담당자명순</option>
          <option value="recent">최근 배정순</option>
        </select>
      </label>
    </div>
  );
}

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 10,
};

const field: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "72px minmax(0, 1fr)",
  alignItems: "center",
  gap: 8,
  height: 38,
  borderRadius: 6,
  background: "var(--asc-bg-subtle)",
  padding: "0 9px",
  color: "var(--asc-text-muted)",
  fontSize: 12,
  fontWeight: 850,
};

const select: CSSProperties = {
  width: "100%",
  height: 30,
  border: 0,
  outline: 0,
  background: "transparent",
  color: "var(--asc-text)",
  fontSize: 12,
  fontWeight: 900,
};
