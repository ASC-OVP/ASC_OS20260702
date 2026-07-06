"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type ClassGroupOption = {
  id: string;
  name: string;
  teacherName?: string | null;
};

type Props = {
  classGroups: ClassGroupOption[];
  secondaryClassGroups?: ClassGroupOption[];
  defaultSelectedIds?: string[];
  selectedIds?: string[];
  onSelectedIdsChange?: (selectedIds: string[]) => void;
  name?: string;
  emptyText?: string;
  placeholder?: string;
  renderHiddenInputs?: boolean;
  primaryTitle?: string;
  secondaryTitle?: string;
  secondaryOpen?: boolean;
  onSecondaryOpenChange?: (open: boolean) => void;
};

export default function StudentClassGroupDropdownField({
  classGroups,
  secondaryClassGroups = [],
  defaultSelectedIds = [],
  selectedIds,
  onSelectedIdsChange,
  name = "classGroupIds",
  emptyText = "선택 가능한 반이 없습니다.",
  placeholder = "반 선택",
  renderHiddenInputs = true,
  primaryTitle,
  secondaryTitle = "끝난 강의",
  secondaryOpen,
  onSecondaryOpenChange,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [internalSecondaryOpen, setInternalSecondaryOpen] = useState(false);
  const allClassGroups = useMemo(() => mergeClassGroups(classGroups, secondaryClassGroups), [classGroups, secondaryClassGroups]);
  const isSecondaryOpen = secondaryOpen ?? internalSecondaryOpen;
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>(() => normalizeIds(defaultSelectedIds, allClassGroups));
  const currentSelectedIds = useMemo(
    () => normalizeIds(selectedIds ?? internalSelectedIds, allClassGroups),
    [allClassGroups, internalSelectedIds, selectedIds]
  );

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && wrapperRef.current?.contains(event.target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selectedLabel = useMemo(() => {
    const names = currentSelectedIds
      .map((id) => allClassGroups.find((classGroup) => classGroup.id === id))
      .filter((classGroup): classGroup is ClassGroupOption => Boolean(classGroup))
      .map((classGroup) => classGroup.name);
    if (names.length === 0) return placeholder;
    if (names.length === 1) return names[0];
    return `${names[0]} 외 ${names.length - 1}`;
  }, [allClassGroups, currentSelectedIds, placeholder]);

  function updateSelectedIds(nextSelectedIds: string[]) {
    const normalizedIds = normalizeIds(nextSelectedIds, allClassGroups);
    if (selectedIds === undefined) setInternalSelectedIds(normalizedIds);
    onSelectedIdsChange?.(normalizedIds);
  }

  function toggleClassGroup(classGroupId: string) {
    updateSelectedIds(
      currentSelectedIds.includes(classGroupId)
        ? currentSelectedIds.filter((id) => id !== classGroupId)
        : [...currentSelectedIds, classGroupId]
    );
  }

  function toggleSecondaryOpen() {
    const nextOpen = !isSecondaryOpen;
    if (secondaryOpen === undefined) setInternalSecondaryOpen(nextOpen);
    onSecondaryOpenChange?.(nextOpen);
  }

  return (
    <div ref={wrapperRef} style={wrap}>
      {renderHiddenInputs ? (
        <>
          <input type="hidden" name={name} value="" />
          {currentSelectedIds.map((id) => (
            <input key={id} type="hidden" name={name} value={id} />
          ))}
        </>
      ) : null}
      <button
        type="button"
        style={{ ...trigger, ...(open ? triggerOpen : {}) }}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span style={triggerText}>{selectedLabel}</span>
        <span aria-hidden="true" style={chevron}>⌄</span>
      </button>
      {open && (
        <div style={menu} role="listbox" aria-multiselectable="true">
          {allClassGroups.length > 0 ? (
            <>
              {primaryTitle ? <div style={sectionTitle}>{primaryTitle}</div> : null}
              {classGroups.map((classGroup) => renderOption(classGroup, currentSelectedIds, toggleClassGroup))}
              {classGroups.length === 0 ? <div style={empty}>{emptyText}</div> : null}
              {secondaryClassGroups.length > 0 ? (
                <>
                  <div style={sectionToggleWrap}>
                    <button
                      type="button"
                      style={sectionIconButton}
                      onClick={toggleSecondaryOpen}
                      aria-label={isSecondaryOpen ? `${secondaryTitle} 접기` : `${secondaryTitle} 펼치기`}
                      title={secondaryTitle}
                    >
                      {isSecondaryOpen ? "⌃" : "⌄"}
                    </button>
                  </div>
                  {isSecondaryOpen
                    ? secondaryClassGroups.map((classGroup) => renderOption(classGroup, currentSelectedIds, toggleClassGroup))
                    : null}
                </>
              ) : null}
            </>
          ) : (
            <div style={empty}>{emptyText}</div>
          )}
        </div>
      )}
    </div>
  );
}

function renderOption(classGroup: ClassGroupOption, selectedIds: string[], onToggle: (classGroupId: string) => void) {
  const selected = selectedIds.includes(classGroup.id);
  return (
    <button
      key={classGroup.id}
      type="button"
      style={{ ...option, ...(selected ? optionSelected : {}) }}
      onClick={() => onToggle(classGroup.id)}
      role="option"
      aria-selected={selected}
    >
      <span style={{ ...check, ...(selected ? checkSelected : {}) }}>{selected ? "✓" : ""}</span>
      <span style={optionText}>{classGroup.teacherName ? `${classGroup.teacherName} / ${classGroup.name}` : classGroup.name}</span>
    </button>
  );
}

function mergeClassGroups(classGroups: ClassGroupOption[], secondaryClassGroups: ClassGroupOption[]) {
  const seen = new Set<string>();
  return [...classGroups, ...secondaryClassGroups].filter((classGroup) => {
    if (seen.has(classGroup.id)) return false;
    seen.add(classGroup.id);
    return true;
  });
}

function normalizeIds(ids: string[], classGroups: ClassGroupOption[]) {
  const allowed = new Set(classGroups.map((classGroup) => classGroup.id));
  return Array.from(new Set(ids.filter((id) => allowed.has(id))));
}

const wrap: CSSProperties = { position: "relative", minWidth: 0 };
const trigger: CSSProperties = {
  width: "100%",
  minHeight: 36,
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 18px",
  alignItems: "center",
  gap: 8,
  border: "1px solid transparent",
  borderRadius: 8,
  background: "var(--asc-bg-subtle)",
  color: "var(--asc-text)",
  padding: "7px 10px",
  fontSize: 14,
  fontWeight: 850,
  textAlign: "left",
  cursor: "pointer",
  boxSizing: "border-box",
};
const triggerOpen: CSSProperties = { boxShadow: "var(--asc-focus-ring)" };
const triggerText: CSSProperties = { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const chevron: CSSProperties = { color: "var(--asc-text-muted)", fontSize: 16, lineHeight: 1, textAlign: "center" };
const menu: CSSProperties = {
  position: "absolute",
  zIndex: 20,
  top: "calc(100% + 4px)",
  left: 0,
  right: 0,
  maxHeight: 188,
  overflowY: "auto",
  padding: 4,
  border: "1px solid var(--asc-border-subtle)",
  borderRadius: 8,
  background: "var(--asc-surface)",
  boxShadow: "var(--asc-shadow-modal)",
};
const option: CSSProperties = {
  width: "100%",
  minHeight: 30,
  display: "grid",
  gridTemplateColumns: "18px minmax(0, 1fr)",
  alignItems: "center",
  gap: 7,
  border: 0,
  borderRadius: 6,
  background: "transparent",
  color: "var(--asc-text)",
  padding: "5px 7px",
  fontSize: 13,
  fontWeight: 850,
  textAlign: "left",
  cursor: "pointer",
};
const optionSelected: CSSProperties = { background: "var(--asc-primary-soft)", color: "var(--asc-primary-hover)" };
const check: CSSProperties = { width: 14, color: "var(--asc-text-muted)", textAlign: "center", fontSize: 12, fontWeight: 950 };
const checkSelected: CSSProperties = { color: "var(--asc-primary-hover)" };
const optionText: CSSProperties = { minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const empty: CSSProperties = { padding: "7px 8px", color: "var(--asc-text-muted)", fontSize: 12, fontWeight: 800 };
const sectionTitle: CSSProperties = { padding: "4px 7px 3px", color: "var(--asc-text-muted)", fontSize: 11, fontWeight: 900 };
const sectionToggleWrap: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  padding: "3px 2px",
};
const sectionIconButton: CSSProperties = {
  width: 24,
  height: 24,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: 0,
  borderRadius: 5,
  background: "var(--asc-bg-subtle)",
  color: "var(--asc-text)",
  fontSize: 12,
  fontWeight: 950,
  lineHeight: 1,
  cursor: "pointer",
};
