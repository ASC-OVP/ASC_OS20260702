"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { deleteStickyMemoAction, updateStickyMemoAction } from "@/features/memos/actions/memoActions";
import { primaryStickyMemoChangedEvent, readPrimaryStickyMemoId, writePrimaryStickyMemoId } from "@/features/memos/components/stickyMemoPrimary";
import { getStickyMemoColorTheme, normalizeStickyMemoColor, stickyMemoColors } from "@/features/memos/components/stickyMemoColors";

export type StickyMemoCardView = {
  id: string;
  content: string;
  color: string;
};

type Props = {
  memo: StickyMemoCardView;
  compact?: boolean;
  showDelete?: boolean;
  showPrimarySwitch?: boolean;
};

const SAVE_DELAY_MS = 650;

export default function StickyMemoCard({ memo, compact = false, showDelete = true, showPrimarySwitch = false }: Props) {
  const normalizedInitialColor = normalizeStickyMemoColor(memo.color);
  const [content, setContent] = useState(memo.content);
  const [color, setColor] = useState(normalizedInitialColor);
  const [primaryMemoId, setPrimaryMemoId] = useState("");
  const saveTimerRef = useRef<number | null>(null);
  const saveSeqRef = useRef(0);
  const lastSavedRef = useRef({ content: memo.content, color: normalizedInitialColor });

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!showPrimarySwitch) return;

    const syncPrimary = () => setPrimaryMemoId(readPrimaryStickyMemoId());
    syncPrimary();

    window.addEventListener(primaryStickyMemoChangedEvent, syncPrimary);
    window.addEventListener("storage", syncPrimary);
    return () => {
      window.removeEventListener(primaryStickyMemoChangedEvent, syncPrimary);
      window.removeEventListener("storage", syncPrimary);
    };
  }, [showPrimarySwitch]);

  const theme = getStickyMemoColorTheme(color);
  const isPrimary = primaryMemoId === memo.id;

  function queueSave(nextContent: string, nextColor: string) {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

    const trimmed = nextContent.trim();
    if (!trimmed) {
      return;
    }

    if (lastSavedRef.current.content === nextContent && lastSavedRef.current.color === nextColor) {
      return;
    }

    saveTimerRef.current = window.setTimeout(() => {
      void saveMemo(nextContent, nextColor);
    }, SAVE_DELAY_MS);
  }

  async function saveMemo(nextContent = content, nextColor = color) {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const trimmed = nextContent.trim();
    if (!trimmed) {
      return;
    }

    if (lastSavedRef.current.content === nextContent && lastSavedRef.current.color === nextColor) {
      return;
    }

    const saveSeq = saveSeqRef.current + 1;
    saveSeqRef.current = saveSeq;

    try {
      const formData = new FormData();
      formData.set("stickyMemoId", memo.id);
      formData.set("content", nextContent);
      formData.set("color", nextColor);
      await updateStickyMemoAction(formData);

      if (saveSeqRef.current === saveSeq) {
        lastSavedRef.current = { content: nextContent, color: nextColor };
      }
    } catch {
      return;
    }
  }

  function handleContentChange(nextContent: string) {
    setContent(nextContent);
    queueSave(nextContent, color);
  }

  function handleColorChange(nextColor: string) {
    const normalized = normalizeStickyMemoColor(nextColor);
    setColor(normalized);
    queueSave(content, normalized);
  }

  function handlePrimaryChange() {
    writePrimaryStickyMemoId(isPrimary ? "" : memo.id);
  }

  return (
    <article style={{ ...sticky, ...(compact ? stickyCompact : {}), background: theme.surface, borderColor: theme.border }}>
      {showPrimarySwitch && (
        <button
          type="button"
          onClick={handlePrimaryChange}
          style={{ ...switchButton, ...(isPrimary ? switchButtonOn : {}) }}
          role="switch"
          aria-checked={isPrimary}
          aria-label="움직이는 포스트잇에 표시"
          title="움직이는 포스트잇에 표시"
        >
          <span style={{ ...switchKnob, ...(isPrimary ? switchKnobOn : {}) }} />
        </button>
      )}
      {showDelete && (
        <form action={deleteStickyMemoAction} style={deleteForm}>
          <input type="hidden" name="stickyMemoId" value={memo.id} />
          <button type="submit" style={deleteButton} aria-label="포스트잇 삭제">
            ×
          </button>
        </form>
      )}
      <textarea
        value={content}
        required
        onChange={(event) => handleContentChange(event.target.value)}
        onBlur={() => void saveMemo()}
        style={stickyText}
        aria-label="포스트잇 내용"
      />
      <ColorPalette current={color} onChange={handleColorChange} />
    </article>
  );
}

function ColorPalette({ current, onChange }: { current: string; onChange: (color: string) => void }) {
  const currentColor = normalizeStickyMemoColor(current);

  return (
    <div style={colorRow} aria-label="포스트잇 색상">
      {stickyMemoColors.map((color) => {
        const selected = currentColor === color.value;

        return (
          <button
            key={color.value}
            type="button"
            title={color.label}
            aria-label={`${color.label} 색상`}
            aria-pressed={selected}
            onClick={() => onChange(color.value)}
            style={{
              ...swatch,
              background: color.value,
              borderColor: selected ? color.accent : "rgba(17,24,39,.2)",
              boxShadow: selected ? `0 0 0 2px ${color.shadow}` : "inset 0 0 0 1px rgba(255,255,255,.72)",
            }}
          >
            {selected && <span style={{ ...swatchCheck, color: color.accent }}>✓</span>}
          </button>
        );
      })}
    </div>
  );
}

const sticky: CSSProperties = {
  aspectRatio: "1 / 1",
  position: "relative",
  width: "100%",
  height: "100%",
  boxSizing: "border-box",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "rgba(146,64,14,.16)",
  borderRadius: "var(--asc-radius-md)",
  padding: 10,
  display: "grid",
  gridTemplateRows: "1fr auto",
  gap: 7,
  minHeight: 0,
};
const stickyCompact: CSSProperties = { padding: 9 };
const stickyText: CSSProperties = {
  width: "100%",
  minWidth: 0,
  border: 0,
  outline: "none",
  resize: "none",
  background: "transparent",
  lineHeight: 1.42,
  color: "var(--asc-text)",
  fontWeight: 800,
  padding: "16px 0 0",
};
const switchButton: CSSProperties = {
  position: "absolute",
  top: 7,
  left: 7,
  zIndex: 1,
  width: 31,
  height: 18,
  border: 0,
  borderRadius: 999,
  background: "rgba(17,24,39,.18)",
  padding: 2,
  cursor: "pointer",
};
const switchButtonOn: CSSProperties = { background: "var(--asc-primary)" };
const switchKnob: CSSProperties = {
  display: "block",
  width: 14,
  height: 14,
  borderRadius: 999,
  background: "var(--asc-surface)",
  boxShadow: "0 1px 2px rgba(15,23,42,.18)",
};
const switchKnobOn: CSSProperties = { transform: "translateX(13px)" };
const deleteForm: CSSProperties = { position: "absolute", top: 4, right: 4, zIndex: 1 };
const deleteButton: CSSProperties = {
  width: 22,
  height: 22,
  border: 0,
  background: "transparent",
  color: "var(--asc-text-muted)",
  padding: 0,
  fontSize: 18,
  lineHeight: 1,
  fontWeight: 850,
  cursor: "pointer",
};
const colorRow: CSSProperties = { display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" };
const swatch: CSSProperties = {
  width: 17,
  height: 17,
  borderRadius: "var(--asc-radius-sm)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "rgba(17,24,39,.2)",
  display: "grid",
  placeItems: "center",
  padding: 0,
  cursor: "pointer",
};
const swatchCheck: CSSProperties = { fontSize: 11, fontWeight: 950, lineHeight: 1 };
