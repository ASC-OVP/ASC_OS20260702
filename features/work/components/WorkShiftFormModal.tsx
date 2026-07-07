"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type Props = {
  title: string;
  triggerLabel: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export default function WorkShiftFormModal({ title, triggerLabel, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      closeModal();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function openModal() {
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }

  return (
    <>
      <button ref={triggerRef} type="button" onClick={openModal} style={triggerButton}>
        {triggerLabel}
      </button>

      {open && (
        <div style={overlay} role="presentation" onMouseDown={closeModal}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="work-shift-modal-title"
            style={modal}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header style={modalHeader}>
              <h2 id="work-shift-modal-title" style={modalTitle}>{title}</h2>
              <button type="button" onClick={closeModal} style={closeButton} aria-label="닫기">
                x
              </button>
            </header>
            <div style={modalBody}>{children}</div>
          </section>
        </div>
      )}
    </>
  );
}

const triggerButton: CSSProperties = {
  height: 36,
  border: "1px solid transparent",
  borderRadius: "var(--asc-radius-md)",
  background: "var(--asc-primary)",
  color: "#fff",
  padding: "0 12px",
  fontWeight: 950,
};

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 120,
  display: "grid",
  placeItems: "center",
  padding: 18,
  background: "rgba(15, 23, 42, .46)",
};

const modal: CSSProperties = {
  width: "min(520px, calc(100vw - 36px))",
  maxHeight: "calc(100vh - 48px)",
  overflow: "auto",
  border: "1px solid transparent",
  borderRadius: "var(--asc-radius-lg)",
  background: "var(--asc-surface)",
  color: "var(--asc-text)",
  boxShadow: "var(--asc-shadow-modal)",
  padding: 14,
  display: "grid",
  gap: 12,
};

const modalHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
};

const modalTitle: CSSProperties = {
  margin: 0,
  fontSize: 18,
  fontWeight: 950,
};

const closeButton: CSSProperties = {
  width: 32,
  height: 32,
  border: "1px solid transparent",
  borderRadius: "var(--asc-radius-md)",
  background: "var(--asc-bg-subtle)",
  color: "var(--asc-text-muted)",
  fontSize: 16,
  fontWeight: 950,
};

const modalBody: CSSProperties = {
  display: "grid",
  gap: 10,
};
