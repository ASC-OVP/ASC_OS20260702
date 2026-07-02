"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";

type Props = {
  className?: string;
  style?: CSSProperties;
  summaryStyle?: CSSProperties;
  ariaLabel: string;
  title?: string;
  summary: ReactNode;
  children: ReactNode;
};

export default function AutoCloseDetails({ className, style, summaryStyle, ariaLabel, title, summary, children }: Props) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function closeAfterSubmit() {
    window.setTimeout(() => {
      if (detailsRef.current) detailsRef.current.open = false;
    }, 0);
  }

  return (
    <details ref={detailsRef} className={className} style={style} onSubmitCapture={closeAfterSubmit}>
      <summary style={summaryStyle} aria-label={ariaLabel} title={title}>
        {summary}
      </summary>
      {children}
    </details>
  );
}
