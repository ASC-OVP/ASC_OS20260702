import type { CSSProperties } from "react";
import StickyMemoComposer from "@/features/memos/components/StickyMemoComposer";
import StickyMemoCard from "@/features/memos/components/StickyMemoCard";

export type StickyMemoView = {
  id: string;
  content: string;
  color: string;
  updatedAt: Date;
};

type Props = {
  memos: StickyMemoView[];
};

export default function PersonalStickyBoard({ memos }: Props) {
  return (
    <section style={panel}>
      <div style={head}>
        <div>
          <p style={eyebrow}>내 포스트잇 보드</p>
          <h2 style={title}>개인 메모 공간</h2>
          <p style={desc}>나만 보는 할 일, 아이디어, 임시 메모입니다.</p>
        </div>
        <span style={countBadge}>{memos.length}개</span>
      </div>

      <div style={grid}>
        <StickyMemoComposer placeholder="빠른 메모를 적어두세요." rows={2} />
        {memos.map((memo) => (
          <StickyMemoCard
            key={memo.id}
            showPrimarySwitch
            memo={{
              id: memo.id,
              content: memo.content,
              color: memo.color,
            }}
          />
        ))}
        {memos.length === 0 && (
          <div style={empty}>
            <b>아직 내 포스트잇이 없습니다.</b>
            <span>할 일, 아이디어, 상담 전 체크할 내용을 적어두세요.</span>
          </div>
        )}
      </div>
    </section>
  );
}

const panel: CSSProperties = { background: "var(--asc-surface)", border: "1px solid transparent", borderRadius: "var(--asc-radius-lg)", padding: 12, display: "grid", gap: 10, minWidth: 0, boxShadow: "var(--asc-shadow-sm)" };
const head: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 };
const eyebrow: CSSProperties = { margin: "0 0 4px", color: "var(--asc-warning-text)", fontWeight: 950, fontSize: 12 };
const title: CSSProperties = { margin: 0, fontSize: 18, fontWeight: 950 };
const desc: CSSProperties = { margin: "3px 0 0", color: "var(--asc-text-muted)", fontSize: 12 };
const countBadge: CSSProperties = { border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-warning-soft)", color: "var(--asc-warning-text)", padding: "5px 8px", fontSize: 12, fontWeight: 950, whiteSpace: "nowrap" };
const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(158px, 1fr))", gap: 7 };
const empty: CSSProperties = { gridColumn: "1 / -1", border: "1px dashed var(--asc-border-subtle)", borderRadius: "var(--asc-radius-md)", padding: 14, textAlign: "center", color: "var(--asc-text-muted)", fontWeight: 900, display: "grid", gap: 4, background: "var(--asc-bg-subtle)" };
