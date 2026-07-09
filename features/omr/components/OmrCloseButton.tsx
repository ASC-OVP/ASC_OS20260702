"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import type { CSSProperties } from "react";
import { Icon } from "@/components/ui/Icon";

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
      <Icon name="x" size={18} />
    </button>
  );
}

const closeButton: CSSProperties = {
  width: 32,
  height: 32,
  display: "inline-grid",
  placeItems: "center",
  border: 0,
  background: "transparent",
  color: "var(--asc-text-muted)",
  lineHeight: 1,
  cursor: "pointer",
  flex: "0 0 auto",
};
