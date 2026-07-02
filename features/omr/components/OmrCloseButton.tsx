"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import type { CSSProperties } from "react";

type Props = {
  href: string;
  confirmOnClose?: boolean;
};

export default function OmrCloseButton({ href, confirmOnClose = false }: Props) {
  const router = useRouter();

  const close = useCallback(() => {
    if (confirmOnClose && !window.confirm("처리 중입니다. 닫을까요? 입력 중인 내용은 저장되지 않을 수 있습니다.")) return;
    router.push(href);
  }, [confirmOnClose, href, router]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  return (
    <button type="button" onClick={close} style={closeButton} aria-label="OMR 화면 닫기">
      ×
    </button>
  );
}

const closeButton: CSSProperties = {
  width: 32,
  height: 32,
  border: "1px solid transparent",
  borderRadius: "var(--asc-radius-md)",
  background: "var(--asc-bg-subtle)",
  color: "var(--asc-text)",
  fontSize: 20,
  lineHeight: "28px",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "var(--asc-shadow-sm)",
  flex: "0 0 auto",
};
