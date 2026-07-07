"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { createStickyMemoAction, updateStickyMemoAction } from "@/features/memos/actions/memoActions";
import {
  defaultStickyMemoColor,
  getStickyMemoColorTheme,
  normalizeStickyMemoColor,
  stickyMemoColors,
} from "@/features/memos/components/stickyMemoColors";

type Props = {
  placeholder: string;
  rows?: number;
};

const SAVE_DELAY_MS = 650;

export default function StickyMemoComposer({ placeholder }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [selectedColor, setSelectedColor] = useState(defaultStickyMemoColor);
  const memoIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const saveSeqRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const selected = normalizeStickyMemoColor(selectedColor);
  const theme = getStickyMemoColorTheme(selected);

  useEffect(() => {
    if (!open) return;
    const frameId = window.requestAnimationFrame(() => textareaRef.current?.focus());
    return () => window.cancelAnimationFrame(frameId);
  }, [open]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  function openComposer() {
    setOpen(true);
  }

  function queueSave(nextContent: string, nextColor: string) {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    if (!nextContent.trim()) return;

    saveTimerRef.current = window.setTimeout(() => {
      void saveMemo(nextContent, nextColor);
    }, SAVE_DELAY_MS);
  }

  async function saveMemo(nextContent = content, nextColor = selectedColor) {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    const trimmed = nextContent.trim();
    if (!trimmed) return;

    const saveSeq = saveSeqRef.current + 1;
    saveSeqRef.current = saveSeq;

    const formData = new FormData();
    formData.set("content", nextContent);
    formData.set("color", normalizeStickyMemoColor(nextColor));

    try {
      if (memoIdRef.current) {
        formData.set("stickyMemoId", memoIdRef.current);
        await updateStickyMemoAction(formData);
      } else {
        const result = await createStickyMemoAction(formData);
        if (result?.id) memoIdRef.current = result.id;
      }
    } catch {
      return;
    }

    if (saveSeqRef.current !== saveSeq) return;
  }

  function resetIfEmpty() {
    if (content.trim()) {
      void saveMemo().then(() => {
        setOpen(false);
        setContent("");
        memoIdRef.current = null;
        router.refresh();
      });
      return;
    }

    setOpen(false);
    setContent("");
    memoIdRef.current = null;
  }

  function handleContentChange(nextContent: string) {
    setContent(nextContent);
    queueSave(nextContent, selectedColor);
  }

  function handleColorChange(nextColor: string) {
    const normalized = normalizeStickyMemoColor(nextColor);
    setSelectedColor(normalized);
    queueSave(content, normalized);
  }

  if (!open) {
    return (
      <button type="button" onClick={openComposer} style={addTile} aria-label="포스트잇 추가">
        +
      </button>
    );
  }

  return (
    <article
      style={{
        ...tile,
        background: theme.surface,
        borderColor: theme.border,
      }}
    >
      <textarea
        ref={textareaRef}
        value={content}
        placeholder={placeholder}
        onChange={(event) => handleContentChange(event.target.value)}
        onBlur={resetIfEmpty}
        style={textarea}
        aria-label="새 포스트잇 내용"
      />
      <ColorPalette current={selected} onChange={handleColorChange} />
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
            onMouseDown={(event) => event.preventDefault()}
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

const tileBase: CSSProperties = {
  aspectRatio: "1 / 1",
  minWidth: 0,
  borderWidth: 1,
  borderStyle: "solid",
  borderRadius: "var(--asc-radius-md)",
};
const addTile: CSSProperties = {
  ...tileBase,
  width: "100%",
  minHeight: 132,
  display: "grid",
  placeItems: "center",
  borderColor: "var(--asc-border-subtle)",
  background: "var(--asc-bg-subtle)",
  color: "var(--asc-text-muted)",
  fontSize: 28,
  fontWeight: 850,
  cursor: "pointer",
};
const tile: CSSProperties = {
  ...tileBase,
  minHeight: 132,
  padding: 10,
  display: "grid",
  gridTemplateRows: "1fr auto",
  gap: 7,
};
const textarea: CSSProperties = {
  width: "100%",
  minWidth: 0,
  border: 0,
  outline: "none",
  resize: "none",
  background: "transparent",
  lineHeight: 1.42,
  color: "var(--asc-text)",
  fontWeight: 800,
  padding: 0,
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
