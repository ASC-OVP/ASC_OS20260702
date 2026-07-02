import Link from "next/link";
import type { CSSProperties } from "react";

type Props = { searchParams: Promise<{ error?: string; created?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <main style={page}>
      <section style={card}>
        <h1 style={title}>ASC 로그인</h1>
        <p style={desc}>강사팀 코드, 아이디, 비밀번호를 입력하세요.</p>
        {params.created === "1" && <p style={success}>강사팀이 등록되었습니다. 방금 만든 코드로 로그인하세요.</p>}
        {params.error === "invalid" && <p style={error}>강사팀 코드, 아이디 또는 비밀번호가 올바르지 않습니다.</p>}
        {params.error === "empty" && <p style={error}>모든 항목을 입력해주세요.</p>}

        <form action="/api/login" method="post" style={form}>
          <label style={label}>
            강사팀 코드
            <input name="academyCode" placeholder="예: sm-science" required style={input} />
          </label>
          <label style={label}>
            아이디
            <input name="loginId" placeholder="예: admin" required style={input} />
          </label>
          <label style={label}>
            비밀번호
            <input name="password" type="password" required style={input} />
          </label>
          <button style={button}>로그인</button>
        </form>

        <Link href="/setup" style={secondaryButton}>
          새 강사팀 등록
        </Link>
      </section>
    </main>
  );
}

const page: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--asc-bg-subtle)",
  color: "var(--asc-text)",
  padding: 24,
};
const card: CSSProperties = {
  width: "100%",
  maxWidth: 420,
  background: "var(--asc-surface)",
  border: "1px solid transparent",
  borderRadius: "var(--asc-radius-lg)",
  padding: 24,
  boxShadow: "var(--asc-shadow-sm)",
};
const title: CSSProperties = { fontSize: 24, fontWeight: 950, margin: "0 0 8px" };
const desc: CSSProperties = { margin: "0 0 18px", color: "var(--asc-text-muted)", fontSize: 13, lineHeight: 1.45 };
const form: CSSProperties = { display: "flex", flexDirection: "column", gap: 12 };
const label: CSSProperties = { display: "flex", flexDirection: "column", gap: 6, fontWeight: 900, fontSize: 13 };
const input: CSSProperties = { padding: "11px 12px", border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-bg-subtle)", color: "var(--asc-text)" };
const button: CSSProperties = { padding: "12px", border: "1px solid transparent", borderRadius: "var(--asc-radius-md)", background: "var(--asc-primary)", color: "#fff", fontWeight: 950 };
const secondaryButton: CSSProperties = {
  display: "block",
  marginTop: 12,
  padding: "12px",
  border: "1px solid transparent",
  borderRadius: "var(--asc-radius-md)",
  background: "var(--asc-bg-subtle)",
  color: "var(--asc-text)",
  textAlign: "center",
  textDecoration: "none",
  fontWeight: 950,
};
const error: CSSProperties = { background: "var(--asc-danger-soft)", color: "var(--asc-danger)", padding: 12, borderRadius: "var(--asc-radius-md)", fontWeight: 900 };
const success: CSSProperties = { background: "var(--asc-success-soft)", color: "var(--asc-success)", padding: 12, borderRadius: "var(--asc-radius-md)", fontWeight: 900 };
