import { prisma } from "@/lib/prisma";
import { canDeactivateAccount, canManageStaff, requireUser, roleText } from "@/lib/auth";
import type { CSSProperties } from "react";
import { Badge, Button, Input, Notice, PageHeader, Select } from "@/components/ui";
import StaffPermissionToggles from "@/features/users/components/StaffPermissionToggles";
import { activateUserAction, createUserAction, deleteUserAction } from "@/features/users/actions/userActions";
import { getStaffPermissionsForAcademy, normalizeStaffPermissionSet, staffPermissionDefinitions } from "@/lib/staffPermissions";
import { surfaceBorder } from "@/lib/styles";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

export const dynamic = "force-dynamic";

export default async function UsersPage({ searchParams }: Props) {
  const me = await requireUser();
  const params = await searchParams;
  const [users, staffPermissions] = await Promise.all([
    prisma.user.findMany({
      where: { academyId: me.academyId },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    }),
    getStaffPermissionsForAcademy(me.academyId),
  ]);
  const canCreate = canManageStaff(me.role);
  const canDeactivate = canDeactivateAccount(me.role);
  const activeAdminCount = users.filter((user) => user.role === "ADMIN" && user.isActive).length;

  return (
    <main style={page}>
      <style>{permissionToggleCss}</style>
      <section style={container}>
        <PageHeader
          eyebrow="계정"
          title="직원/계정 관리"
          description="실장, 강사, 조교 계정을 만들고 각자 로그인하게 합니다."
        />

        {params.error && <Notice tone="danger" title="계정 처리 오류">{errorMessage(params.error)}</Notice>}

        <div style={grid}>
          {canCreate && (
            <section style={card}>
              <h2 style={sectionTitle}>계정 추가</h2>
              <form action={createUserAction} style={form}>
                <Input name="name" label={<>이름 <span className="asc-required">*</span></>} required placeholder="이름" />
                <Input name="loginId" label={<>아이디 <span className="asc-required">*</span></>} required placeholder="로그인 아이디" />
                <Input name="password" type="password" label={<>비밀번호 <span className="asc-required">*</span></>} required placeholder="초기 비밀번호" />
                <Select name="role" label="권한" defaultValue="ASSISTANT">
                  <option value="MANAGER">실장</option>
                  <option value="TEACHER">강사</option>
                  <option value="ASSISTANT">조교</option>
                  <option value="ADMIN">관리자</option>
                </Select>
                <div className="asc-form-actions">
                  <Button type="submit">계정 추가</Button>
                </div>
              </form>
            </section>
          )}

          <section style={{ ...card, ...(canCreate ? {} : wideCard) }}>
            <div style={listHead}>
              <h2 style={sectionTitle}>계정 목록</h2>
              <Badge tone={canDeactivate ? "blue" : "gray"}>상태 변경 권한: {canDeactivate ? "관리자/강사" : "없음"}</Badge>
            </div>

            <div style={list}>
              {users.map((user) => {
                const isLastAdmin = user.role === "ADMIN" && activeAdminCount <= 1;
                const showDeactivate = canDeactivate && user.id !== me.id && user.isActive && !isLastAdmin;
                const showActivate = canDeactivate && !user.isActive;
                const permissions = normalizeStaffPermissionSet(staffPermissions[user.id]);

                return (
                  <div key={user.id} style={{ ...row, ...(!user.isActive ? inactiveRow : {}) }}>
                    <b>{user.name}</b>
                    <span>{user.loginId}</span>
                    <span>{roleText(user.role)}</span>
                    {canCreate && user.role === "ASSISTANT" ? (
                      <StaffPermissionToggles userId={user.id} permissions={permissions} definitions={staffPermissionDefinitions} />
                    ) : (
                      <span style={permissionEmpty}>-</span>
                    )}
                    <Badge tone={user.isActive ? "green" : "gray"}>{user.isActive ? "활성" : "비활성"}</Badge>
                    {showDeactivate ? (
                      <form action={deleteUserAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <button style={del}>비활성화</button>
                      </form>
                    ) : showActivate ? (
                      <form action={activateUserAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <button style={activate}>활성화</button>
                      </form>
                    ) : (
                      <span style={muted}>{user.id === me.id ? "본인" : "-"}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function errorMessage(error: string) {
  if (error === "permission") return "계정 비활성화는 관리자/강사만 가능합니다.";
  if (error === "empty") return "이름, 아이디, 비밀번호를 입력하세요.";
  if (error === "duplicate") return "이미 사용 중인 아이디입니다.";
  if (error === "self") return "본인 계정은 비활성화할 수 없습니다.";
  if (error === "last-admin") return "마지막 활성 관리자 계정은 비활성화할 수 없습니다.";
  if (error === "missing") return "대상 계정을 찾을 수 없습니다.";
  return "권한 또는 입력값을 확인하세요.";
}

const page: CSSProperties = { padding: 12, color: "var(--asc-text)", background: "var(--asc-bg-subtle)", minHeight: "100vh" };
const container: CSSProperties = { width: "100%", maxWidth: "none", margin: 0, display: "grid", gap: 12 };
const grid: CSSProperties = { display: "grid", gridTemplateColumns: "320px 1fr", gap: 10, alignItems: "start" };
const card: CSSProperties = { background: "var(--asc-surface)", border: surfaceBorder, borderRadius: "var(--asc-radius-lg)", padding: 12, boxShadow: "var(--asc-shadow-sm)" };
const wideCard: CSSProperties = { gridColumn: "1 / -1" };
const sectionTitle: CSSProperties = { margin: "0 0 8px", fontSize: 16, fontWeight: 950 };
const form: CSSProperties = { display: "flex", flexDirection: "column", gap: 8 };
const listHead: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 };
const list: CSSProperties = { borderTop: "1px solid var(--asc-border-subtle)", marginTop: 8, overflowX: "auto" };
const row: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(120px, 160px) minmax(130px, 180px) 72px minmax(560px, 1fr) 78px 104px", gap: 8, alignItems: "center", minHeight: 42, padding: "8px 6px", borderBottom: "1px solid var(--asc-border-subtle)", fontSize: 13, minWidth: 1120 };
const inactiveRow: CSSProperties = { color: "var(--asc-text-muted)", background: "var(--asc-bg-subtle)" };
const del: CSSProperties = { background: "var(--asc-danger-soft)", color: "var(--asc-danger)", border: "1px solid rgba(222, 52, 18, 0.28)", borderRadius: "var(--asc-radius-md)", padding: "6px 9px", fontWeight: 900 };
const activate: CSSProperties = { background: "var(--asc-success-soft)", color: "var(--asc-success)", border: "1px solid rgba(34, 135, 56, 0.24)", borderRadius: "var(--asc-radius-md)", padding: "6px 9px", fontWeight: 900 };
const muted: CSSProperties = { color: "var(--asc-text-muted)", textAlign: "center", fontWeight: 900 };
const permissionEmpty: CSSProperties = { color: "var(--asc-text-muted)", fontSize: 12, fontWeight: 800 };
const permissionToggleCss = `
.asc-permission-form {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 0;
  color: var(--asc-text-muted);
  min-width: 0;
  overflow: hidden;
}
.asc-permission-title {
  flex: 0 0 auto;
  margin-right: 16px;
  font-size: 12px;
  font-weight: 900;
  color: var(--asc-text);
  white-space: nowrap;
}
.asc-permission-toggle + .asc-permission-toggle {
  margin-left: 24px;
}
.asc-permission-toggle {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 28px;
  padding: 4px 9px 4px 7px;
  border: 1px solid var(--asc-border-subtle);
  border-radius: var(--asc-radius-md);
  background: var(--asc-surface);
  font-size: 12px;
  font-weight: 850;
  white-space: nowrap;
  cursor: pointer;
}
.asc-permission-toggle:has(input:checked) {
  border-color: var(--asc-accent-border);
  background: var(--asc-primary-softer);
  color: var(--asc-primary-deep);
}
.asc-permission-toggle input {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  opacity: 0;
  pointer-events: none;
}
.asc-permission-switch {
  position: relative;
  inline-size: 28px;
  block-size: 16px;
  border-radius: 999px;
  background: var(--asc-border-subtle);
  flex: 0 0 auto;
  transition: background 120ms ease;
}
.asc-permission-switch::after {
  content: "";
  position: absolute;
  inline-size: 12px;
  block-size: 12px;
  inset-block-start: 2px;
  inset-inline-start: 2px;
  border-radius: 999px;
  background: var(--asc-surface);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.18);
  transition: transform 120ms ease;
}
.asc-permission-toggle input:checked + .asc-permission-switch {
  background: var(--asc-primary);
}
.asc-permission-toggle input:checked + .asc-permission-switch::after {
  transform: translateX(12px);
}
.asc-permission-toggle input:focus-visible + .asc-permission-switch {
  outline: 2px solid var(--asc-focus);
  outline-offset: 2px;
}
`;
