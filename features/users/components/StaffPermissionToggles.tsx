"use client";

import { useRef } from "react";
import { updateUserPermissionsAction } from "@/features/users/actions/userActions";
import type { StaffPermissionSet } from "@/lib/staffPermissions";

type PermissionDefinition = {
  key: keyof StaffPermissionSet;
  label: string;
};

type Props = {
  userId: string;
  permissions: StaffPermissionSet;
  definitions: readonly PermissionDefinition[];
};

export default function StaffPermissionToggles({ userId, permissions, definitions }: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={updateUserPermissionsAction}
      className="asc-permission-form"
      onChange={(event) => {
        if (event.target instanceof HTMLInputElement && event.target.type === "checkbox") {
          formRef.current?.requestSubmit();
        }
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <span className="asc-permission-title">추가 권한</span>
      {definitions.map((permission) => (
        <label key={permission.key} className="asc-permission-toggle">
          <input type="checkbox" name={permission.key} defaultChecked={permissions[permission.key]} />
          <span className="asc-permission-switch" aria-hidden="true" />
          <span>{compactPermissionLabel(permission.label)}</span>
        </label>
      ))}
    </form>
  );
}

function compactPermissionLabel(label: string) {
  if (label === "실제 문자 발송") return "문자 발송";
  if (label === "OMR 업로드/검수/채점") return "OMR 채점";
  return label;
}
