import { prisma } from "@/lib/prisma";

export const staffPermissionsSettingKey = "staff.permissions.v1";

export const staffPermissionDefinitions = [
  { key: "messageCompose", label: "메시지 작성" },
  { key: "messageSend", label: "실제 문자 발송" },
  { key: "omrManage", label: "OMR 업로드/검수/채점" },
] as const;

export type StaffPermissionKey = (typeof staffPermissionDefinitions)[number]["key"];
export type StaffPermissionSet = Record<StaffPermissionKey, boolean>;
export type StaffPermissionsByUser = Record<string, Partial<StaffPermissionSet>>;

export const emptyStaffPermissionSet: StaffPermissionSet = {
  messageCompose: false,
  messageSend: false,
  omrManage: false,
};

export function normalizeStaffPermissionSet(value: unknown): StaffPermissionSet {
  const source = isRecord(value) ? value : {};
  return {
    messageCompose: Boolean(source.messageCompose),
    messageSend: Boolean(source.messageSend),
    omrManage: Boolean(source.omrManage),
  };
}

export function normalizeStaffPermissions(value: unknown): StaffPermissionsByUser {
  if (!isRecord(value)) return {};

  const result: StaffPermissionsByUser = {};
  for (const [userId, rawPermissions] of Object.entries(value)) {
    if (!userId || !isRecord(rawPermissions)) continue;
    const permissions = normalizeStaffPermissionSet(rawPermissions);
    if (hasAnyStaffPermission(permissions)) result[userId] = permissions;
  }
  return result;
}

export async function getStaffPermissionsForAcademy(academyId: string): Promise<StaffPermissionsByUser> {
  const setting = await prisma.academySetting.findUnique({
    where: { academyId_key: { academyId, key: staffPermissionsSettingKey } },
    select: { value: true },
  });

  if (!setting?.value) return {};

  try {
    return normalizeStaffPermissions(JSON.parse(setting.value));
  } catch {
    return {};
  }
}

export async function getStaffPermissionSet(academyId: string, userId: string): Promise<StaffPermissionSet> {
  const permissions = await getStaffPermissionsForAcademy(academyId);
  return normalizeStaffPermissionSet(permissions[userId]);
}

export function canComposeMessages(role: string, permissions?: StaffPermissionSet) {
  if (role === "ADMIN" || role === "MANAGER" || role === "TEACHER") return true;
  return role === "ASSISTANT" && Boolean(permissions?.messageCompose || permissions?.messageSend);
}

export function canSendActualMessages(role: string, permissions?: StaffPermissionSet) {
  if (role === "ADMIN" || role === "MANAGER") return true;
  return role === "ASSISTANT" && Boolean(permissions?.messageSend);
}

export function canManageOmr(role: string, permissions?: StaffPermissionSet) {
  if (role === "ADMIN" || role === "MANAGER" || role === "TEACHER") return true;
  return role === "ASSISTANT" && Boolean(permissions?.omrManage);
}

function hasAnyStaffPermission(permissions: StaffPermissionSet) {
  return staffPermissionDefinitions.some((item) => permissions[item.key]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
